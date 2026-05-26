import { describe, it, expect, vi } from 'vitest'
import {
  runPreload,
  getCacheVersion,
  type SupabaseLike,
  type PreloadProgress,
  type PreloadResult,
} from '@/lib/cache/preload-runner'
import {
  PRELOAD_SHAPES,
  staleAfterToMs,
  buildPreloadCacheKey,
  STALE_AFTER_MS,
  type PreloadShape,
  type StaleAfter,
} from '@/lib/cache/preload-config'

/**
 * Preload Runner / Config 介面測試
 *
 * 配 ADR-0005、stub 階段。
 *
 * 此 test 只驗「介面 freeze」、不驗實作行為（D+1 接通後再補實作 test）：
 *   - runPreload 回 PreloadResult shape
 *   - onProgress / skipTables 介面不炸
 *   - getCacheVersion 介面回 null（stub）
 *   - PRELOAD_SHAPES SSOT 結構正確
 *   - staleAfterToMs / buildPreloadCacheKey 行為正確
 */

// 最小 fake Supabase client、滿足 SupabaseLike interface
function makeFakeSupabase(): SupabaseLike {
  return {
    from: (_table: string) => ({
      select: (_cols: string) => ({}),
    }),
  }
}

describe('preload-config (SSOT)', () => {
  describe('PRELOAD_SHAPES', () => {
    it('是 non-empty array', () => {
      expect(Array.isArray(PRELOAD_SHAPES)).toBe(true)
      expect(PRELOAD_SHAPES.length).toBeGreaterThan(0)
    })

    it('每筆都有 table / select / staleAfter', () => {
      for (const shape of PRELOAD_SHAPES) {
        expect(typeof shape.table).toBe('string')
        expect(shape.table.length).toBeGreaterThan(0)
        expect(typeof shape.select).toBe('string')
        expect(shape.select.length).toBeGreaterThan(0)
        expect(['6h', '1d', '7d', '30d']).toContain(shape.staleAfter)
      }
    })

    it('table 不重複（每張表只能 preload 一次）', () => {
      const tables = PRELOAD_SHAPES.map(s => s.table)
      const unique = new Set(tables)
      expect(unique.size).toBe(tables.length)
    })

    it('filter 若有、必為 "workspace"', () => {
      for (const shape of PRELOAD_SHAPES) {
        if (shape.filter !== undefined) {
          expect(shape.filter).toBe('workspace')
        }
      }
    })

    it('包含 ADR 規定的核心主檔', () => {
      const tables = PRELOAD_SHAPES.map(s => s.table)
      expect(tables).toContain('ref_countries')
      expect(tables).toContain('ref_cities')
      expect(tables).toContain('roles')
      expect(tables).toContain('role_capabilities')
      expect(tables).toContain('company_settings')
      expect(tables).toContain('suppliers')
      expect(tables).toContain('attractions')
      expect(tables).toContain('restaurants')
      expect(tables).toContain('hotels')
      expect(tables).toContain('tour_templates')
    })
  })

  describe('staleAfterToMs', () => {
    it('6h = 6 hours in ms', () => {
      expect(staleAfterToMs('6h')).toBe(6 * 60 * 60 * 1000)
    })

    it('1d = 24 hours', () => {
      expect(staleAfterToMs('1d')).toBe(24 * 60 * 60 * 1000)
    })

    it('7d = 7 days', () => {
      expect(staleAfterToMs('7d')).toBe(7 * 24 * 60 * 60 * 1000)
    })

    it('30d = 30 days', () => {
      expect(staleAfterToMs('30d')).toBe(30 * 24 * 60 * 60 * 1000)
    })

    it('長度單調遞增（30d > 7d > 1d > 6h）', () => {
      expect(staleAfterToMs('30d')).toBeGreaterThan(staleAfterToMs('7d'))
      expect(staleAfterToMs('7d')).toBeGreaterThan(staleAfterToMs('1d'))
      expect(staleAfterToMs('1d')).toBeGreaterThan(staleAfterToMs('6h'))
    })

    it('STALE_AFTER_MS 跟 staleAfterToMs 一致', () => {
      const keys: StaleAfter[] = ['6h', '1d', '7d', '30d']
      for (const k of keys) {
        expect(staleAfterToMs(k)).toBe(STALE_AFTER_MS[k])
      }
    })
  })

  describe('buildPreloadCacheKey', () => {
    it('public shape → preload:public:<table>', () => {
      const shape: PreloadShape = {
        table: 'ref_countries',
        select: 'code, name',
        staleAfter: '30d',
      }
      const key = buildPreloadCacheKey(shape, { workspaceId: 'ws_abc' })
      expect(key).toBe('preload:public:ref_countries')
    })

    it('workspace shape → preload:ws_<id>:<table>', () => {
      const shape: PreloadShape = {
        table: 'suppliers',
        select: 'id, name',
        filter: 'workspace',
        staleAfter: '6h',
      }
      const key = buildPreloadCacheKey(shape, { workspaceId: 'ws_abc' })
      expect(key).toBe('preload:ws_ws_abc:suppliers')
    })

    it('workspace shape 沒給 workspaceId → throw', () => {
      const shape: PreloadShape = {
        table: 'suppliers',
        select: 'id',
        filter: 'workspace',
        staleAfter: '6h',
      }
      expect(() => buildPreloadCacheKey(shape, {})).toThrow(/workspaceId/)
    })

    it('public shape 沒給 workspaceId 不會 throw', () => {
      const shape: PreloadShape = {
        table: 'ref_countries',
        select: 'code',
        staleAfter: '30d',
      }
      expect(() => buildPreloadCacheKey(shape, {})).not.toThrow()
    })
  })
})

describe('preload-runner (stub 介面)', () => {
  describe('runPreload', () => {
    it('stub 回 ok=true', async () => {
      const result = await runPreload(makeFakeSupabase(), {
        workspaceId: 'ws_test',
      })
      expect(result.ok).toBe(true)
    })

    it('回的 result 含 cacheVersion 字串', async () => {
      const result = await runPreload(makeFakeSupabase(), {
        workspaceId: 'ws_test',
      })
      expect(typeof result.cacheVersion).toBe('string')
      expect(result.cacheVersion.length).toBeGreaterThan(0)
    })

    it('回的 result 符合 PreloadResult shape', async () => {
      const result: PreloadResult = await runPreload(makeFakeSupabase(), {
        workspaceId: 'ws_test',
      })
      // type assertion + runtime check
      expect(result).toHaveProperty('ok')
      expect(result).toHaveProperty('cacheVersion')
      // errors 是 optional、stub 階段不應該回
      if (result.errors !== undefined) {
        expect(Array.isArray(result.errors)).toBe(true)
      }
    })

    it('onProgress callback 介面正確（會被叫到）', async () => {
      const onProgress = vi.fn<(p: PreloadProgress) => void>()
      await runPreload(makeFakeSupabase(), { workspaceId: 'ws_test' }, { onProgress })
      expect(onProgress).toHaveBeenCalled()
      // callback 的參數結構正確
      const lastCall = onProgress.mock.calls[onProgress.mock.calls.length - 1]
      expect(lastCall).toBeDefined()
      const progress = lastCall![0]
      expect(typeof progress.total).toBe('number')
      expect(typeof progress.completed).toBe('number')
      expect(progress.total).toBeGreaterThanOrEqual(0)
      expect(progress.completed).toBeGreaterThanOrEqual(0)
    })

    it('沒給 onProgress 也不會 throw', async () => {
      await expect(
        runPreload(makeFakeSupabase(), { workspaceId: 'ws_test' })
      ).resolves.toBeDefined()
    })

    it('skipTables 介面正確：不會 throw', async () => {
      const result = await runPreload(
        makeFakeSupabase(),
        { workspaceId: 'ws_test' },
        { skipTables: ['suppliers', 'hotels'] }
      )
      expect(result.ok).toBe(true)
    })

    it('skipTables 影響 onProgress 的 total', async () => {
      const skip = ['suppliers', 'hotels', 'attractions']
      const captured: PreloadProgress[] = []
      await runPreload(
        makeFakeSupabase(),
        { workspaceId: 'ws_test' },
        {
          skipTables: skip,
          onProgress: p => captured.push(p),
        }
      )
      // 至少有一筆 progress
      expect(captured.length).toBeGreaterThan(0)
      // total 應該 = PRELOAD_SHAPES.length - skip 數
      const expectedTotal = PRELOAD_SHAPES.length - skip.length
      expect(captured[captured.length - 1]!.total).toBe(expectedTotal)
    })

    it('skipTables = []（空陣列）等同沒給', async () => {
      const captured: PreloadProgress[] = []
      await runPreload(
        makeFakeSupabase(),
        { workspaceId: 'ws_test' },
        {
          skipTables: [],
          onProgress: p => captured.push(p),
        }
      )
      expect(captured[captured.length - 1]!.total).toBe(PRELOAD_SHAPES.length)
    })
  })

  describe('getCacheVersion', () => {
    it('stub 回 null', async () => {
      const v = await getCacheVersion()
      expect(v).toBeNull()
    })

    it('回 type 為 string | null', async () => {
      const v = await getCacheVersion()
      expect(v === null || typeof v === 'string').toBe(true)
    })
  })
})
