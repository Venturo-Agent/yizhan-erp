/**
 * 建立租戶 API（onboarding fix pack 2026-05-10）
 *
 * 功能：
 * 1. 建立 workspace（含 tax_id / is_multi_branch）
 * 2. 建立第一個系統主管 (employee + auth + profile)
 *    - 預設密碼：固定 `12345678`（William 2026-05-10 拍板、對齊教學脈絡 § B4-a）
 *    - must_change_password=true 強制改密
 * 3. 建立維度 placeholder（brands / branches）
 * 4. 把 admin 員工掛到維度 default（is_primary=true）
 * 5. Seed 基礎資料 (countries)
 *
 * 權限：需要「租戶管理」功能權限（workspace_features + role_tab_permissions）
 * DB 操作細節見 create-tenant-db.ts / create-tenant-validation.ts
 */

import { NextRequest } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { successResponse, errorResponse, ErrorCode } from '@/lib/api/response'
import { getServerAuth } from '@/lib/auth/server-auth'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { logger } from '@/lib/utils/logger'
import { translateDbError } from '@/lib/db-error-translate'
import { createApiClient } from '@/lib/supabase/api-client'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { validateCreateTenantRequest, type CreateTenantRequest } from './create-tenant-validation'
import {
  rollback,
  createWorkspace,
  createAdminEmployee,
  createAuthUser,
  linkAuthUserToEmployee,
  type TenantCreationState,
} from './create-tenant-db'
import {
  seedRolesAndCapabilities,
  seedWorkspaceFeatures,
  createDimensions,
  linkEmployeeToDimensions,
  seedCountriesFromCorner,
} from './create-tenant-seed'

/**
 * 新建 workspace 系統主管的預設密碼。
 *
 * 2026-05-10 William 拍板：固定 `12345678`、不再用 `{CODE}-{TAX_ID}` 公式。
 * - 對齊教學脈絡 § B4-a：系統預設值、不是 bug、不是安全漏洞
 * - 配合 must_change_password=true、首次登入強制改密、不會留弱密碼在線
 * - 長度 8 字元、剛好滿足 resetEmployeePasswordSchema min(8) 規範
 */
const DEFAULT_ADMIN_PASSWORD = '12345678'

export async function POST(request: NextRequest) {
  try {
    // 🔒 權限檢查：必須登入 + 有 workspaces.write capability
    // 跟其他 workspace CRUD 對齊（如 DELETE /api/workspaces/[id]）、不再用 workspace_roles.is_admin
    // 鐵律：系統內沒有 user 特權、訪問控制只走 role_capabilities + workspace_features
    const auth = await getServerAuth()
    if (!auth.success) {
      return errorResponse('請先登入', 401, ErrorCode.UNAUTHORIZED)
    }

    const guard = await requireCapability(CAPABILITIES.WORKSPACES_WRITE)
    if (!guard.ok) {
      return guard.response
    }

    // audit context（追蹤誰建租戶）
    const auditClient = await createApiClient()
    await recordApiAuditContext(auditClient, {
      actorId: guard.employeeId,
      reason: '建立租戶（onboarding）',
    })

    const supabaseAdmin = getSupabaseAdminClient()

    // 查詢當前員工資訊（後續 logging 用）
    const { data: currentEmployee, error: currentEmpError } = await supabaseAdmin
      .from('employees')
      .select('workspace_id, chinese_name, english_name, display_name, email, role_id, job_info')
      .eq('id', auth.data.employeeId)
      .single()

    logger.log(
      `Employee query: id=${auth.data.employeeId}, data=${JSON.stringify(currentEmployee)}, error=${currentEmpError?.message}`
    )

    if (!currentEmployee || !currentEmployee.workspace_id) {
      logger.error('Employee not found or no workspace')
      return errorResponse('找不到員工資料', 403, ErrorCode.FORBIDDEN)
    }

    // 解析請求
    const body = (await request.json()) as CreateTenantRequest
    const {
      workspaceCode: rawWorkspaceCode,
      taxId,
      industry,
      subIndustry,
      brands,
      isMultiBranch,
      branches,
      adminEmployeeNumber,
      adminName,
      adminEmail,
      subscriptionPlan,
      advancePicks,
      optionalFeatures,
    } = body

    const newWorkspaceCode = (rawWorkspaceCode || '').toUpperCase().trim()
    const trimmedTaxId = (taxId || '').trim()

    // 驗證欄位
    const validationError = validateCreateTenantRequest(body, newWorkspaceCode, trimmedTaxId)
    if (validationError) return validationError

    // 檢查 workspace code 是否已存在
    const { data: existingWorkspace } = await supabaseAdmin
      .from('workspaces')
      .select('id')
      .eq('code', newWorkspaceCode)
      .single()

    if (existingWorkspace) {
      return errorResponse('公司代號已存在', 400, ErrorCode.VALIDATION_ERROR)
    }

    logger.log(`Creating tenant: ${newWorkspaceCode} (${body.workspaceName})`)

    // 預設密碼固定 `12345678`（William 2026-05-10 拍板、不從 client 傳）
    const adminPassword = DEFAULT_ADMIN_PASSWORD

    // ========== 開始建立租戶（原子性：任何 critical 步驟失敗、一律 rollback） ==========

    // 追蹤已建立資源、失敗時反向清理
    const state: TenantCreationState = {
      createdWorkspaceId: null,
      createdEmployeeId: null,
      createdAuthUserId: null,
    }

    // 1. 建立 workspace
    const wsResult = await createWorkspace(supabaseAdmin, {
      workspaceName: body.workspaceName,
      newWorkspaceCode,
      maxEmployees: body.maxEmployees,
      trimmedTaxId,
      isMultiBranch,
      subscriptionPlan: subscriptionPlan ?? 'custom',
      industry: industry ?? null,
      subIndustry: subIndustry ?? null,
    })
    if ('status' in wsResult) return wsResult
    state.createdWorkspaceId = wsResult.workspaceId

    // 2. 建立第一個系統主管 (employee)
    const empResult = await createAdminEmployee(supabaseAdmin, {
      workspaceId: wsResult.workspaceId,
      adminEmployeeNumber,
      adminName,
      adminEmail,
    })
    if ('status' in empResult) {
      await rollback(supabaseAdmin, state, 'employee creation failed')
      return empResult
    }
    state.createdEmployeeId = empResult.employeeId

    // 3. 建立 Supabase Auth 帳號
    const authResult = await createAuthUser(supabaseAdmin, {
      workspaceId: wsResult.workspaceId,
      employeeId: empResult.employeeId,
      newWorkspaceCode,
      adminEmployeeNumber,
      adminEmail,
      adminPassword,
    })
    if ('status' in authResult) {
      await rollback(supabaseAdmin, state, 'auth user creation failed')
      return authResult
    }
    state.createdAuthUserId = authResult.authUserId

    // 4. 更新 employee.user_id（登入綁定）
    const linkError = await linkAuthUserToEmployee(
      supabaseAdmin,
      empResult.employeeId,
      authResult.authUserId
    )
    if (linkError) {
      await rollback(supabaseAdmin, state, 'user_id link failed')
      return linkError
    }

    // 5–6. 建立預設職務 + 從 Corner 複製 role_capabilities
    const rolesError = await seedRolesAndCapabilities(supabaseAdmin, {
      workspaceId: wsResult.workspaceId,
      employeeId: empResult.employeeId,
    })
    if (rolesError) {
      await rollback(supabaseAdmin, state, 'roles/capabilities seeding failed')
      return rolesError
    }

    // 7. 建立預設 workspace_features（依所選方案 + 現場勾選的可選功能配置）
    const featuresError = await seedWorkspaceFeatures(
      supabaseAdmin,
      wsResult.workspaceId,
      subscriptionPlan ?? 'custom',
      advancePicks,
      optionalFeatures
    )
    if (featuresError) {
      await rollback(supabaseAdmin, state, 'workspace_features insert failed')
      return featuresError
    }

    // 8. 建立維度 placeholder
    const dimsResult = await createDimensions(supabaseAdmin, {
      workspaceId: wsResult.workspaceId,
      workspaceName: body.workspaceName,
      workspaceTaxId: trimmedTaxId,
      newWorkspaceCode,
      brands,
      isMultiBranch,
      branches,
    })
    if ('status' in dimsResult) {
      await rollback(supabaseAdmin, state, 'dimensions insert failed')
      return dimsResult
    }

    // 9. 把 admin 員工掛到維度 default（soft fail）
    await linkEmployeeToDimensions(supabaseAdmin, empResult.employeeId, dimsResult)

    // ========== 以下為 soft 步驟：失敗不 rollback（影響小、可事後補） ==========

    await seedCountriesFromCorner(supabaseAdmin, wsResult.workspaceId)

    // 寫入初始配額 log（新增租戶時記錄首次設定值）
    // workspace_employee_quota_logs 是新表、typegen 尚未 regen，cast 繞過
    if (body.maxEmployees != null) {
      const { error: quotaLogError } = await (
        supabaseAdmin as unknown as {
          from: (t: string) => {
            insert: (row: Record<string, unknown>) => Promise<{ error: { message: string } | null }>
          }
        }
      )
        .from('workspace_employee_quota_logs')
        .insert({
          workspace_id: wsResult.workspaceId,
          changed_by: guard.employeeId,
          old_quota: null,
          new_quota: body.maxEmployees,
          reason: '初始建立',
        })

      if (quotaLogError) {
        logger.warn('quota log insert failed (non-critical):', quotaLogError.message)
      }
    }

    logger.log(`Tenant created successfully: ${newWorkspaceCode}`)

    // 返回登入資訊（密碼僅顯示一次、log 不存原始值）
    return successResponse({
      workspace: {
        id: wsResult.workspaceId,
        code: newWorkspaceCode,
        name: body.workspaceName,
      },
      admin: {
        employee_id: empResult.employeeId,
        employee_number: adminEmployeeNumber,
      },
      login: {
        workspaceCode: newWorkspaceCode,
        employeeNumber: adminEmployeeNumber,
        email: authResult.resolvedEmail,
        password: adminPassword,
        password_one_time_only: true,
        password_formula: 'fixed:12345678',
      },
    })
  } catch (error) {
    logger.error('Failed to create tenant:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    const t = translateDbError(error)
    return errorResponse(t.message, t.httpStatus, ErrorCode.INTERNAL_ERROR)
  }
}
