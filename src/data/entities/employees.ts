'use client'

/**
 * Employees Entity
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { Employee } from '@/stores/types'

const employeeEntity = createEntityHook<Employee>('employees', {
  list: {
    // 2026-05-15 對齊 DB schema：
    // - 砍 last_login_at（DB 沒這欄）
    // - 補 role_id / personal_info / job_info / salary_info / attendance / contracts
    // - 補 branch_id / accessible_branch_ids（branch scope；2026-05-18 department_id column 已 DROP）
    // - 補 bank_code / bank_name / bank_account_number / bank_account_name（代墊人對方銀行）
    // - 補 job_title / pinyin / birthday / employee_type / hidden_menu_items
    // - 補 終止 / 鎖定 / created_by
    // - 不 select password_hash / amadeus_totp_secret（敏感）
    select:
      'id,employee_number,display_name,chinese_name,english_name,email,avatar_url,birth_date,id_number,status,monthly_salary,user_id,must_change_password,workspace_id,created_at,created_by,updated_at,updated_by,role_id,personal_info,job_info,salary_info,attendance,contracts,branch_id,accessible_branch_ids,bank_code,bank_name,bank_account_number,bank_account_name,job_title,pinyin,birthday,employee_type,hidden_menu_items,login_failed_count,login_locked_until,terminated_at,terminated_by',
    orderBy: { column: 'employee_number', ascending: true },
    filterSoftDeleted: true,
  },
  slim: {
    // employee_type 必選：ChannelsSidebar 等過濾 bot / system_bot / integration 時依賴此欄
    // role_id 必選：useEmployeesWithCapability 依職務能力過濾指派候選池（5/24 純角色 SSOT）
    select:
      'id,employee_number,display_name,chinese_name,english_name,email,status,workspace_id,avatar_url,employee_type,role_id',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.low,
  workspaceScoped: true, // 員工按 workspace 隔離
})

export const useEmployees = employeeEntity.useList
export const useEmployeesSlim = employeeEntity.useListSlim
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const useEmployee = employeeEntity.useDetail
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const useEmployeesPaginated = employeeEntity.usePaginated
export const useEmployeeDictionary = employeeEntity.useDictionary

const _createEmployee = employeeEntity.create
const _updateEmployee = employeeEntity.update
const _deleteEmployee = employeeEntity.delete
const _invalidateEmployees = employeeEntity.invalidate
