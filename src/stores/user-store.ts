/**
 * 員工管理 Store
 * 快取優先架構：Supabase（雲端）+ IndexedDB（快取）
 */

import { getTodayString } from '@/lib/utils/format-date'
import { EmployeeFull } from './types'
import { createStore } from './core/create-store'
import { TABLES } from '@/lib/db/schemas'
import { generateUUID } from '@/lib/utils/uuid'

// 建立員工 Store（啟用 workspace 隔離）
export const useUserStore = createStore<EmployeeFull>({
  tableName: TABLES.EMPLOYEES,
  workspaceScoped: true, // 員工資料按 workspace 隔離
})

// 擴充自訂方法（如果需要）
export const userStoreHelpers = {
  /**
   * 根據員工編號查詢
   */
  getUserByNumber: (employee_number: string): EmployeeFull | undefined => {
    const state = useUserStore.getState()
    return state.items.find(user => user.employee_number === employee_number)
  },

  /**
   * 員工編號生成
   * 新格式: E001-E999 (無辦公室前綴)
   * 例如: E001, E002...E999
   * E000 為平台管理資格保留
   *
   * 向後相容舊格式: TP-E001, TC-E001
   */
  generateUserNumber: (_english_name?: string): string => {
    const state = useUserStore.getState()
    const users = state.items

    // 取得所有現有的員工編號
    const allEmployeeNumbers = users.map(user => user.employee_number).filter(Boolean) as string[]

    /**
     * 解析員工編號為序列號
     * 新格式: E001-E999 → 1-999
     * 舊格式: TP-E001, TC-E001 → 1-999 (向後相容)
     */
    const parseEmployeeNumber = (num: string): number => {
      // 移除前綴 "TP-" 或 "TC-"（向後相容舊格式）
      const withoutPrefix = num.replace(/^[A-Z]{2}-/, '')

      // E000-E999 格式
      const basicMatch = withoutPrefix.match(/^E(\d{3})$/)
      if (basicMatch) {
        return parseInt(basicMatch[1], 10)
      }

      // EA01-EZ99 格式（擴展）
      const extendedMatch = withoutPrefix.match(/^E([A-Z])(\d{2})$/)
      if (extendedMatch) {
        const letterIndex = extendedMatch[1].charCodeAt(0) - 'A'.charCodeAt(0)
        const number = parseInt(extendedMatch[2], 10)
        return 1000 + letterIndex * 99 + (number - 1)
      }

      return -1 // 非有效 E 格式
    }

    /**
     * 將序列號轉換為員工編號（新格式，無前綴）
     * 1-999 → E001-E999
     */
    const toEmployeeNumber = (seq: number): string => {
      if (seq < 1000) {
        return `E${seq.toString().padStart(3, '0')}`
      } else {
        const extended = seq - 1000
        const letterIndex = Math.floor(extended / 99)
        const number = (extended % 99) + 1
        const letter = String.fromCharCode('A'.charCodeAt(0) + letterIndex)
        return `E${letter}${number.toString().padStart(2, '0')}`
      }
    }

    // 找出現有最大序號
    const existingSequences = allEmployeeNumbers.map(parseEmployeeNumber).filter(n => n >= 0)

    const maxSequence = existingSequences.length > 0 ? Math.max(...existingSequences) : 0
    let nextSequence = maxSequence + 1

    // 跳過 E000（平台管理資格保留）
    if (nextSequence === 0) {
      nextSequence = 1
    }

    // 產生編號並確保不重複
    let candidate = toEmployeeNumber(nextSequence)
    while (allEmployeeNumbers.includes(candidate)) {
      nextSequence++
      candidate = toEmployeeNumber(nextSequence)
    }

    return candidate
  },

  /**
   * 搜尋員工
   */
  searchUsers: (searchTerm: string): EmployeeFull[] => {
    const state = useUserStore.getState()
    const users = state.items
    const term = searchTerm.toLowerCase()

    return users.filter(
      user =>
        user.employee_number.toLowerCase().includes(term) ||
        user.english_name.toLowerCase().includes(term) ||
        user.display_name.includes(term)
    )
  },

  /**
   * 按狀態篩選
   */
  getUsersByStatus: (status: EmployeeFull['status']): EmployeeFull[] => {
    const state = useUserStore.getState()
    return state.items.filter(user => user.status === status)
  },

  /**
   * 更新基本薪資
   */
  updateBaseSalary: async (id: string, newSalary: number, reason: string): Promise<void> => {
    const user = useUserStore.getState().items.find((u: EmployeeFull) => u.id === id)
    if (!user) return

    const newHistory = [
      ...user.salary_info.salary_history,
      {
        effective_date: getTodayString(),
        base_salary: newSalary,
        reason,
      },
    ]

    await useUserStore.getState().update(id, {
      salary_info: {
        ...user.salary_info,
        base_salary: newSalary,
        salary_history: newHistory,
      },
    } as Partial<EmployeeFull>)
  },

  /**
   * 新增津貼
   */
  addAllowance: async (id: string, type: string, amount: number): Promise<void> => {
    const user = useUserStore.getState().items.find((u: EmployeeFull) => u.id === id)
    if (!user) return

    const newAllowances = [
      ...user.salary_info.allowances.filter(a => a.type !== type),
      { type, amount },
    ]

    await useUserStore.getState().update(id, {
      salary_info: {
        ...user.salary_info,
        allowances: newAllowances,
      },
    } as Partial<EmployeeFull>)
  },

  /**
   * 移除津貼
   */
  removeAllowance: async (id: string, type: string): Promise<void> => {
    const user = useUserStore.getState().items.find((u: EmployeeFull) => u.id === id)
    if (!user) return

    const newAllowances = user.salary_info.allowances.filter(a => a.type !== type)

    await useUserStore.getState().update(id, {
      salary_info: {
        ...user.salary_info,
        allowances: newAllowances,
      },
    } as Partial<EmployeeFull>)
  },

  /**
   * 新增請假記錄
   */
  addLeaveRecord: async (
    id: string,
    leaveRecord: Omit<EmployeeFull['attendance']['leave_records'][0], 'id'>
  ): Promise<void> => {
    const user = useUserStore.getState().items.find((u: EmployeeFull) => u.id === id)
    if (!user) return

    const newRecord = {
      ...leaveRecord,
      id: generateUUID(),
    }

    const newLeaveRecords = [...user.attendance.leave_records, newRecord]

    await useUserStore.getState().update(id, {
      attendance: {
        ...user.attendance,
        leave_records: newLeaveRecords,
      },
    } as Partial<EmployeeFull>)
  },

  /**
   * 核准請假
   */
  approveLeave: async (user_id: string, leaveId: string, approved_by: string): Promise<void> => {
    const user = useUserStore.getState().items.find((u: EmployeeFull) => u.id === user_id)
    if (!user) return

    const updatedRecords = user.attendance.leave_records.map(record =>
      record.id === leaveId ? { ...record, status: 'approved' as const, approved_by } : record
    )

    await useUserStore.getState().update(user_id, {
      attendance: {
        ...user.attendance,
        leave_records: updatedRecords,
      },
    } as Partial<EmployeeFull>)
  },

  /**
   * 拒絕請假
   */
  rejectLeave: async (user_id: string, leaveId: string): Promise<void> => {
    const user = useUserStore.getState().items.find((u: EmployeeFull) => u.id === user_id)
    if (!user) return

    const updatedRecords = user.attendance.leave_records.map(record =>
      record.id === leaveId ? { ...record, status: 'rejected' as const } : record
    )

    await useUserStore.getState().update(user_id, {
      attendance: {
        ...user.attendance,
        leave_records: updatedRecords,
      },
    } as Partial<EmployeeFull>)
  },

  /**
   * 新增加班記錄
   */
  addOvertimeRecord: async (
    id: string,
    overtimeRecord: Omit<EmployeeFull['attendance']['overtime_records'][0], 'id'>
  ): Promise<void> => {
    const user = useUserStore.getState().items.find((u: EmployeeFull) => u.id === id)
    if (!user) return

    const newRecord = {
      ...overtimeRecord,
      id: generateUUID(),
    }

    const newOvertimeRecords = [...user.attendance.overtime_records, newRecord]

    await useUserStore.getState().update(id, {
      attendance: {
        ...user.attendance,
        overtime_records: newOvertimeRecords,
      },
    } as Partial<EmployeeFull>)
  },

  /**
   * 新增合約
   */
  addContract: async (
    id: string,
    contract: Omit<EmployeeFull['contracts'][0], 'id'>
  ): Promise<void> => {
    const user = useUserStore.getState().items.find((u: EmployeeFull) => u.id === id)
    if (!user) return

    const newContract = {
      ...contract,
      id: generateUUID(),
    }

    const newContracts = [...user.contracts, newContract]

    await useUserStore.getState().update(id, {
      contracts: newContracts,
    } as Partial<EmployeeFull>)
  },

  /**
   * 更新合約
   */
  updateContract: async (
    user_id: string,
    contractId: string,
    updates: Partial<EmployeeFull['contracts'][0]>
  ): Promise<void> => {
    const user = useUserStore.getState().items.find((u: EmployeeFull) => u.id === user_id)
    if (!user) return

    const updatedContracts = user.contracts.map(contract =>
      contract.id === contractId ? { ...contract, ...updates } : contract
    )

    await useUserStore.getState().update(user_id, {
      contracts: updatedContracts,
    } as Partial<EmployeeFull>)
  },
}

// 相容性 alias（保留舊的 API）
const _useUserStoreCompat = () => {
  const store = useUserStore()

  return {
    ...store,
    users: store.items, // 相容性：items → users
    isLoading: store.loading, // 相容性：loading → isLoading
    loadUsersFromDatabase: store.fetchAll, // 相容性：fetchAll → loadUsersFromDatabase
    addUser: store.create, // 相容性：create → addUser
    updateUser: store.update, // 相容性：update → updateUser
    deleteUser: store.delete, // 相容性：delete → deleteUser
    getUser: (id: string) => store.items.find((u: EmployeeFull) => u.id === id), // 相容性：替代 findById
    ...userStoreHelpers, // 包含所有自訂方法
  }
}
