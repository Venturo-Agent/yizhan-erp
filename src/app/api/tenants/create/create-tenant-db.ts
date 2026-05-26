/**
 * create-tenant-db — 建立租戶核心 DB 操作（Steps 1–4 + rollback）
 *
 * 從 route.ts 抽出：
 * - TenantCreationState / rollback（反向清理）
 * - Step 1：建立 workspace
 * - Step 2：建立第一個系統主管 (employee)
 * - Step 3：建立 Supabase Auth 帳號
 * - Step 4：更新 employee.user_id（登入綁定）
 *
 * Steps 5–9 + countries seed 見 create-tenant-seed.ts
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { errorResponse, ErrorCode } from '@/lib/api/response'
import { logger } from '@/lib/utils/logger'
import { translateDbError } from '@/lib/db-error-translate'
import type { PlanId } from '@/lib/permissions/subscription-plans'

// =========================================================================
// Rollback 相關型別
// =========================================================================

export interface TenantCreationState {
  createdWorkspaceId: string | null
  createdEmployeeId: string | null
  createdAuthUserId: string | null
}

export async function rollback(
  supabaseAdmin: SupabaseClient,
  state: TenantCreationState,
  reason: string
): Promise<void> {
  logger.warn(`Rolling back tenant creation: ${reason}`)
  const { createdWorkspaceId, createdEmployeeId, createdAuthUserId } = state

  // 順序很關鍵：employees.user_id → auth.users 是 ON DELETE RESTRICT、
  // 所以 auth user 必須在 employee 被刪掉「之後」才能刪、否則 FK 擋住、
  // auth user 留成孤兒、下次拿同 email 建租戶會被「email 已被使用」擋。
  // 過去（2026-05-17 之前）寫的順序剛好相反、踩過這坑、現在按依賴方向重排：
  //   role_capabilities → workspace_roles → features → 維度 → employees → auth user → workspace
  if (createdWorkspaceId) {
    const { data: wsRoles } = await supabaseAdmin
      .from('workspace_roles')
      .select('id')
      .eq('workspace_id', createdWorkspaceId)
    const wsRoleIds = (wsRoles ?? []).map((r: { id: string }) => r.id)
    if (wsRoleIds.length > 0) {
      await supabaseAdmin.from('role_capabilities').delete().in('role_id', wsRoleIds)
    }
    await supabaseAdmin.from('workspace_roles').delete().eq('workspace_id', createdWorkspaceId)
    await supabaseAdmin.from('workspace_features').delete().eq('workspace_id', createdWorkspaceId)
    // 維度 placeholder（brands / branches）
    await supabaseAdmin.from('brands').delete().eq('workspace_id', createdWorkspaceId)
    await supabaseAdmin.from('branches').delete().eq('workspace_id', createdWorkspaceId)
  }
  if (createdEmployeeId) {
    const { error } = await supabaseAdmin.from('employees').delete().eq('id', createdEmployeeId)
    if (error) logger.error('Rollback delete employee failed:', error)
  }
  if (createdAuthUserId) {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId)
    if (error) logger.error('Rollback deleteUser failed:', error)
  }
  if (createdWorkspaceId) {
    const { error } = await supabaseAdmin.from('workspaces').delete().eq('id', createdWorkspaceId)
    if (error) logger.error('Rollback delete workspace failed:', error)
  }
}

// =========================================================================
// Step 1：建立 workspace
// =========================================================================

export interface CreateWorkspaceParams {
  workspaceName: string
  newWorkspaceCode: string
  maxEmployees: number | null
  trimmedTaxId: string
  isMultiBranch: boolean
  subscriptionPlan?: PlanId
  industry?: string | null
  subIndustry?: string | null
}

export async function createWorkspace(
  supabaseAdmin: SupabaseClient,
  params: CreateWorkspaceParams
): Promise<ReturnType<typeof errorResponse> | { workspaceId: string }> {
  const {
    workspaceName,
    newWorkspaceCode,
    maxEmployees,
    trimmedTaxId,
    isMultiBranch,
    subscriptionPlan,
    industry,
    subIndustry,
  } = params

  // 鐵律：不寫 type 欄位（workspaces.type 已在 Phase 2 patch DROP、code 不可再 reference）
  const { data: workspace, error: wsError } = await supabaseAdmin
    .from('workspaces')
    .insert({
      name: workspaceName,
      code: newWorkspaceCode,
      max_employees: maxEmployees ?? null,
      is_active: true,
      premium_enabled: false,
      tax_id: trimmedTaxId,
      is_multi_branch: !!isMultiBranch,
      subscription_plan: subscriptionPlan ?? 'custom',
      industry: industry ?? null,
      sub_industry: subIndustry ?? null,
    })
    .select('id')
    .single()

  if (wsError || !workspace) {
    logger.error('Failed to create workspace:', JSON.stringify(wsError))
    const t = translateDbError(wsError)
    return errorResponse(t.message, t.httpStatus, ErrorCode.OPERATION_FAILED)
  }

  logger.log(`Workspace created: ${workspace.id}`)
  return { workspaceId: workspace.id }
}

// =========================================================================
// Step 2：建立第一個系統主管 (employee)
// =========================================================================

export interface CreateAdminEmployeeParams {
  workspaceId: string
  adminEmployeeNumber: string
  adminName: string
  adminEmail: string
}

export async function createAdminEmployee(
  supabaseAdmin: SupabaseClient,
  params: CreateAdminEmployeeParams
): Promise<ReturnType<typeof errorResponse> | { employeeId: string }> {
  const { workspaceId, adminEmployeeNumber, adminName, adminEmail } = params

  // role_id 暫時 null、後面建完 workspace_roles 再 update
  // employees 表沒有 'roles' text[] 欄位、不能寫
  const { data: employee, error: empError } = await supabaseAdmin
    .from('employees')
    .insert({
      workspace_id: workspaceId,
      employee_number: adminEmployeeNumber,
      chinese_name: adminName,
      display_name: adminName,
      email: adminEmail?.toLowerCase() || null,
      must_change_password: true,
    })
    .select('id')
    .single()

  if (empError || !employee) {
    logger.error('Failed to create employee:', empError)
    return errorResponse('建立系統主管失敗', 500, ErrorCode.OPERATION_FAILED)
  }

  logger.log(`Employee created: ${employee.id}`)
  return { employeeId: employee.id }
}

// =========================================================================
// Step 3：建立 Supabase Auth 帳號
// =========================================================================

export interface CreateAuthUserParams {
  workspaceId: string
  employeeId: string
  newWorkspaceCode: string
  adminEmployeeNumber: string
  adminEmail: string
  adminPassword: string
}

export async function createAuthUser(
  supabaseAdmin: SupabaseClient,
  params: CreateAuthUserParams
): Promise<ReturnType<typeof errorResponse> | { authUserId: string; resolvedEmail: string }> {
  const {
    workspaceId,
    employeeId,
    newWorkspaceCode,
    adminEmployeeNumber,
    adminEmail,
    adminPassword,
  } = params

  const authEmail =
    adminEmail?.toLowerCase() ||
    `${newWorkspaceCode.toLowerCase()}_${adminEmployeeNumber.toLowerCase()}@venturo.com`

  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: authEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: {
      workspace_id: workspaceId,
      employee_id: employeeId,
      workspace_code: newWorkspaceCode,
    },
  })

  if (authError || !authUser?.user) {
    logger.error('Failed to create auth user:', authError)
    const msg = authError?.message || ''
    const userMsg = msg.includes('already been registered')
      ? `此 email（${authEmail}）已被其他帳號使用、請換一個`
      : `建立系統主管登入帳號失敗：${msg || 'unknown'}`
    return errorResponse(userMsg, 400, ErrorCode.OPERATION_FAILED)
  }

  return { authUserId: authUser.user.id, resolvedEmail: authEmail }
}

// =========================================================================
// Step 4：更新 employee.user_id（登入綁定）
// =========================================================================

export async function linkAuthUserToEmployee(
  supabaseAdmin: SupabaseClient,
  employeeId: string,
  authUserId: string
): Promise<ReturnType<typeof errorResponse> | null> {
  const { error: linkError } = await supabaseAdmin
    .from('employees')
    .update({ user_id: authUserId })
    .eq('id', employeeId)

  if (linkError) {
    logger.error('Failed to link auth user to employee:', linkError)
    return errorResponse('綁定登入帳號失敗、請稍後重試', 500, ErrorCode.OPERATION_FAILED)
  }

  logger.log(`Auth user ${authUserId} linked to employee ${employeeId}`)
  return null
}
