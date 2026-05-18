// ============================
// 員工型別定義
// ============================
// - Employee（models.types.ts）= DB row 真相
// - EmployeeFull（本檔）= 全站用、含 personal_info 巢狀強型別 + workspace + permissions

import type { UserRole } from '@/lib/rbac-config'

// ==================== 巢狀子型別（強型別、Employee.personal_info 等 Json 欄位 cast 用）====================

export interface PersonalInfo {
  national_id: string
  birth_date: string
  phone: string | string[]
  email: string
  address: string
  emergency_contact: {
    name: string
    relationship: string
    phone: string
    address?: string
  }
}

export interface JobInfo {
  position?: string
  supervisor?: string
  hire_date: string
  probation_end_date?: string
  role_id?: string
}

export interface SalaryInfo {
  base_salary: number
  allowances: { type: string; amount: number }[]
  salary_history: { effective_date: string; base_salary: number; reason: string }[]
  /** 全勤獎金（每月固定額、按比例扣） */
  attendance_bonus?: number
  /** 其他津貼總額（伙食 / 交通 / 職務加給合計） */
  other_allowances?: number
  /** 投保薪資（null = 用 monthly_salary） */
  insured_salary?: number | null
  /** 員工自願勞退提繳率 0-0.06（最高 6%） */
  pension_voluntary_rate?: number
  /** 發薪日 (1-31、'last'='月底') */
  pay_day?: number | 'last'
  /** 扶養親屬人數（健保保費計算用） */
  dependents_count?: number
  /** 勞保是否投保本公司（false = 在別公司投保） */
  labor_insured_here?: boolean
  /** 健保是否投保本公司（false = 在別公司投保） */
  health_insured_here?: boolean
}

export interface EmployeeAttendance {
  leave_records: {
    id: string
    type: 'annual' | 'sick' | 'personal' | 'maternity' | 'other'
    start_date: string
    end_date: string
    days: number
    reason?: string
    status: 'pending' | 'approved' | 'rejected'
    approved_by?: string
  }[]
  overtime_records: {
    id: string
    date: string
    hours: number
    reason: string
    approved_by?: string
  }[]
}

export interface EmployeeContract {
  id: string
  type: 'employment' | 'probation' | 'renewal'
  start_date: string
  end_date?: string
  file_path?: string
  notes?: string
}

// ==================== 主型別 ====================

/**
 * 員工詳細視圖（巢狀強型別、cast 用）
 * - 跟 DB Employee 同一筆 row、但巢狀 Json 欄位有強型別
 * - HR 編輯員工頁、settings/account、payroll 等用
 * - 從 DB 拿 Employee 後、cast 成 EmployeeFull 才能用 personal_info.xxx
 */
export interface EmployeeFull {
  id: string
  employee_number: string
  english_name: string
  display_name: string
  chinese_name: string
  name?: string // display_name 別名
  email?: string // personal_info.email 便捷
  personal_info: PersonalInfo
  job_info: JobInfo
  salary_info: SalaryInfo
  roles?: UserRole[]
  attendance: EmployeeAttendance
  contracts: EmployeeContract[]
  status: 'active' | 'probation' | 'leave' | 'terminated'
  terminated_at?: string | null
  terminated_by?: string | null
  avatar?: string
  avatar_url?: string | null
  role_id?: string | null
  workspace_id?: string
  workspace_code?: string
  workspace_name?: string
  selected_workspace_id?: string
  pinyin?: string | null
  password_hash?: string
  last_password_change?: string
  must_change_password?: boolean
  failed_login_attempts?: number
  last_failed_login?: string
  /** 月薪（top-level 欄位、payroll-engine 讀這個） */
  monthly_salary?: number
  /** 銀行資訊（給薪資匯款 / 代墊人對方銀行用、2026-05-15 加） */
  bank_code?: string | null
  bank_name?: string | null
  bank_account_number?: string | null
  bank_account_name?: string | null
  branch_id?: string | null
  created_at: string
  updated_at: string
}
