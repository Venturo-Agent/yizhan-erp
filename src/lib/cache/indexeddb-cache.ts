/**
 * L2 IndexedDB Cache - 本地持久快取
 *
 * 三層快取策略：SWR (L1 Memory) → IndexedDB (L2 Persistent) → Supabase (L3 Cloud)
 * 網路不穩時先顯示上次資料，避免白畫面。
 */

import { logger } from '@/lib/utils/logger'

// ============================================
// Types
// ============================================

interface CacheEntry<T = unknown> {
  key: string
  data: T
  timestamp: number
  version: number
}

interface IndexedDBCacheConfig {
  db_name: string
  store_name: string
  /** 快取版本號，schema 變更時遞增以清舊快取 */
  cache_version: number
  /** TTL 毫秒，預設 24 小時 */
  ttl_ms: number
}

// ============================================
// Config
// ============================================

const DEFAULT_CONFIG: IndexedDBCacheConfig = {
  db_name: 'venturo-cache',
  store_name: 'entities',
  cache_version: 1,
  ttl_ms: 24 * 60 * 60 * 1000, // 24 hours
}

let _config: IndexedDBCacheConfig = { ...DEFAULT_CONFIG }

/**
 * 覆寫預設配置（可選）
 */
function _configure_idb_cache(overrides: Partial<IndexedDBCacheConfig>): void {
  _config = { ...DEFAULT_CONFIG, ...overrides }
}

// ============================================
// DB Connection
// ============================================

let _db_promise: Promise<IDBDatabase> | null = null

function is_indexeddb_available(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined'
}

function open_db(): Promise<IDBDatabase> {
  if (_db_promise) return _db_promise

  _db_promise = new Promise<IDBDatabase>((resolve, reject) => {
    if (!is_indexeddb_available()) {
      reject(new Error('IndexedDB not available'))
      return
    }

    const request = indexedDB.open(_config.db_name, 1)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(_config.store_name)) {
        db.createObjectStore(_config.store_name, { keyPath: 'key' })
      }
    }

    request.onsuccess = () => resolve(request.result)

    request.onerror = () => {
      _db_promise = null
      reject(request.error)
    }
  })

  return _db_promise
}

// ============================================
// Public API
// ============================================

/**
 * 從 IndexedDB 取得快取資料
 * 回傳 null 表示無快取或已過期
 */
export async function get_cache<T = unknown>(key: string): Promise<CacheEntry<T> | null> {
  try {
    const db = await open_db()
    return new Promise<CacheEntry<T> | null>(resolve => {
      const tx = db.transaction(_config.store_name, 'readonly')
      const store = tx.objectStore(_config.store_name)
      const request = store.get(key)

      request.onsuccess = () => {
        const entry = request.result as CacheEntry<T> | undefined
        if (!entry) {
          resolve(null)
          return
        }

        // 版本不符 → 視為無快取
        if (entry.version !== _config.cache_version) {
          resolve(null)
          return
        }

        // TTL 過期
        if (Date.now() - entry.timestamp > _config.ttl_ms) {
          resolve(null)
          return
        }

        resolve(entry)
      }

      request.onerror = () => {
        logger.warn('[idb-cache] get_cache failed', { key })
        resolve(null)
      }
    })
  } catch {
    return null
  }
}

/**
 * 寫入快取到 IndexedDB
 */
export async function set_cache<T = unknown>(key: string, data: T): Promise<void> {
  try {
    const db = await open_db()
    const entry: CacheEntry<T> = {
      key,
      data,
      timestamp: Date.now(),
      version: _config.cache_version,
    }

    return new Promise<void>(resolve => {
      const tx = db.transaction(_config.store_name, 'readwrite')
      const store = tx.objectStore(_config.store_name)
      store.put(entry)

      tx.oncomplete = () => resolve()
      tx.onerror = () => {
        logger.warn('[idb-cache] set_cache failed', { key })
        resolve()
      }
    })
  } catch {
    // Graceful degradation: 不影響正常功能
  }
}

/**
 * 清空所有快取
 */
async function _clear_cache(): Promise<void> {
  try {
    const db = await open_db()
    return new Promise<void>(resolve => {
      const tx = db.transaction(_config.store_name, 'readwrite')
      const store = tx.objectStore(_config.store_name)
      store.clear()

      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    })
  } catch {
    // Graceful degradation
  }
}

/**
 * 清除過期的快取項目
 */
async function _clear_expired(): Promise<number> {
  try {
    const db = await open_db()
    const now = Date.now()
    let removed = 0

    return new Promise<number>(resolve => {
      const tx = db.transaction(_config.store_name, 'readwrite')
      const store = tx.objectStore(_config.store_name)
      const request = store.openCursor()

      request.onsuccess = () => {
        const cursor = request.result
        if (!cursor) {
          resolve(removed)
          return
        }

        const entry = cursor.value as CacheEntry
        const is_expired = now - entry.timestamp > _config.ttl_ms
        const is_wrong_version = entry.version !== _config.cache_version

        if (is_expired || is_wrong_version) {
          cursor.delete()
          removed++
        }

        cursor.continue()
      }

      request.onerror = () => resolve(removed)
    })
  } catch {
    return 0
  }
}

/**
 * 刪除特定 key pattern 的快取（如 invalidate entity）
 */
export async function invalidate_cache_pattern(prefix: string): Promise<void> {
  try {
    const db = await open_db()
    return new Promise<void>(resolve => {
      const tx = db.transaction(_config.store_name, 'readwrite')
      const store = tx.objectStore(_config.store_name)
      const request = store.openCursor()

      request.onsuccess = () => {
        const cursor = request.result
        if (!cursor) {
          resolve()
          return
        }

        const entry = cursor.value as CacheEntry
        if (entry.key.startsWith(prefix)) {
          cursor.delete()
        }

        cursor.continue()
      }

      request.onerror = () => resolve()
    })
  } catch {
    // Graceful degradation
  }
}
