import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { get_cache, set_cache, invalidate_cache_pattern } from '@/lib/cache/indexeddb-cache'

/**
 * idb-cache test 走 fake-indexeddb polyfill、跑得起完整 IDB API
 *
 * 配 ADR-0005 / refactor-backlog #2
 */

describe('indexeddb-cache (L2 IDB)', () => {
  // 每個 test 用獨立 key 避免污染
  let counter = 0
  const key = () => `test:${Date.now()}:${counter++}`

  describe('set_cache / get_cache 基本', () => {
    it('寫入後讀得到', async () => {
      const k = key()
      await set_cache(k, { id: 1, name: 'tour A' })
      const entry = await get_cache(k)
      expect(entry).not.toBeNull()
      expect(entry?.data).toEqual({ id: 1, name: 'tour A' })
    })

    it('沒寫過的 key 回 null', async () => {
      const entry = await get_cache(key())
      expect(entry).toBeNull()
    })

    it('回的 entry 含 timestamp 跟 version', async () => {
      const k = key()
      await set_cache(k, 'v')
      const entry = await get_cache<string>(k)
      expect(entry).not.toBeNull()
      expect(typeof entry?.timestamp).toBe('number')
      expect(typeof entry?.version).toBe('number')
      expect(entry?.key).toBe(k)
    })

    it('支援複雜物件（陣列、巢狀）', async () => {
      const k = key()
      const complex = {
        id: 'abc',
        items: [1, 2, 3],
        meta: { created: '2026-05-08', tags: ['a', 'b'] },
      }
      await set_cache(k, complex)
      const entry = await get_cache(k)
      expect(entry?.data).toEqual(complex)
    })

    it('overwrite 既有 key', async () => {
      const k = key()
      await set_cache(k, 'first')
      await set_cache(k, 'second')
      const entry = await get_cache<string>(k)
      expect(entry?.data).toBe('second')
    })
  })

  describe('TTL 過期', () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('TTL 內讀得到', async () => {
      const k = key()
      await set_cache(k, 'fresh')
      // 預設 TTL 24 小時、advance 1 小時還在範圍內
      vi.advanceTimersByTime(60 * 60 * 1000)
      const entry = await get_cache(k)
      expect(entry).not.toBeNull()
    })

    it('TTL 過後讀回 null', async () => {
      const k = key()
      await set_cache(k, 'stale')
      // advance 25 小時、超過預設 TTL 24h
      vi.advanceTimersByTime(25 * 60 * 60 * 1000)
      const entry = await get_cache(k)
      expect(entry).toBeNull()
    })
  })

  describe('invalidate_cache_pattern', () => {
    it('刪掉所有以 prefix 開頭的 key', async () => {
      const prefix = `prefix-${Date.now()}-`
      await set_cache(`${prefix}1`, 'a')
      await set_cache(`${prefix}2`, 'b')
      await set_cache(`other-${Date.now()}`, 'c')

      await invalidate_cache_pattern(prefix)

      expect(await get_cache(`${prefix}1`)).toBeNull()
      expect(await get_cache(`${prefix}2`)).toBeNull()
      // other 不該被影響
    })

    it('沒匹配的 prefix 不會壞', async () => {
      await expect(invalidate_cache_pattern('nope-')).resolves.toBeUndefined()
    })
  })

  describe('graceful degradation', () => {
    it('write 不會 throw（即使背後 IDB 出問題）', async () => {
      // 不能直接弄壞 fake-indexeddb、但確認 API 不 throw
      await expect(set_cache(key(), 'v')).resolves.toBeUndefined()
    })

    it('read 不會 throw、最差回 null', async () => {
      await expect(get_cache(key())).resolves.toSatisfy(v => v === null || typeof v === 'object')
    })
  })
})
