/**
 * API 層權限檢查
 *
 * 資料源：role_capabilities 表
 * 介面：(employeeId, {module, tab, action})
 */

import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { CAPABILITIES } from '@/lib/permissions/capabilities'

/**
 * 把舊三元組翻譯成 capability code 字串
 *   tab 為 null → "{module}.{action}"
 *   tab 不為 null → "{module}.{tab}.{action}"
 */
function toCapabilityCode(capability: {
  module: string
  tab: string | null
  action: 'read' | 'write'
}): string {
  const { module, tab, action } = capability
  return tab ? `${module}.${tab}.${action}` : `${module}.${action}`
}

/**
 * 檢查員工是否擁有某個權限資格
 */
export async function checkCapability(
  employeeId: string,
  capability: { module: string; tab: string | null; action: 'read' | 'write' }
): Promise<boolean> {
  const adminClient = getSupabaseAdminClient()

  const { data: employee, error: empError } = await adminClient
    .from('employees')
    .select('role_id')
    .eq('id', employeeId)
    .single()

  if (empError || !employee) return false

  const roleId = (employee as { role_id?: string | null }).role_id
  if (!roleId) return false

  const code = toCapabilityCode(capability)

  const { data, error } = await adminClient
    .from('role_capabilities')
    .select('enabled')
    .eq('role_id', roleId)
    .eq('capability_code', code)
    .eq('enabled', true)
    .maybeSingle()

  if (error) return false
  return data !== null
}

/**
 * 直接用 capability code 字串檢查（新 caller 用這個）
 */
export async function hasCapabilityByCode(employeeId: string, code: string): Promise<boolean> {
  const adminClient = getSupabaseAdminClient()

  const { data: employee, error: empError } = await adminClient
    .from('employees')
    .select('role_id')
    .eq('id', employeeId)
    .single()

  if (empError || !employee) return false

  const roleId = (employee as { role_id?: string | null }).role_id
  if (!roleId) return false

  const { data, error } = await adminClient
    .from('role_capabilities')
    .select('enabled')
    .eq('role_id', roleId)
    .eq('capability_code', code)
    .eq('enabled', true)
    .maybeSingle()

  if (error) return false
  return data !== null
}

/**
 * canManageRoles：等價於「能寫 hr.roles」（系統主管才能）
 * 即擁有 hr.roles.write capability 的員工才能管理角色。
 */
export async function canManageRoles(employeeId: string): Promise<boolean> {
  return hasCapabilityByCode(employeeId, CAPABILITIES.HR_MANAGE_ROLES)
}

/** @deprecated 改用 canManageRoles */
export const hasAdminCapability = canManageRoles
