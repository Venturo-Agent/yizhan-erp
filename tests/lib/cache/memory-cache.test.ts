import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { memoryCache } from '@/lib/cache/memory-cache'

describe('memoryCache (L1 LRU)', () => {
  beforeEach(() => {
    memoryCache.clear()
  })

  describe('get / set', () => {
    it('returns null for missing key', () => {
      expect(memoryCache.get('missing')).toBeNull()
    })

    it('stores and retrieves a value', () => {
      memoryCache.set('k', { id: 1, name: 'tour' })
      expect(memoryCache.get('k')).toEqual({ id: 1, name: 'tour' })
    })

    it('overwrites existing key', () => {
      memoryCache.set('k', 'first')
      memoryCache.set('k', 'second')
      expect(memoryCache.get('k')).toBe('second')
    })

    it('handles primitive values', () => {
      memoryCache.set('num', 42)
      memoryCache.set('str', 'hello')
      memoryCache.set('bool', true)
      expect(memoryCache.get('num')).toBe(42)
      expect(memoryCache.get('str')).toBe('hello')
      expect(memoryCache.get('bool')).toBe(true)
    })
  })

  describe('TTL expiry', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns value before TTL expires', () => {
      memoryCache.set('k', 'fresh')
      vi.advanceTimersByTime(299_000) // < 300s (5min) default TTL
      expect(memoryCache.get('k')).toBe('fresh')
    })

    it('returns null after TTL expires', () => {
      memoryCache.set('k', 'stale')
      vi.advanceTimersByTime(301_000) // > 300s (5min)
      expect(memoryCache.get('k')).toBeNull()
    })

    it('removes expired item from cache on access', () => {
      memoryCache.set('k', 'v')
      vi.advanceTimersByTime(301_000)
      memoryCache.get('k')
      // After expired access, set fresh value should work normally
      memoryCache.set('k', 'new')
      expect(memoryCache.get('k')).toBe('new')
    })
  })

  describe('LRU eviction', () => {
    // memoryCache singleton 預設 maxSize=500; 這邊用大量 entry 觸發 eviction
    it('evicts oldest entry when maxSize reached', () => {
      // 填滿 cache
      for (let i = 0; i < 500; i++) {
        memoryCache.set(`k${i}`, i)
      }
      // 加第 501 個 → k0 應被踢
      memoryCache.set('k500', 500)
      expect(memoryCache.get('k0')).toBeNull()
      expect(memoryCache.get('k500')).toBe(500)
    })

    it('preserves recently accessed entry', () => {
      for (let i = 0; i < 500; i++) {
        memoryCache.set(`k${i}`, i)
      }
      // 訪問 k0 → 變最近使用
      memoryCache.get('k0')
      // 加新 entry → k1 該被踢（不是 k0）
      memoryCache.set('k500', 500)
      expect(memoryCache.get('k0')).toBe(0)
      expect(memoryCache.get('k1')).toBeNull()
    })

    it('does not evict on overwrite of existing key', () => {
      for (let i = 0; i < 500; i++) {
        memoryCache.set(`k${i}`, i)
      }
      // overwrite 既有 key、size 不變
      memoryCache.set('k0', 999)
      expect(memoryCache.get('k0')).toBe(999)
      expect(memoryCache.get('k499')).toBe(499) // 不該被踢
    })
  })

  describe('delete', () => {
    it('returns true when key exists', () => {
      memoryCache.set('k', 'v')
      expect(memoryCache.delete('k')).toBe(true)
      expect(memoryCache.get('k')).toBeNull()
    })

    it('returns false when key missing', () => {
      expect(memoryCache.delete('nope')).toBe(false)
    })
  })

  describe('clear', () => {
    it('removes all entries', () => {
      memoryCache.set('a', 1)
      memoryCache.set('b', 2)
      memoryCache.set('c', 3)
      memoryCache.clear()
      expect(memoryCache.get('a')).toBeNull()
      expect(memoryCache.get('b')).toBeNull()
      expect(memoryCache.get('c')).toBeNull()
    })
  })

  describe('invalidatePattern', () => {
    it('removes all keys with matching prefix', () => {
      memoryCache.set('tour:1', 'a')
      memoryCache.set('tour:2', 'b')
      memoryCache.set('order:1', 'c')

      const removed = memoryCache.invalidatePattern('tour:')
      expect(removed).toBe(2)
      expect(memoryCache.get('tour:1')).toBeNull()
      expect(memoryCache.get('tour:2')).toBeNull()
      expect(memoryCache.get('order:1')).toBe('c')
    })

    it('returns 0 when no key matches', () => {
      memoryCache.set('a', 1)
      expect(memoryCache.invalidatePattern('xx:')).toBe(0)
    })
  })

  describe('getStats', () => {
    it('reports size and maxSize', () => {
      memoryCache.set('a', 1)
      memoryCache.set('b', 2)
      const stats = memoryCache.getStats()
      expect(stats.size).toBe(2)
      expect(stats.maxSize).toBe(500)
    })

    it('counts hits per get', () => {
      memoryCache.set('k', 'v')
      memoryCache.get('k')
      memoryCache.get('k')
      memoryCache.get('k')
      const stats = memoryCache.getStats()
      expect(stats.totalHits).toBe(3)
    })

    it('handles empty cache', () => {
      const stats = memoryCache.getStats()
      expect(stats.size).toBe(0)
      expect(stats.totalHits).toBe(0)
      expect(stats.avgHits).toBe(0)
    })
  })
})
