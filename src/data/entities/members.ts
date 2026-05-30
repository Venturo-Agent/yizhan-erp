'use client'

/**
 * Members Entity (order_members)
 *
 * 2026-05-29 B11 合一：
 * 原本同表有 `members.ts` 與 `order-members.ts` 兩套 entity hook、cache/realtime 分裂。
 * 收斂為單一 SSOT（本檔）：
 *   - 業務型別走 `@/stores/types`（Member、與 UI/型別系統相容）
 *   - 補上原 order-members 的 useDetail / create / invalidate export
 *   - barrel 一致 re-export，老路徑 import 自動跟上
 *
 * 使用方式：
 *   import { useMembers, useMember, useMembersSlim, createMember,
 *            updateMember, deleteMember, invalidateMembers } from '@/data'
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { Member } from '@/stores/types'

// ============================================
// Entity 定義
// ============================================

const memberEntity = createEntityHook<Member>('order_members', {
  workspaceScoped: true, // 2026-05-29 B11：從 WORKSPACE_SCOPED_TABLES fallback 名單搬進顯式宣告
  list: {
    // 補 tour_id：DB migration 加了 denorm 欄位 + trigger 自動同步、
    // entity hook 沒 SELECT 的話 UI 拿不到、要顯示「此成員屬哪團」會額外 join
    // 2026-05-15 補 remarks / custom_costs / room_type / roommate_id / special_requests / dietary_requirements / passport_image_url
    select:
      'id,order_id,tour_id,chinese_name,passport_name,passport_name_print,passport_number,passport_expiry,passport_image_url,id_number,birth_date,age,gender,identity,member_type,customer_id,sort_order,selling_price,cost_price,profit,deposit_amount,deposit_receipt_no,balance_amount,balance_receipt_no,total_payable,flight_cost,transport_cost,misc_cost,flight_self_arranged,pnr,ticket_number,ticketing_deadline,special_meal,hotel_1_name,hotel_1_checkin,hotel_1_checkout,hotel_2_name,hotel_2_checkin,hotel_2_checkout,checked_in,checked_in_at,contract_created_at,remarks,custom_costs,room_type,roommate_id,special_requests,dietary_requirements,workspace_id,created_at,created_by,updated_by',
    orderBy: {
      column: 'created_at',
      ascending: false,
    },
  },
  slim: {
    select:
      'id,order_id,tour_id,chinese_name,gender,passport_number,passport_expiry,id_number,birth_date,age',
  },
  detail: {
    select: '*',
  },
  cache: CACHE_PRESETS.high,
})

// ============================================
// 便捷 Hooks Export（讀）
// ============================================

/** 完整 Members 列表 */
export const useMembers = memberEntity.useList

/** 精簡 Members 列表 */
export const useMembersSlim = memberEntity.useListSlim

/** 單一成員（合一前位於 order-members.ts、由 usePassport 流程使用） */
export const useMember = memberEntity.useDetail

// ============================================
// CRUD Export（寫）
// ============================================

export const createMember = memberEntity.create
export const updateMember = memberEntity.update
export const deleteMember = memberEntity.delete
export const invalidateMembers = memberEntity.invalidate
