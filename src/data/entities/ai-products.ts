'use client'

/**
 * ai_products — 客戶在 AI Hub 自助上架的商品主檔
 *
 * 讀取走 entity hook（紅線 F）、client 直連表 + RLS 守 workspace 隔離。
 * 寫入不走這裡的 create/update/delete — 改走 /api/ai/products API route
 *   （server 端守門 + created_by + audit context、紅線 B/C/H），
 *   寫入後由 caller 呼叫 invalidateAiProducts() 刷新列表。
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { Database } from '@/lib/supabase/types'

type AiProduct = Database['public']['Tables']['ai_products']['Row']

const aiProductEntity = createEntityHook<AiProduct>('ai_products', {
  workspaceScoped: true,
  list: {
    select: '*',
    orderBy: { column: 'created_at', ascending: false },
    defaultFilter: { is_active: true }, // 軟刪除走 is_active=false（地方法律 #3）、已刪不顯示（下架的 is_published=false 仍顯示）
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.medium,
})

export const useAiProducts = aiProductEntity.useList
export const useAiProduct = aiProductEntity.useDetail
export const invalidateAiProducts = aiProductEntity.invalidate
export type { AiProduct }
