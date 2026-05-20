'use client'

/**
 * Website Tours Entity
 *
 * 用於 /marketing/website 列表 + 編輯頁。讀 tours 表、只取官網管理需要的欄位
 *（is_public_listed / marketing_* / hero_image_url / seo_* / published_*）+ 基本資訊。
 *
 * 為什麼跟 tours.ts 分開：
 *   - tours.ts 是「團務內部」的 entity、select 100+ 欄位、含合約 / 報價 / 鎖團等
 *   - /marketing/website 只需要「對外櫥窗欄位 + 團識別」、欄位差太多、合用會浪費 egress
 *   - 兩個 entity 同表 OK、只要 cache key 不撞（已用不同 prefix）
 *
 * 寫入：
 *   - 不走 entity hook 內建 update（會碰其他欄位）
 *   - 走 PUT /api/marketing/website/[code]（後端守門 + 只寫官網欄位）
 *   - 寫完用 apiMutate invalidate 對應 SWR key
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { Tour } from '@/stores/types'

const websiteTourEntity = createEntityHook<Tour>('tours', {
  // 列表頁用：只撈官網管理需要的核心欄位 + 上架狀態
  list: {
    select:
      'id,code,name,departure_date,return_date,status,workspace_id,is_public_listed,published_at,published_by,hero_image_url,marketing_title,marketing_subtitle,created_at,updated_at',
    orderBy: { column: 'departure_date', ascending: false },
    filterSoftDeleted: true,
  },
  slim: {
    select: 'id,code,name,departure_date,is_public_listed',
  },
  // 編輯頁用：撈完整官網欄位 + 必要識別
  detail: {
    select:
      'id,code,name,departure_date,return_date,status,workspace_id,is_public_listed,marketing_title,marketing_subtitle,marketing_body,hero_image_url,seo_title,seo_description,published_at,published_by,created_at,updated_at',
  },
  cache: CACHE_PRESETS.medium,
})

export const useWebsiteTours = websiteTourEntity.useList
export const useWebsiteToursSlim = websiteTourEntity.useListSlim
export const useWebsiteTourDetail = websiteTourEntity.useDetail
export const invalidateWebsiteTours = websiteTourEntity.invalidate
