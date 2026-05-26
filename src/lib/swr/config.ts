// src/lib/swr/config.ts
// SWR 全域設定與快取持久化

import type { Cache, SWRConfiguration } from 'swr'
import { logger } from '@/lib/utils/logger'

// ============================================
// 快取 Key 常數
// ============================================
const CACHE_KEY = 'venturo-swr-cache'
// bump v2 (2026-05-17)：強制所有用戶 cache 失效一次、解決
// LINE setup 後新增的 BOT employee + 修了 sidebar 過濾邏輯、舊 cache 殘留舊資料
const CACHE_VERSION = 'v2'

// Cache key prefix（不含 user_id）— 給「清所有 user 的 cache」用
export const CACHE_STORAGE_KEY_PREFIX = `${CACHE_KEY}-${CACHE_VERSION}`

/**
 * 從 supabase localStorage session 拉當前 user.id、組 cache key。
 *
 * 為什麼這樣設計（2026-05-17 William 抓資安洞）：
 * - 舊版 cache key 固定 `venturo-swr-cache-v2`、不分 user
 * - A 帳號沒登出、B 帳號登入同一台電腦 → B 在 5 分鐘 TTL 內 hit cache → 看到 A workspace 資料
 * - 加 user_id 進 cache key、不同 user 各自 namespace、永不撞
 * - 沒登入時用 'anon'、登入後切換到 user_id（下次 reload 生效）
 */
function getCurrentCacheKey(): string {
  if (typeof window === 'undefined') return `${CACHE_STORAGE_KEY_PREFIX}-ssr`
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) return `${CACHE_STORAGE_KEY_PREFIX}-anon`
    const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
    const raw = localStorage.getItem(`sb-${projectRef}-auth-token`)
    if (!raw) return `${CACHE_STORAGE_KEY_PREFIX}-anon`
    const parsed = JSON.parse(raw) as {
      user?: { id?: string }
      currentSession?: { user?: { id?: string } }
    }
    const userId = parsed?.user?.id ?? parsed?.currentSession?.user?.id ?? 'anon'
    // 取 user_id 前 12 char、避免完整 uuid 進 localStorage 暴露
    const fp = userId === 'anon' ? 'anon' : userId.slice(0, 12)
    return `${CACHE_STORAGE_KEY_PREFIX}-${fp}`
  } catch {
    return `${CACHE_STORAGE_KEY_PREFIX}-anon`
  }
}

const CACHE_STORAGE_KEY = getCurrentCacheKey()

/**
 * 清掉 localStorage 內所有 SWR cache（不分 user）
 *
 * 用途：登入 / 登出時呼叫、保證跨帳號污染不會發生
 * 為什麼掃 prefix：cache key 帶 user_id 後、可能殘留多個 `venturo-swr-cache-v2-*`、要全清
 */
export function clearAllSwrCacheKeys(): void {
  if (typeof window === 'undefined') return
  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(CACHE_STORAGE_KEY_PREFIX)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k))
  } catch {
    // ignore（無痕視窗 / 容量滿等）
  }
}

// 快取過期時間（毫秒）
const CACHE_TTL = {
  DEFAULT: 5 * 60 * 1000, // 5 分鐘
  STATIC: 30 * 60 * 1000, // 30 分鐘（靜態資料）
  DYNAMIC: 1 * 60 * 1000, // 1 分鐘（動態資料）
}

// ============================================
// localStorage 快取 Provider
// ============================================
interface CacheEntry {
  data: unknown
  timestamp: number
  ttl: number
}

interface StoredCache {
  [key: string]: CacheEntry
}

/**
 * 建立 localStorage 快取 Provider
 * 讓 SWR 快取在頁面重整後仍然存在
 *
 * SWR provider 需要回傳一個函數，該函數回傳 Map
 */
function localStorageProvider(): Cache {
  // 初始化：從 localStorage 讀取快取
  const stored = loadFromStorage()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const map = new Map<string, any>(
    Object.entries(stored).map(([key, entry]) => {
      // 檢查是否過期
      if (isExpired(entry)) {
        return [key, undefined]
      }
      return [key, entry.data]
    })
  )

  // 定期清理過期快取
  if (typeof window !== 'undefined') {
    setInterval(() => cleanupExpiredCache(), 60 * 1000) // 每分鐘清理一次
  }

  // 頁面關閉前儲存快取
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      saveToStorage(map)
    })

    // 定期儲存（每 30 秒）
    setInterval(() => {
      saveToStorage(map)
    }, 30 * 1000)
  }

  return map
}

/**
 * 從 localStorage 讀取快取
 */
function loadFromStorage(): StoredCache {
  if (typeof window === 'undefined') return {}

  try {
    const raw = localStorage.getItem(CACHE_STORAGE_KEY)
    if (!raw) return {}

    const parsed = JSON.parse(raw) as StoredCache
    logger.log('[SWR Cache] 從 localStorage 載入快取')
    return parsed
  } catch {
    logger.warn('[SWR Cache] localStorage 讀取失敗，使用空快取')
    return {}
  }
}

/**
 * 儲存快取到 localStorage
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function saveToStorage(map: Map<string, any>): void {
  if (typeof window === 'undefined') return

  try {
    const cache: StoredCache = {}
    const now = Date.now()

    map.forEach((value, key) => {
      if (value !== undefined) {
        cache[key] = {
          data: value,
          timestamp: now,
          ttl: getCacheTTL(key),
        }
      }
    })

    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cache))
  } catch (err) {
    // localStorage 可能已滿
    logger.warn('[SWR Cache] localStorage 儲存失敗:', err)
    // 清空舊快取重試
    try {
      localStorage.removeItem(CACHE_STORAGE_KEY)
    } catch {
      // 忽略
    }
  }
}

/**
 * 檢查快取是否過期
 */
function isExpired(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp > entry.ttl
}

/**
 * 根據 key 決定快取 TTL
 */
function getCacheTTL(key: string): number {
  // 靜態資料：較長的 TTL
  if (['tours', 'customers', 'quotes', 'itineraries'].some(k => key.includes(k))) {
    return CACHE_TTL.STATIC
  }

  // 動態資料：較短的 TTL
  if (['todos', 'messages', 'orders'].some(k => key.includes(k))) {
    return CACHE_TTL.DYNAMIC
  }

  return CACHE_TTL.DEFAULT
}

/**
 * 清理過期的快取
 */
function cleanupExpiredCache(): void {
  if (typeof window === 'undefined') return

  try {
    const raw = localStorage.getItem(CACHE_STORAGE_KEY)
    if (!raw) return

    const parsed = JSON.parse(raw) as StoredCache
    const _now = Date.now()
    let hasExpired = false

    Object.keys(parsed).forEach(key => {
      if (isExpired(parsed[key])) {
        delete parsed[key]
        hasExpired = true
      }
    })

    if (hasExpired) {
      localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(parsed))
      logger.log('[SWR Cache] 已清理過期快取')
    }
  } catch {
    // 忽略錯誤
  }
}

// requestIdleCallback polyfill
const _requestIdleCallback =
  typeof window !== 'undefined' && window.requestIdleCallback
    ? window.requestIdleCallback
    : (cb: () => void) => setTimeout(cb, 1)

// ============================================
// SWR 全域設定
// ============================================

/**
 * 分層快取策略設定
 */
export const CACHE_STRATEGY = {
  // 靜態資料：長時間快取，不需要即時更新
  STATIC: {
    dedupingInterval: 60 * 1000, // 60 秒
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    errorRetryCount: 3,
  },

  // 動態資料：短時間快取，需要較頻繁更新
  DYNAMIC: {
    dedupingInterval: 10 * 1000, // 10 秒
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    errorRetryCount: 3,
  },

  // 即時資料：最短快取，需要即時更新
  REALTIME: {
    dedupingInterval: 3 * 1000, // 3 秒
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    errorRetryCount: 2,
  },
} as const

/**
 * 全域 SWR 設定
 * localStorage provider 持久化跨頁重整快取、5 分鐘 TTL
 */
export const swrConfig: SWRConfiguration = {
  // localStorage 快取持久化（重整後不重新獲取、5 分鐘視窗內走快取）
  provider: localStorageProvider,

  // 預設設定（較保守）
  dedupingInterval: 5 * 60 * 1000, // 5 分鐘內相同請求不重複發送
  revalidateOnFocus: false, // 關閉！避免切 tab 時瘋狂請求
  revalidateOnReconnect: true, // 網路恢復時重新驗證
  revalidateIfStale: true, // 快取過期時重新驗證

  // 錯誤處理
  errorRetryCount: 3, // 最多重試 3 次
  errorRetryInterval: 5000, // 重試間隔 5 秒

  // 全域錯誤處理
  onError: (error, key) => {
    logger.error(`[SWR] 請求失敗 [${key}]:`, error)

    // 401 錯誤可以在這裡處理（如登出）
    if (error?.status === 401) {
      logger.warn('[SWR] 認證失敗，可能需要重新登入')
    }
  },

  // 自訂重試邏輯
  onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
    // 404 不重試
    if (error?.status === 404) return

    // 超過最大重試次數
    if (retryCount >= (config.errorRetryCount || 3)) return

    // 5 秒後重試
    setTimeout(() => revalidate({ retryCount }), 5000)
  },
}

/**
 * 清除所有 SWR 快取（登出時使用）
 */
function _clearSWRCache(): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(CACHE_STORAGE_KEY)
    logger.log('[SWR Cache] 已清除所有快取')
  } catch {
    // 忽略錯誤
  }
}
