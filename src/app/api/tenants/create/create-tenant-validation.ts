/**
 * create-tenant-validation — 建立租戶請求驗證
 *
 * 從 route.ts 抽出：欄位格式 / 必填 / 類型驗證。
 */

import { errorResponse, ErrorCode } from '@/lib/api/response'
import type { PlanId, AdvancePickId } from '@/lib/permissions/subscription-plans'

export interface BrandPayload {
  code: string
  name: string
}

export interface CreateTenantRequest {
  // Workspace 資訊
  workspaceName: string
  workspaceCode: string
  workspaceType: string | null
  maxEmployees: number | null
  taxId: string // 8 碼公司統編、必填

  // 三維 onboarding
  brands: BrandPayload[] // 至少 1 筆
  isMultiBranch: boolean
  branches?: BrandPayload[] // isMultiBranch=true 才需要
  isMultiDepartment: boolean
  departments?: BrandPayload[]

  // 訂閱方案
  subscriptionPlan?: PlanId
  advancePicks?: AdvancePickId[]

  // 第一個系統主管資訊
  adminEmployeeNumber: string
  adminName: string
  adminEmail: string
}

/**
 * 驗證 CreateTenantRequest 欄位。
 * 回傳 errorResponse（失敗）或 null（通過）。
 */
export function validateCreateTenantRequest(
  body: CreateTenantRequest,
  newWorkspaceCode: string,
  trimmedTaxId: string
): ReturnType<typeof errorResponse> | null {
  const { workspaceName, adminName, brands } = body

  // 必填欄位
  if (!workspaceName || !newWorkspaceCode || !adminName || !trimmedTaxId) {
    return errorResponse(
      '缺少必填欄位（公司名稱 / 公司代號 / 公司統編 / 管理員姓名）',
      400,
      ErrorCode.VALIDATION_ERROR
    )
  }

  // workspace code 格式（大寫英文字母）
  if (!/^[A-Z]+$/.test(newWorkspaceCode)) {
    return errorResponse('公司代號必須為大寫英文字母', 400, ErrorCode.VALIDATION_ERROR)
  }

  // tax_id 8 碼數字
  if (!/^\d{8}$/.test(trimmedTaxId)) {
    return errorResponse('公司統編必須為 8 碼數字', 400, ErrorCode.VALIDATION_ERROR)
  }

  // brands 陣列
  if (!Array.isArray(brands)) {
    return errorResponse('brands 必須是陣列', 400, ErrorCode.VALIDATION_ERROR)
  }
  for (const b of brands) {
    if (!b.name?.trim()) {
      return errorResponse(
        '品牌名稱必填（代號可留空、會自動產生）',
        400,
        ErrorCode.VALIDATION_ERROR
      )
    }
  }

  return null
}
