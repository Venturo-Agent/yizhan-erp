/**
 * create-tenant-seed — 建立租戶 Seed 操作（Steps 5–9 + countries）
 *
 * 從 create-tenant-db.ts 再抽出：
 * - Step 5–6：建立預設職務 + 從 Corner 複製 role_capabilities
 * - Step 7：建立預設 workspace_features
 * - Step 8：建立三維 placeholder（brands / branches / departments）
 * - Step 9：把 admin 員工掛到三維 default（soft fail）
 * - Soft：從 Corner 複製基礎資料（countries）
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { errorResponse, ErrorCode } from '@/lib/api/response'
import { logger } from '@/lib/utils/logger'
import { MODULES } from '@/lib/permissions/module-tabs'
import type { BrandPayload } from './create-tenant-validation'

// onboarding fix pack 2026-05-10：brands / branches / departments / employee_* 三維表
// Supabase Database type 還沒 regenerate，先 cast 為 any 暫避型別衝突
// migration apply 後跑 `supabase gen types` 即可拔掉
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any

// Corner workspace 當全站職務模板的來源。
// 2026-05-16 QDF R40：env 優先、fallback 保留歷史值
const CORNER_WORKSPACE_ID =
  process.env.PLATFORM_WORKSPACE_ID || '8ef05a74-1f87-48ab-afd3-9bfeb423935d'

// 4 角色對齊 William 03:55 拍板：管理員（系統主管） / 業務 / 助理 / 會計 / 團控
const DEFAULT_ROLE_NAMES = ['系統主管', '業務', '會計', '助理', '團控'] as const

// =========================================================================
// Steps 5–6：建立預設職務 + 從 Corner 複製 role_capabilities
// =========================================================================

export interface SeedRolesAndCapsParams {
  workspaceId: string
  employeeId: string
}

export async function seedRolesAndCapabilities(
  supabaseAdmin: SupabaseClient,
  params: SeedRolesAndCapsParams
): Promise<ReturnType<typeof errorResponse> | null> {
  const { workspaceId, employeeId } = params

  // 5. 建立預設職務
  const { data: createdRoles, error: rolesError } = await supabaseAdmin
    .from('workspace_roles')
    .insert(
      DEFAULT_ROLE_NAMES.map((name, idx) => ({
        workspace_id: workspaceId,
        name,
        is_admin: name === '系統主管',
        sort_order: idx + 1,
      }))
    )
    .select('id, name')

  if (rolesError || !createdRoles) {
    logger.error('Failed to create default roles:', rolesError)
    return errorResponse('建立預設職務失敗', 500, ErrorCode.OPERATION_FAILED)
  }

  logger.log(`Default roles created: ${createdRoles.length}`)

  const adminRole = createdRoles.find((r: { id: string; name: string }) => r.name === '系統主管')
  if (!adminRole) {
    return errorResponse('建立系統主管職務失敗', 500, ErrorCode.OPERATION_FAILED)
  }

  const { error: setRoleError } = await supabaseAdmin
    .from('employees')
    .update({ role_id: adminRole.id })
    .eq('id', employeeId)

  if (setRoleError) {
    logger.error('Failed to set admin role_id:', setRoleError)
    return errorResponse('綁定系統主管職務失敗', 500, ErrorCode.OPERATION_FAILED)
  }

  // 6. 從 Corner 模板複製 role_capabilities
  // 注意：'團控' 是新增的角色、Corner 可能還沒有、capability 數會偏少；fallback：直接給空（後續 William 手動補）
  const { data: cornerRoles, error: cornerRolesError } = await supabaseAdmin
    .from('workspace_roles')
    .select('id, name')
    .eq('workspace_id', CORNER_WORKSPACE_ID)
    .in('name', DEFAULT_ROLE_NAMES as unknown as string[])

  if (cornerRolesError) {
    logger.error('Corner template roles query failed:', cornerRolesError)
    return errorResponse('讀取權限模板失敗', 500, ErrorCode.OPERATION_FAILED)
  }

  if (!cornerRoles || cornerRoles.length === 0) {
    logger.warn(
      'Corner template has no matching roles; new tenant will have empty role_capabilities besides 系統主管 全開'
    )
  }

  const cornerRoleIds = (cornerRoles ?? []).map((r: { id: string }) => r.id)

  const { data: cornerCaps, error: cornerCapsError } =
    cornerRoleIds.length > 0
      ? await supabaseAdmin
          .from('role_capabilities')
          .select('role_id, capability_code, enabled')
          .in('role_id', cornerRoleIds)
          .eq('enabled', true)
      : {
          data: [] as { role_id: string; capability_code: string; enabled: boolean }[],
          error: null,
        }

  if (cornerCapsError) {
    logger.error('Failed to read corner capabilities:', cornerCapsError)
    return errorResponse('讀取權限模板失敗', 500, ErrorCode.OPERATION_FAILED)
  }

  const cornerRoleNameById = new Map(
    (cornerRoles ?? []).map((r: { id: string; name: string }) => [r.id, r.name])
  )
  const newRoleIdByName = new Map(
    createdRoles.map((r: { id: string; name: string }) => [r.name, r.id])
  )

  // 系統主管 → 全開（複製 MODULES 全部、不依賴 Corner）
  // 鐵律：不開 platform.is_admin（已廢）、跨 workspace 能力靠 workspace_features 控制、不靠 user 特權
  const adminCapabilityCodes = new Set<string>()
  MODULES.forEach(module => {
    if (module.tabs.length === 0) {
      adminCapabilityCodes.add(`${module.code}.read`)
      adminCapabilityCodes.add(`${module.code}.write`)
    } else {
      module.tabs.forEach(tab => {
        adminCapabilityCodes.add(`${module.code}.${tab.code}.read`)
        adminCapabilityCodes.add(`${module.code}.${tab.code}.write`)
      })
    }
  })

  const adminCapRows = Array.from(adminCapabilityCodes).map(code => ({
    role_id: adminRole.id,
    capability_code: code,
    enabled: true,
  }))

  // 其他職務（業務 / 會計 / 助理 / 團控）→ 從 Corner 複製
  const otherCaps = (cornerCaps ?? [])
    .map((cp: { role_id: string; capability_code: string; enabled: boolean }) => {
      const roleName = cornerRoleNameById.get(cp.role_id)
      if (!roleName || roleName === '系統主管') return null // 系統主管已從 MODULES 全開
      const newRoleId = newRoleIdByName.get(roleName)
      if (!newRoleId) return null
      return { role_id: newRoleId, capability_code: cp.capability_code, enabled: true }
    })
    .filter(
      (
        p: { role_id: string; capability_code: string; enabled: boolean } | null
      ): p is NonNullable<typeof p> => p !== null
    )

  const allCapsToInsert = [...adminCapRows, ...otherCaps]
  if (allCapsToInsert.length > 0) {
    const { error: capError } = await supabaseAdmin
      .from('role_capabilities')
      .insert(allCapsToInsert)
    if (capError) {
      logger.error('Failed to seed capabilities:', capError)
      return errorResponse('複製權限模板失敗', 500, ErrorCode.OPERATION_FAILED)
    }
    logger.log(`Capabilities seeded: admin=${adminCapRows.length}, others=${otherCaps.length}`)
  }

  return null
}

// =========================================================================
// Step 7：建立預設 workspace_features
// =========================================================================

export async function seedWorkspaceFeatures(
  supabaseAdmin: SupabaseClient,
  workspaceId: string
): Promise<ReturnType<typeof errorResponse> | null> {
  const freeFeatures = [
    'dashboard',
    'calendar',
    'workspace',
    'todos',
    'tours',
    'orders',
    'quotes',
    'finance',
    'database',
    'hr',
    'settings',
    'customers',
    'itinerary',
  ]
  const premiumFeatures = ['accounting', 'office']
  const defaultFeatures = [
    ...freeFeatures.map(code => ({ feature_code: code, enabled: true })),
    ...premiumFeatures.map(code => ({ feature_code: code, enabled: false })),
  ]

  const enabledModules = new Set(freeFeatures)
  const tabFeatures: { feature_code: string; enabled: boolean }[] = []
  for (const m of MODULES) {
    for (const t of m.tabs) {
      if (t.isEligibility) continue
      const key = `${m.code}.${t.code}`
      const enabled = enabledModules.has(m.code) && t.category !== 'premium'
      tabFeatures.push({ feature_code: key, enabled })
    }
  }

  const featuresToInsert = [
    ...defaultFeatures.map(f => ({
      workspace_id: workspaceId,
      feature_code: f.feature_code,
      enabled: f.enabled,
    })),
    ...tabFeatures.map(f => ({
      workspace_id: workspaceId,
      feature_code: f.feature_code,
      enabled: f.enabled,
    })),
  ]

  const { error: featuresError } = await supabaseAdmin
    .from('workspace_features')
    .insert(featuresToInsert)

  if (featuresError) {
    logger.error('Failed to create workspace features:', featuresError)
    return errorResponse('建立功能開關失敗', 500, ErrorCode.OPERATION_FAILED)
  }

  logger.log(`Workspace features created: ${defaultFeatures.length}`)
  return null
}

// =========================================================================
// Step 8：建立三維 placeholder（brands / branches / departments）
// =========================================================================

export interface CreateDimensionsParams {
  workspaceId: string
  workspaceName: string
  newWorkspaceCode: string
  brands: BrandPayload[]
  isMultiBranch: boolean
  branches: BrandPayload[] | undefined
  isMultiDepartment: boolean
  departments: BrandPayload[] | undefined
}

export interface DimensionIds {
  defaultBrandId: string | undefined
  defaultBranchId: string | undefined
  defaultDeptId: string | undefined
}

export async function createDimensions(
  supabaseAdmin: SupabaseClient,
  params: CreateDimensionsParams
): Promise<ReturnType<typeof errorResponse> | DimensionIds> {
  const {
    workspaceId,
    workspaceName,
    newWorkspaceCode,
    brands,
    isMultiBranch,
    branches,
    isMultiDepartment,
    departments,
  } = params
  const supaAny = supabaseAdmin as unknown as SupabaseAny

  // brands：空陣列 → seed default（用 workspace name + code、單品牌情境）
  const brandSource: BrandPayload[] =
    brands.length === 0 ? [{ code: newWorkspaceCode, name: workspaceName }] : brands
  const brandRows = brandSource.map((b: BrandPayload, idx: number) => ({
    workspace_id: workspaceId,
    code: (b.code?.trim() || `B${idx + 1}`).toUpperCase(),
    name: b.name.trim(),
    is_default: idx === 0,
    display_order: idx,
  }))
  const { data: insertedBrands, error: brandError } = await supaAny
    .from('brands')
    .insert(brandRows)
    .select('id, is_default')

  if (brandError || !insertedBrands) {
    logger.error('Failed to create brands:', brandError)
    return errorResponse('建立品牌失敗', 500, ErrorCode.OPERATION_FAILED)
  }

  const defaultBrandId = (insertedBrands as Array<{ id: string; is_default: boolean }>).find(
    b => b.is_default
  )?.id

  // branches：勾「多分公司」依 onboarding 填、否則建 placeholder「總部」
  const branchSource: BrandPayload[] =
    isMultiBranch && branches?.length ? branches : [{ code: 'HQ', name: '總部' }]
  const branchRows = branchSource.map((br: BrandPayload, idx: number) => ({
    workspace_id: workspaceId,
    code: (br.code?.trim() || `BR${idx + 1}`).toUpperCase(),
    name: br.name.trim(),
    is_default: idx === 0,
    display_order: idx,
  }))
  const { data: insertedBranches, error: branchError } = await supaAny
    .from('branches')
    .insert(branchRows)
    .select('id, is_default')

  if (branchError || !insertedBranches) {
    logger.error('Failed to create branches:', branchError)
    return errorResponse('建立分公司失敗', 500, ErrorCode.OPERATION_FAILED)
  }

  const defaultBranchId = (insertedBranches as Array<{ id: string; is_default: boolean }>).find(
    b => b.is_default
  )?.id

  // 沒 default branch 就不能建 default dept（schema 強制 branch_id NOT NULL）
  if (!defaultBranchId) {
    return errorResponse('建立預設分公司失敗、無法後續建立部門', 500, ErrorCode.OPERATION_FAILED)
  }

  // departments：勾「多部門」依 onboarding 填、否則建 placeholder「總公司」
  // 所有 default seed 部門都掛在 default branch 底下（2026-05-14 起 branch_id 必填）
  const departmentSource: BrandPayload[] =
    isMultiDepartment && departments?.length ? departments : [{ code: 'MAIN', name: '總公司' }]
  const deptRows = departmentSource.map((d: BrandPayload, idx: number) => ({
    workspace_id: workspaceId,
    branch_id: defaultBranchId,
    code: (d.code?.trim() || `D${idx + 1}`).toUpperCase(),
    name: d.name.trim(),
    is_default: idx === 0,
    display_order: idx,
  }))
  const { data: insertedDepts, error: deptError } = await supaAny
    .from('departments')
    .insert(deptRows)
    .select('id, is_default')

  if (deptError || !insertedDepts) {
    logger.error('Failed to create departments:', deptError)
    return errorResponse('建立部門失敗', 500, ErrorCode.OPERATION_FAILED)
  }

  const defaultDeptId = (insertedDepts as Array<{ id: string; is_default: boolean }>).find(
    d => d.is_default
  )?.id

  return { defaultBrandId, defaultBranchId, defaultDeptId }
}

// =========================================================================
// Step 9：把 admin 員工掛到三維 default（soft fail）
// =========================================================================

export async function linkEmployeeToDimensions(
  supabaseAdmin: SupabaseClient,
  employeeId: string,
  dims: DimensionIds
): Promise<void> {
  const { defaultBrandId, defaultBranchId, defaultDeptId } = dims
  if (!defaultBrandId || !defaultBranchId || !defaultDeptId) return

  const supaAny = supabaseAdmin as unknown as SupabaseAny

  const empBrandResult = await supaAny
    .from('employee_brands')
    .insert({ employee_id: employeeId, brand_id: defaultBrandId, is_primary: true })
  const empBranchResult = await supaAny
    .from('employee_branches')
    .insert({ employee_id: employeeId, branch_id: defaultBranchId, is_primary: true })
  const empDeptResult = await supaAny
    .from('employee_departments')
    .insert({ employee_id: employeeId, department_id: defaultDeptId, is_primary: true })

  // soft fail：不 rollback、log 即可（trigger 會接手 fallback）
  if (empBrandResult.error)
    logger.warn('employee_brands insert failed (non-fatal):', empBrandResult.error)
  if (empBranchResult.error)
    logger.warn('employee_branches insert failed (non-fatal):', empBranchResult.error)
  if (empDeptResult.error)
    logger.warn('employee_departments insert failed (non-fatal):', empDeptResult.error)
}

// =========================================================================
// Soft step：從 Corner 複製基礎資料（countries）
// =========================================================================

export async function seedCountriesFromCorner(
  supabaseAdmin: SupabaseClient,
  workspaceId: string
): Promise<void> {
  try {
    const { data: cornerCountries } = await supabaseAdmin
      .from('countries')
      .select(
        'id, code, name, name_en, region, workspace_id, usage_count, emoji, has_regions, is_active, display_order'
      )
      .eq('workspace_id', CORNER_WORKSPACE_ID)
    if (cornerCountries && cornerCountries.length > 0) {
      const newCountries = cornerCountries.map((c: Record<string, unknown>) => ({
        ...c,
        id: crypto.randomUUID(),
        workspace_id: workspaceId,
        usage_count: 0,
      }))
      await supabaseAdmin.from('countries').insert(newCountries)
      logger.log(`Seeded ${newCountries.length} countries`)
    }
  } catch (seedError) {
    logger.warn('Failed to seed base data:', seedError)
  }
}
