import { describe, it, expect, beforeEach } from 'vitest'
import { useUserStore, userStoreHelpers } from '@/stores/user-store'
import type { EmployeeFull } from '@/types/user.types'

/**
 * user-store 本體緊綁 createStore + Supabase + IndexedDB、不在 unit test 範圍。
 * 但 `userStoreHelpers` 內有純查詢 / 編號生成邏輯——只讀 `state.items`、不碰網路。
 * 這份 test 只覆蓋這些純函數、用 setState 灌假員工資料。
 *
 * 涵蓋：
 *  - getUserByNumber
 *  - searchUsers
 *  - getUsersByStatus
 *  - generateUserNumber（新格式 E001 / 舊格式 TP-E*** / 擴展 EA01 / 跳號 / 跳 E000 / 衝突）
 */

// 最小 EmployeeFull fixture（未用到的子物件用 as 收斂、避免 1:1 抄完整型別）
function makeEmployee(overrides: Partial<EmployeeFull>): EmployeeFull {
  return {
    id: 'fixture-id',
    employee_number: 'E001',
    english_name: 'Test',
    display_name: '測試員工',
    chinese_name: '測試員工',
    personal_info: {} as EmployeeFull['personal_info'],
    job_info: {} as EmployeeFull['job_info'],
    salary_info: {} as EmployeeFull['salary_info'],
    attendance: {} as EmployeeFull['attendance'],
    contracts: [],
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function seed(items: EmployeeFull[]) {
  useUserStore.setState({ items } as Partial<ReturnType<typeof useUserStore.getState>>)
}

describe('userStoreHelpers (pure helpers)', () => {
  beforeEach(() => {
    seed([])
  })

  describe('getUserByNumber', () => {
    it('returns the user matching employee_number', () => {
      seed([
        makeEmployee({ id: '1', employee_number: 'E001' }),
        makeEmployee({ id: '2', employee_number: 'E002' }),
      ])
      const u = userStoreHelpers.getUserByNumber('E002')
      expect(u?.id).toBe('2')
    })

    it('returns undefined when no match', () => {
      seed([makeEmployee({ id: '1', employee_number: 'E001' })])
      expect(userStoreHelpers.getUserByNumber('E999')).toBeUndefined()
    })

    it('returns undefined on empty list', () => {
      expect(userStoreHelpers.getUserByNumber('E001')).toBeUndefined()
    })
  })

  describe('searchUsers', () => {
    beforeEach(() => {
      seed([
        makeEmployee({
          id: '1',
          employee_number: 'E001',
          english_name: 'Alice',
          display_name: '愛麗絲',
        }),
        makeEmployee({
          id: '2',
          employee_number: 'E002',
          english_name: 'Bob',
          display_name: '小明',
        }),
        makeEmployee({
          id: '3',
          employee_number: 'TP-E007',
          english_name: 'Charlie',
          display_name: '查理',
        }),
      ])
    })

    it('matches by employee_number (case-insensitive)', () => {
      const result = userStoreHelpers.searchUsers('e001')
      expect(result.map(u => u.id)).toEqual(['1'])
    })

    it('matches by english_name (case-insensitive)', () => {
      const result = userStoreHelpers.searchUsers('ALICE')
      expect(result.map(u => u.id)).toEqual(['1'])
    })

    it('matches by display_name (Chinese, case-insensitive does not apply)', () => {
      const result = userStoreHelpers.searchUsers('小明')
      expect(result.map(u => u.id)).toEqual(['2'])
    })

    it('matches partial substring on english_name', () => {
      const result = userStoreHelpers.searchUsers('li')
      // Alice (李/li) and Charlie (li 在 Charlie 內)
      expect(result.map(u => u.id).sort()).toEqual(['1', '3'])
    })

    it('matches old TP- prefixed employee_number', () => {
      const result = userStoreHelpers.searchUsers('tp-')
      expect(result.map(u => u.id)).toEqual(['3'])
    })

    it('returns empty array on no match', () => {
      expect(userStoreHelpers.searchUsers('nobody')).toEqual([])
    })

    it('returns empty array on empty store', () => {
      seed([])
      expect(userStoreHelpers.searchUsers('alice')).toEqual([])
    })
  })

  describe('getUsersByStatus', () => {
    beforeEach(() => {
      seed([
        makeEmployee({ id: '1', status: 'active' }),
        makeEmployee({ id: '2', status: 'active' }),
        makeEmployee({ id: '3', status: 'probation' }),
        makeEmployee({ id: '4', status: 'terminated' }),
        makeEmployee({ id: '5', status: 'leave' }),
      ])
    })

    it('returns only active users', () => {
      expect(
        userStoreHelpers
          .getUsersByStatus('active')
          .map(u => u.id)
          .sort()
      ).toEqual(['1', '2'])
    })

    it('returns only probation users', () => {
      expect(userStoreHelpers.getUsersByStatus('probation').map(u => u.id)).toEqual(['3'])
    })

    it('returns only terminated users', () => {
      expect(userStoreHelpers.getUsersByStatus('terminated').map(u => u.id)).toEqual(['4'])
    })

    it('returns only leave users', () => {
      expect(userStoreHelpers.getUsersByStatus('leave').map(u => u.id)).toEqual(['5'])
    })
  })

  describe('generateUserNumber', () => {
    it('returns E001 when store is empty', () => {
      expect(userStoreHelpers.generateUserNumber()).toBe('E001')
    })

    it('returns next sequential number after E001', () => {
      seed([makeEmployee({ id: '1', employee_number: 'E001' })])
      expect(userStoreHelpers.generateUserNumber()).toBe('E002')
    })

    it('returns next sequential number after gaps (uses max + 1)', () => {
      seed([
        makeEmployee({ id: '1', employee_number: 'E001' }),
        makeEmployee({ id: '2', employee_number: 'E005' }),
      ])
      expect(userStoreHelpers.generateUserNumber()).toBe('E006')
    })

    it('parses old TP- prefix correctly', () => {
      seed([
        makeEmployee({ id: '1', employee_number: 'TP-E010' }),
        makeEmployee({ id: '2', employee_number: 'TC-E003' }),
      ])
      // max sequence = 10、下一個 = 11、新格式無前綴
      expect(userStoreHelpers.generateUserNumber()).toBe('E011')
    })

    it('handles mixed old / new format', () => {
      seed([
        makeEmployee({ id: '1', employee_number: 'TP-E007' }),
        makeEmployee({ id: '2', employee_number: 'E020' }),
      ])
      expect(userStoreHelpers.generateUserNumber()).toBe('E021')
    })

    it('skips invalid employee_number formats', () => {
      seed([
        makeEmployee({ id: '1', employee_number: 'E001' }),
        makeEmployee({ id: '2', employee_number: 'INVALID' }),
        makeEmployee({ id: '3', employee_number: 'XYZ-123' }),
      ])
      // 只有 E001 有效、下一個 = E002
      expect(userStoreHelpers.generateUserNumber()).toBe('E002')
    })

    it('rolls into extended format EA01 after E999', () => {
      seed([makeEmployee({ id: '1', employee_number: 'E999' })])
      // 999 + 1 = 1000、進擴展格式 → letterIndex=0 (A), number=1
      expect(userStoreHelpers.generateUserNumber()).toBe('EA01')
    })

    it('continues extended format EA02', () => {
      seed([makeEmployee({ id: '1', employee_number: 'EA01' })])
      expect(userStoreHelpers.generateUserNumber()).toBe('EA02')
    })

    it('avoids collision when candidate already exists', () => {
      // 製造 max sequence = 5、但 E006 也已被佔用 → 必須跳到 E007
      seed([
        makeEmployee({ id: '1', employee_number: 'E005' }),
        makeEmployee({ id: '2', employee_number: 'E006' }),
      ])
      // max = 6（E006 也是有效格式）→ 下一個 = E007
      expect(userStoreHelpers.generateUserNumber()).toBe('E007')
    })

    it('ignores empty / undefined employee_number values', () => {
      seed([
        makeEmployee({ id: '1', employee_number: '' }),
        makeEmployee({ id: '2', employee_number: 'E003' }),
      ])
      expect(userStoreHelpers.generateUserNumber()).toBe('E004')
    })
  })
})
