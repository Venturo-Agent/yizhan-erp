'use client'

/**
 * Contracts Entity（旅遊合約 / 電子簽約）
 *
 * 2026-05-24 建：合約管理系統（跟著訂單走 + 總覽簽約進度）。
 * 對應表：public.contracts
 *   - tour_id（必）+ order_id（選）：order_id 有值 = 每訂單合約；null = 整團合約
 *   - status / sent_at / signed_at：追簽約進度
 * 寫入走 /api/contracts/*（create / sign / paper-sign）、entity hook 主供「讀 + cache 失效」。
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { Database } from '@/lib/supabase/types'

type Contract = Database['public']['Tables']['contracts']['Row']

const contractEntity = createEntityHook<Contract>('contracts', {
  list: {
    // 精簡欄位：總覽進度 + 訂單按鈕狀態 + Dialog 列表夠用（詳情走 useContract → select *）
    select:
      'id,workspace_id,tour_id,order_id,code,template,signer_type,signer_name,signer_phone,status,sent_via,sent_at,signed_at,created_at',
    orderBy: { column: 'created_at', ascending: false },
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.low,
})

export const useContracts = contractEntity.useList
export const useContract = contractEntity.useDetail
export const invalidateContracts = contractEntity.invalidate
export type { Contract }
