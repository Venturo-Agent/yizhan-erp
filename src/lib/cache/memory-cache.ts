/**
 * L1 Memory Cache - LRU 快取實作
 * 根據 VENTURO 5.2.0 手冊的三層快取策略
 */

interface CacheItem<T> {
  value: T
  timestamp: number
  hits: number
}

class LRUCache<T = unknown> {
  private cache: Map<string, CacheItem<T>> = new Map()
  private maxSize: number
  private ttl: number

  constructor(
    maxSize: number = 500, // 最多 500 個項目
    ttl: number = 300000 // 5 分鐘 TTL (300,000ms)
  ) {
    this.maxSize = maxSize
    this.ttl = ttl
  }

  /**
   * 取得快取資料
   */
  get(key: string): T | null {
    const item = this.cache.get(key)

    if (!item) {
      return null
    }

    // 檢查是否過期
    const now = Date.now()
    if (now - item.timestamp > this.ttl) {
      this.cache.delete(key)
      return null
    }

    // LRU: 更新位置（移到最後 = 最近使用）
    item.hits++
    this.cache.delete(key)
    this.cache.set(key, item)

    return item.value
  }

  /**
   * 設定快取資料
   */
  set(key: string, value: T): void {
    // 如果已達上限，刪除最久未使用的項目（第一個）
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value as string
      this.cache.delete(firstKey)
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      hits: 0,
    })
  }

  /**
   * 刪除特定快取
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * 清空所有快取
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * 取得快取統計
   */
  getStats() {
    const items = Array.from(this.cache.values())
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttl: this.ttl,
      totalHits: items.reduce((sum, item) => sum + item.hits, 0),
      avgHits:
        items.length > 0 ? items.reduce((sum, item) => sum + item.hits, 0) / items.length : 0,
    }
  }

  /**
   * 批次刪除（根據 pattern）
   */
  invalidatePattern(pattern: string): number {
    let count = 0
    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern)) {
        this.cache.delete(key)
        count++
      }
    }
    return count
  }
}

// 全域 Memory Cache 實例
export const memoryCache = new LRUCache()

// 快取 key 產生器
const _cacheKeys = {
  tour: (id: string) => `tour:${id}`,
  tourList: (filter?: string) => `tours:list:${filter || 'all'}`,
  order: (id: string) => `order:${id}`,
  orderList: (tour_id?: string) => `orders:list:${tour_id || 'all'}`,
  customer: (id: string) => `customer:${id}`,
  customerList: () => `customers:list`,
  payment: (id: string) => `payment:${id}`,
  paymentList: (order_id?: string) => `payments:list:${order_id || 'all'}`,
}
