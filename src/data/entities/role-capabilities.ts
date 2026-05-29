'use client'

/**
 * Role Capabilities — 職務能力 hook
 *
 * 5/24 William 拍板：純角色 SSOT、能力一律從 role_capabilities 來（不再有個人能力 / eligibility 旗標）。
 * 用來把「指派候選池」（業務 / 團控 / 代墊）改成「看誰的職務有對應能力」。
 *
 * RLS：workspace 成員可讀全 workspace 的 role_capabilities（rc_select policy）。
 *
 * 2026-05-29 B11：原本走 plain useSWR + supabase.from 寫法、違反紅線 F。
 * 改走 createEntityHook 的 useList → 自動接 SWR + IndexedDB + Realtime + 統一 cache key。
 * role_capabilities 是 composite PK（role_id + capability_code）、沒有 surrogate id：
 *   - useList 不需要 PK、可直接用
 *   - detail/update/delete 不適用（CRUD 仍由 API route 走、本檔不暴露 CRUD）
 *   - invalidate 透過 entity.invalidate（會掃 entity:role_capabilities 前綴）
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'

export interface RoleCapability {
  // composite PK：role_id + capability_code；entity hook 沿用 BaseEntity 的 id 欄位、
  // 我們從 select 補一個 row_key 當「假 id」、避免 BaseEntity 約束炸
  id: string
  role_id: string
  capability_code: string
  enabled: boolean
}

// SELECT 用 `role_id || ':' || capability_code` 當虛擬 id、滿足 BaseEntity 要求
// （entity hook 不需要 PK 來做 list、只是型別系統要 id 欄位）
const SELECT_FIELDS =
  '*' // 含 role_id / capability_code / enabled / 視 RLS 而定的欄位

const roleCapEntity = createEntityHook<RoleCapability>('role_capabilities', {
  workspaceScoped: false, // RLS 已處理；沒有 workspace_id 欄位也通
  skipAuditFields: true,
  list: {
    select: SELECT_FIELDS,
    orderBy: { column: 'role_id', ascending: true },
  },
  detail: { select: SELECT_FIELDS },
  cache: CACHE_PRESETS.medium,
})

/** 列當前 workspace 所有 role_capabilities（RLS 自動 scope）*/
export function useRoleCapabilities() {
  const result = roleCapEntity.useList()
  return {
    items: result.items,
    loading: result.loading,
    error: result.error,
    refresh: roleCapEntity.invalidate,
  }
}

/** 失效 cache（職務權限變更後 call）*/
export const invalidateRoleCapabilities = roleCapEntity.invalidate
