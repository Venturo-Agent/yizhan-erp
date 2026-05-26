import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useDataFiltering } from '@/hooks/useDataFiltering'

interface TourItem extends Record<string, unknown> {
  id: string
  name: string
  code: string
  location: string
  status: string
  total_amount: number
}

const tours: TourItem[] = [
  {
    id: '1',
    name: '清邁清新假期',
    code: 'CNX250128A',
    location: 'Chiang Mai',
    status: 'active',
    total_amount: 25000,
  },
  {
    id: '2',
    name: '東京賞櫻',
    code: 'TYO250301B',
    location: 'Tokyo',
    status: 'draft',
    total_amount: 60000,
  },
  {
    id: '3',
    name: '京都楓葉',
    code: 'KIX251115A',
    location: 'Kyoto',
    status: 'active',
    total_amount: 80000,
  },
  {
    id: '4',
    name: 'Bali Beach',
    code: 'DPS250410C',
    location: 'Bali',
    status: 'archived',
    total_amount: 45000,
  },
  {
    id: '5',
    name: 'Tokyo Skyline',
    code: 'TYO250901D',
    location: 'Tokyo',
    status: 'active',
    total_amount: 70000,
  },
]

describe('useDataFiltering', () => {
  describe('狀態過濾', () => {
    it('statusFilter = "all" 不過濾', () => {
      const { result } = renderHook(() =>
        useDataFiltering(tours, 'all', '', { statusField: 'status' })
      )
      expect(result.current).toHaveLength(5)
    })

    it('statusFilter = 空字串 不過濾', () => {
      const { result } = renderHook(() =>
        useDataFiltering(tours, '', '', { statusField: 'status' })
      )
      expect(result.current).toHaveLength(5)
    })

    it('statusFilter 指定值時只回該狀態', () => {
      const { result } = renderHook(() =>
        useDataFiltering(tours, 'active', '', { statusField: 'status' })
      )
      expect(result.current.map(t => t.id)).toEqual(['1', '3', '5'])
    })

    it('沒給 statusField 時 statusFilter 不生效', () => {
      const { result } = renderHook(() => useDataFiltering(tours, 'active', '', {}))
      expect(result.current).toHaveLength(5)
    })

    it('狀態不匹配時回空陣列', () => {
      const { result } = renderHook(() =>
        useDataFiltering(tours, 'nonexistent_status', '', { statusField: 'status' })
      )
      expect(result.current).toHaveLength(0)
    })
  })

  describe('關鍵字搜尋', () => {
    it('預設 fuzzy + caseInsensitive', () => {
      const { result } = renderHook(() =>
        useDataFiltering(tours, 'all', 'tokyo', { searchFields: ['location'] })
      )
      expect(result.current.map(t => t.id).sort()).toEqual(['2', '5'])
    })

    it('caseInsensitive = false 時大小寫敏感', () => {
      const { result } = renderHook(() =>
        useDataFiltering(tours, 'all', 'tokyo', {
          searchFields: ['location'],
          caseInsensitive: false,
        })
      )
      expect(result.current).toHaveLength(0)
    })

    it('fuzzy = false 時要求完全匹配（caseInsensitive 預設仍開）', () => {
      const { result: contains } = renderHook(() =>
        useDataFiltering(tours, 'all', 'tokyo', {
          searchFields: ['location'],
          fuzzySearch: false,
        })
      )
      expect(contains.current.map(t => t.id).sort()).toEqual(['2', '5'])

      const { result: partial } = renderHook(() =>
        useDataFiltering(tours, 'all', 'toky', {
          searchFields: ['location'],
          fuzzySearch: false,
        })
      )
      expect(partial.current).toHaveLength(0)
    })

    it('多搜尋欄位、任一命中即匹配', () => {
      const { result } = renderHook(() =>
        useDataFiltering(tours, 'all', 'CNX', { searchFields: ['name', 'code', 'location'] })
      )
      expect(result.current.map(t => t.id)).toEqual(['1'])
    })

    it('searchTerm 是純空白 視為無搜尋', () => {
      const { result } = renderHook(() =>
        useDataFiltering(tours, 'all', '   ', { searchFields: ['location'] })
      )
      expect(result.current).toHaveLength(5)
    })

    it('沒給 searchFields 時 searchTerm 不生效', () => {
      const { result } = renderHook(() => useDataFiltering(tours, 'all', 'tokyo', {}))
      expect(result.current).toHaveLength(5)
    })

    it('null / undefined 欄位值不應 match', () => {
      const data: TourItem[] = [
        ...tours,
        // 強制塞 null 進來測試 null guard
        {
          id: '6',
          name: 'NoLoc',
          code: 'X',
          location: null as unknown as string,
          status: 'active',
          total_amount: 0,
        },
      ]
      const { result } = renderHook(() =>
        useDataFiltering(data, 'all', 'tokyo', { searchFields: ['location'] })
      )
      expect(result.current.map(t => t.id).sort()).toEqual(['2', '5'])
    })

    it('搜尋會 trim 前後空白', () => {
      const { result } = renderHook(() =>
        useDataFiltering(tours, 'all', '   tokyo   ', { searchFields: ['location'] })
      )
      expect(result.current.map(t => t.id).sort()).toEqual(['2', '5'])
    })

    it('搜尋會把非字串欄位轉成字串再比對', () => {
      const { result } = renderHook(() =>
        useDataFiltering(tours, 'all', '60000', { searchFields: ['total_amount'] })
      )
      expect(result.current.map(t => t.id)).toEqual(['2'])
    })
  })

  describe('狀態 + 搜尋 同時生效', () => {
    it('兩個條件都要符合', () => {
      const { result } = renderHook(() =>
        useDataFiltering(tours, 'active', 'tokyo', {
          statusField: 'status',
          searchFields: ['location'],
        })
      )
      // active + location 含 tokyo → 只有 id=5
      expect(result.current.map(t => t.id)).toEqual(['5'])
    })
  })

  describe('自訂過濾器', () => {
    it('customFilters 全部通過才保留', () => {
      const { result } = renderHook(() =>
        useDataFiltering(tours, 'all', '', {
          customFilters: [item => (item.total_amount as number) >= 50000],
        })
      )
      expect(result.current.map(t => t.id).sort()).toEqual(['2', '3', '5'])
    })

    it('多個 customFilter 必須都過', () => {
      const { result } = renderHook(() =>
        useDataFiltering(tours, 'all', '', {
          customFilters: [
            item => (item.total_amount as number) >= 50000,
            item => (item.status as string) === 'active',
          ],
        })
      )
      expect(result.current.map(t => t.id).sort()).toEqual(['3', '5'])
    })

    it('customFilter 拋錯時保留該項（不排除）', () => {
      const { result } = renderHook(() =>
        useDataFiltering(tours, 'all', '', {
          customFilters: [
            () => {
              throw new Error('boom')
            },
          ],
        })
      )
      expect(result.current).toHaveLength(5)
    })
  })

  describe('空資料', () => {
    it('空陣列輸入回空陣列', () => {
      const { result } = renderHook(() =>
        useDataFiltering<TourItem>([], 'active', 'tokyo', {
          statusField: 'status',
          searchFields: ['location'],
        })
      )
      expect(result.current).toEqual([])
    })
  })
})
