'use client'

/**
 * useEmployeeForm — 員工表單 state + handlers 提取
 *
 * 將表單狀態、effect、submit handler 從 EmployeeForm.tsx 拆出、
 * 讓 EmployeeForm.tsx 專注於 render 邏輯。
 */

import { useState, useRef, useEffect } from 'react'
import { useUserStore } from '@/stores/user-store'
import { useWorkspaceId } from '@/lib/workspace-context'
import { useBranches, useRoles } from '@/data/hooks'
import { apiPatch, apiPost, extractHttpErrorMessage, HttpError } from '@/lib/api/client'
import { useEmployee } from '@/data/entities/employees'
import { useWorkspaceFeatures } from '@/lib/permissions/hooks'
import { isHrFullEnabled } from '@/lib/permissions/subscription-plans'
import { EmployeeFull } from '@/stores/types'
import { alertSuccess, alertError } from '@/lib/ui/alert-dialog'
import { logger } from '@/lib/utils/logger'

type ScopeOption = { id: string; name: string; type?: string | null }

interface Role {
  id: string
  name: string
  description?: string
  workspace_id: string
  is_admin?: boolean
}

const COMPONENT_LABELS = {
  ALERT_REQUIRED_FIELDS: '請填寫必填欄位（中文姓名、Email）',
  ALERT_ROLE_REQUIRED: '請選擇職務',
  ERR_CREATE_FAILED: '建立員工失敗',
  ERR_UPDATE_FAILED: '更新員工失敗',
  ALERT_NEW_EMPLOYEE_TITLE: '新員工建立成功',
  ALERT_NEW_EMPLOYEE_SUCCESS_PREFIX: '員工建立成功！\n\n',
  ALERT_NEW_EMPLOYEE_NUMBER_PREFIX: '員工編號：',
  ALERT_NEW_EMPLOYEE_PASSWORD_PREFIX: '預設密碼：',
  ALERT_NEW_EMPLOYEE_FOOTER: '\n\n請通知員工首次登入後修改密碼。',
  ALERT_UPDATE_SUCCESS: '更新成功',
  ALERT_CREATE_SUCCESS: '員工建立成功',
  ALERT_UPDATE_FAILED: '更新失敗',
  ALERT_CREATE_FAILED: '建立失敗',
  CHINESE_NAME: '中文姓名',
  EMAIL: 'Email',
  ROLE: '職務',
} as const

export type EmployeeFormMode = 'hr' | 'self'

export interface UseEmployeeFormParams {
  employeeId?: string
  mode?: EmployeeFormMode
  onSubmit: () => void
}

export function useEmployeeForm({ employeeId, mode = 'hr', onSubmit }: UseEmployeeFormParams) {
  const { update: updateEmployee } = useUserStore()
  const workspaceId = useWorkspaceId()
  const { roles: cachedRoles } = useRoles()
  const { branches: cachedBranches } = useBranches()
  const { isFeatureEnabled } = useWorkspaceFeatures()

  // 完整人資（hr_full）feature gate：薪資結算 + 獎金結算「兩個都開」才算完整 HR
  // 5/19 William 拍板：新增 / 編輯員工只要有完整 HR、緊急聯絡人以下整段（到職日 / 薪資 / 勞健保 / 銀行）都顯示
  // SSOT：subscription-plans.ts HR_FULL_FEATURES
  const hrFullEnabled = isHrFullEnabled(isFeatureEnabled)

  const { item: employeeRaw } = useEmployee(employeeId ?? null)
  const employee = employeeRaw ? (employeeRaw as unknown as EmployeeFull) : null
  const isEditMode = !!employeeId

  const [submitting, setSubmitting] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(employee?.avatar_url || null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)

  // 從 API 載入的職務列表
  const [roles, setRoles] = useState<Role[]>([])

  // Phase A：分公司 scope（SWR cache、跨頁共享）
  const branches: ScopeOption[] = cachedBranches.map(b => ({
    id: b.id,
    name: b.name,
    type: b.type,
  }))

  const [formData, setFormData] = useState({
    chinese_name: employee?.chinese_name || '',
    display_name: employee?.display_name || '',
    email: employee?.email || '',
    phone:
      (Array.isArray(employee?.personal_info?.phone)
        ? employee.personal_info.phone[0]
        : employee?.personal_info?.phone) || '',
    address: employee?.personal_info?.address || '',
    birth_date: employee?.personal_info?.birth_date || '',
    id_number: employee?.personal_info?.national_id || '',
    job_title: ((employee as unknown as Record<string, unknown>)?.job_title as string) || '',
    position: employee?.job_info?.position || '',
    hire_date: employee?.job_info?.hire_date || new Date().toISOString().split('T')[0],
    emergency_contact_name: employee?.personal_info?.emergency_contact?.name || '',
    emergency_contact_relation: employee?.personal_info?.emergency_contact?.relationship || '',
    emergency_contact_phone: employee?.personal_info?.emergency_contact?.phone || '',
    emergency_contact_address: employee?.personal_info?.emergency_contact?.address || '',
    role_id: ((employee as unknown as Record<string, unknown>)?.role_id as string) || '',
    branch_id:
      ((employee as unknown as Record<string, unknown>)?.branch_id as string) ||
      (branches.length === 1 ? branches[0].id : ''),
    base_salary: Number(employee?.monthly_salary) || employee?.salary_info?.base_salary || 0,
    attendance_bonus: employee?.salary_info?.attendance_bonus || 0,
    other_allowances: employee?.salary_info?.other_allowances || 0,
    insured_salary: employee?.salary_info?.insured_salary ?? null,
    pension_voluntary_rate: employee?.salary_info?.pension_voluntary_rate || 0,
    pay_day: (employee?.salary_info?.pay_day as number | 'last') || 10,
    dependents_count: (employee?.salary_info?.dependents_count as number | undefined) ?? 0,
    labor_insured_here: (employee?.salary_info?.labor_insured_here as boolean | undefined) ?? true,
    health_insured_here:
      (employee?.salary_info?.health_insured_here as boolean | undefined) ?? true,
    avatar_url: employee?.avatar_url ?? '',
    bank_code: employee?.bank_code ?? '',
    bank_name: employee?.bank_name ?? '',
    bank_account_number: employee?.bank_account_number ?? '',
    bank_account_name: employee?.bank_account_name ?? '',
    // 旅行社業界日期（2026-05-18 加）
    tourism_join_date:
      ((employee as unknown as Record<string, unknown>)?.tourism_join_date as string) ?? '',
    labor_insurance_date:
      ((employee as unknown as Record<string, unknown>)?.labor_insurance_date as string) ?? '',
  })

  // 職務列表改用 SWR 快取
  useEffect(() => {
    if (cachedRoles.length > 0) {
      setRoles(cachedRoles as Role[])
    }
  }, [cachedRoles])

  // 分公司預填：避免 select 畫面顯示第一個 branch、但 state 仍是空字串的 UI 假象
  // 5/19 William 抓出：「下拉看起來有選、按建立後 DB branch_id 是 null」
  // 規則：branches 載入完且當前 formData.branch_id 為空 → 預填第一個 branch（跟 UI 顯示對齊）
  useEffect(() => {
    if (branches.length > 0 && !formData.branch_id) {
      setFormData(prev => ({ ...prev, branch_id: branches[0].id }))
    }
  }, [branches, formData.branch_id])

  // 5/24 純角色 SSOT：移除 eligibility 載入/預設邏輯。指派候選改由職務權限(role_capabilities)決定。

  // 當 employee 資料更新時，同步更新 formData
  useEffect(() => {
    if (employee) {
      setFormData(prev => ({
        ...prev,
        chinese_name: employee.chinese_name || '',
        display_name: employee.display_name || '',
        email: employee.email || employee.personal_info?.email || '',
        phone:
          (Array.isArray(employee.personal_info?.phone)
            ? employee.personal_info.phone[0]
            : employee.personal_info?.phone) || '',
        address: employee.personal_info?.address || '',
        birth_date: employee.personal_info?.birth_date || '',
        id_number: employee.personal_info?.national_id || '',
        job_title: ((employee as unknown as Record<string, unknown>).job_title as string) || '',
        position: employee.job_info?.position || '',
        hire_date: employee.job_info?.hire_date || new Date().toISOString().split('T')[0],
        emergency_contact_name: employee.personal_info?.emergency_contact?.name || '',
        emergency_contact_relation: employee.personal_info?.emergency_contact?.relationship || '',
        emergency_contact_phone: employee.personal_info?.emergency_contact?.phone || '',
        emergency_contact_address: employee.personal_info?.emergency_contact?.address || '',
        role_id: ((employee as unknown as Record<string, unknown>).role_id as string) || '',
        branch_id: ((employee as unknown as Record<string, unknown>).branch_id as string) || '',
        base_salary: Number(employee.monthly_salary) || employee.salary_info?.base_salary || 0,
        attendance_bonus: employee.salary_info?.attendance_bonus || 0,
        other_allowances: employee.salary_info?.other_allowances || 0,
        insured_salary: employee.salary_info?.insured_salary ?? null,
        pension_voluntary_rate: employee.salary_info?.pension_voluntary_rate || 0,
        pay_day: (employee.salary_info?.pay_day as number | 'last') || 10,
        dependents_count: (employee.salary_info?.dependents_count as number | undefined) ?? 0,
        labor_insured_here:
          (employee.salary_info?.labor_insured_here as boolean | undefined) ?? true,
        health_insured_here:
          (employee.salary_info?.health_insured_here as boolean | undefined) ?? true,
        bank_code: employee.bank_code ?? '',
        bank_name: employee.bank_name ?? '',
        bank_account_number: employee.bank_account_number ?? '',
        bank_account_name: employee.bank_account_name ?? '',
        tourism_join_date:
          ((employee as unknown as Record<string, unknown>).tourism_join_date as string) ?? '',
        labor_insurance_date:
          ((employee as unknown as Record<string, unknown>).labor_insurance_date as string) ?? '',
      }))
      setAvatarPreview(employee.avatar_url || null)
    }
  }, [employee])

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!workspaceId) {
      await alertError('找不到 workspace、請重新登入')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => setAvatarPreview(reader.result as string)
    reader.readAsDataURL(file)

    setAvatarUploading(true)
    try {
      const ext = file.name.split('.').pop() || 'png'
      const path = `${workspaceId}/${employeeId || 'new'}-${Date.now()}.${ext}`
      const fd = new FormData()
      fd.append('file', file)
      fd.append('bucket', 'user-avatars')
      fd.append('path', path)

      const res = await fetch('/api/storage/upload', { method: 'POST', body: fd })
      const json = (await res.json()) as { data?: { publicUrl?: string }; message?: string }
      if (!res.ok || !json.data?.publicUrl) {
        throw new Error(json.message || '上傳失敗')
      }
      setFormData(prev => ({ ...prev, avatar_url: json.data!.publicUrl! }))
    } catch (err) {
      logger.error('avatar upload failed', err)
      await alertError('頭像上傳失敗、按存檔不會更新頭像')
      setAvatarPreview(employee?.avatar_url ?? null)
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const missingFields: string[] = []
    if (!formData.chinese_name) missingFields.push(COMPONENT_LABELS.CHINESE_NAME)
    if (!formData.email) missingFields.push(COMPONENT_LABELS.EMAIL)
    if (!isEditMode && !formData.role_id && mode === 'hr') {
      missingFields.push(COMPONENT_LABELS.ROLE)
    }

    if (missingFields.length > 0) {
      await alertError(`請補齊以下必填欄位：${missingFields.join('、')}`)
      return
    }

    setSubmitting(true)
    try {
      // 5/19 William 改：新增員工不再 client 端配號
      // 由 /api/employees/create server 端產生 employee_number、跟 INSERT 緊鄰、減少跳號
      if (!isEditMode && !workspaceId) {
        throw new Error('無法取得當前分公司、請重新登入')
      }

      // 薪資相關欄位（含 hire_date / 月薪 / 獎金 / 津貼 / 勞健保 / 銀行）
      // 只在 hr_full feature 開啟時送、否則略過避免用 default 值覆蓋原資料
      const salaryPayload = hrFullEnabled
        ? {
            job_info: {
              position: formData.position,
              hire_date: formData.hire_date,
            },
            monthly_salary: formData.base_salary,
            salary_info: {
              base_salary: formData.base_salary,
              allowances: employee?.salary_info?.allowances || [],
              attendance_bonus: formData.attendance_bonus,
              other_allowances: formData.other_allowances,
              insured_salary: formData.insured_salary,
              pension_voluntary_rate: formData.pension_voluntary_rate,
              pay_day: formData.pay_day,
              salary_history: employee?.salary_info?.salary_history || [],
              dependents_count: formData.dependents_count,
              labor_insured_here: formData.labor_insured_here,
              health_insured_here: formData.health_insured_here,
            },
            bank_code: formData.bank_code || null,
            bank_name: formData.bank_name || null,
            bank_account_number: formData.bank_account_number || null,
            bank_account_name: formData.bank_account_name || null,
          }
        : {}

      const payload = {
        chinese_name: formData.chinese_name,
        // 5/26 William 拍板：拔「顯示名稱」欄、display_name 一律鏡像中文姓名（全站統一用中文姓名）
        display_name: formData.chinese_name,
        job_title: formData.job_title || null,
        ...(formData.avatar_url ? { avatar_url: formData.avatar_url } : {}),
        email: formData.email,
        personal_info: {
          phone: formData.phone,
          address: formData.address,
          birth_date: formData.birth_date,
          national_id: formData.id_number,
          emergency_contact: {
            name: formData.emergency_contact_name,
            relationship: formData.emergency_contact_relation,
            phone: formData.emergency_contact_phone,
            address: formData.emergency_contact_address,
          },
        },
        role_id: formData.role_id || null,
        branch_id: formData.branch_id || null,
        tourism_join_date: formData.tourism_join_date || null,
        labor_insurance_date: formData.labor_insurance_date || null,
        ...salaryPayload,
        status: 'active' as const,
      }

      if (isEditMode && employeeId) {
        try {
          await apiPatch(`/api/employees/${employeeId}`, payload)
        } catch (err) {
          if (err instanceof HttpError) {
            const body = err.body as { message?: string } | null
            throw new Error(
              body?.message || extractHttpErrorMessage(err, COMPONENT_LABELS.ERR_UPDATE_FAILED)
            )
          }
          throw err
        }
        await updateEmployee(employeeId, {} as Parameters<typeof updateEmployee>[1])
      } else {
        const defaultPassword = '12345678'
        let newEmployeeNumber: string | undefined
        try {
          const created = await apiPost<{
            success: boolean
            employee: { id: string; employee_number: string }
          }>('/api/employees/create', {
            ...payload,
            password: defaultPassword,
          })
          newEmployeeNumber = created?.employee?.employee_number
        } catch (err) {
          if (err instanceof HttpError) {
            const body = err.body as { message?: string; error?: string } | null
            throw new Error(
              body?.message || extractHttpErrorMessage(err, COMPONENT_LABELS.ERR_CREATE_FAILED)
            )
          }
          throw err
        }

        const { alert } = await import('@/lib/ui/alert-dialog')
        await alert(
          `${COMPONENT_LABELS.ALERT_NEW_EMPLOYEE_SUCCESS_PREFIX}` +
            `${COMPONENT_LABELS.ALERT_NEW_EMPLOYEE_NUMBER_PREFIX}${newEmployeeNumber}\n` +
            `${COMPONENT_LABELS.ALERT_NEW_EMPLOYEE_PASSWORD_PREFIX}${defaultPassword}` +
            `${COMPONENT_LABELS.ALERT_NEW_EMPLOYEE_FOOTER}`,
          'success',
          COMPONENT_LABELS.ALERT_NEW_EMPLOYEE_TITLE
        )
      }

      await alertSuccess(
        isEditMode ? COMPONENT_LABELS.ALERT_UPDATE_SUCCESS : COMPONENT_LABELS.ALERT_CREATE_SUCCESS
      )
      onSubmit()
    } catch (error) {
      // 把 server 回的具體訊息（譬如「email 已被使用、需聯絡管理員清孤兒」）直接顯示給用戶看、
      // 不要用固定「建立失敗 / 更新失敗」蓋掉、不然用戶根本不知道怎麼跟管理員描述問題。
      const fallback = isEditMode
        ? COMPONENT_LABELS.ALERT_UPDATE_FAILED
        : COMPONENT_LABELS.ALERT_CREATE_FAILED
      const detail = error instanceof Error && error.message ? error.message : fallback
      logger.error(isEditMode ? '更新失敗' : '建立員工失敗', error)
      await alertError(detail, isEditMode ? '更新員工失敗' : '建立員工失敗')
    } finally {
      setSubmitting(false)
    }
  }

  return {
    employee,
    isEditMode,
    submitting,
    avatarPreview,
    avatarUploading,
    fileInputRef,
    formData,
    setFormData,
    roles,
    branches,
    hrFullEnabled,
    handleAvatarChange,
    handleSubmit,
  }
}
