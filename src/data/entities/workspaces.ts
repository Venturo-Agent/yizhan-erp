'use client'

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { BaseEntity } from '../core/types'

/**
 * Workspace 型別（對應 workspaces 表）
 * 注意：workspaces 表不需要 workspace 隔離（它本身就是列出所有 workspace）
 */
interface WorkspaceEntity extends BaseEntity {
  name: string
  code?: string | null
  description?: string | null
  icon?: string | null
  is_active: boolean | null
  contract_seal_image_url?: string | null
  created_by?: string | null
  max_employees?: number | null
}

export const workspaceEntity = createEntityHook<WorkspaceEntity>('workspaces', {
  list: {
    // 2026-05-15 對齊 DB schema：砍 type（DB 5/14 已砍）、補 5/15 新加的 transfer_fee_* 等
    select:
      'id,name,description,icon,is_active,created_at,updated_at,created_by,code,employee_number_prefix,default_password,logo_url,address,phone,fax,tax_id,bank_name,bank_branch,bank_account,bank_account_name,bank_code,company_seal_url,email,website,invoice_seal_image_url,updated_by,legal_name,subtitle,contract_seal_image_url,personal_seal_url,premium_enabled,custom_domain,max_employees,payment_config,setup_state,enabled_tour_categories,home_country_code,default_billing_day_of_week,brand_primary_hex,print_accent_hex,is_multi_branch,subscription_plan,subscription_period_end,transfer_fee_mode,transfer_fee_unified_amount,transfer_fee_overflow_account_id',
    orderBy: { column: 'created_at', ascending: false },
  },
  slim: {
    select: 'id,name,code,icon,is_active',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.low,
  workspaceScoped: false, // workspaces 表不需要 workspace 隔離
  skipAuditFields: true,
})

// Hooks
const _useWorkspaces = workspaceEntity.useList
const _useWorkspacesSlim = workspaceEntity.useListSlim
const _useWorkspace = workspaceEntity.useDetail
const _useWorkspacesPaginated = workspaceEntity.usePaginated
const _useWorkspaceDictionary = workspaceEntity.useDictionary

// Actions
export const createWorkspace = workspaceEntity.create
export const updateWorkspace = workspaceEntity.update
const _deleteWorkspace = workspaceEntity.delete
export const invalidateWorkspaces = workspaceEntity.invalidate
