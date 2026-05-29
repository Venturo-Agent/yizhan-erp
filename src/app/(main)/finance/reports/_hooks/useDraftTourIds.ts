'use client'

/**
 * useDraftTourIds — 只撈「草稿團」(template / proposal) 的 id（取代 OverviewTab 全撈所有團）
 *
 * 為什麼：OverviewTab 原本 useTours({ all: true }) 全撈所有團、只為了知道哪些是草稿團
 * （template/proposal、工作台暫存、不該入帳）好排除掉。其實只需要「草稿團的 id 清單」、
 * 草稿團數量少（提案/模板）→ 只撈這些、不撈全部正式團。
 *
 * 軟刪 filterActive、workspace 隔離走 RLS。
 */

import { supabase } from '@/lib/supabase/client'
import { createReportHook } from '@/lib/swr/createReportHook'
import { filterActive } from '@/lib/data/filter-active'
import { DRAFT_TOUR_STATUSES } from '@/constants/tour-status'

const PAGE = 1000

export const useDraftTourIds = createReportHook<string, Record<string, never>>({
  key: 'draft-tour-ids',
  defaultStats: {},
  fetcher: async () => {
    const ids: string[] = []
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await filterActive(supabase.from('tours').select('id'))
        .in('status', DRAFT_TOUR_STATUSES as readonly string[] as string[])
        .range(from, from + PAGE - 1)

      if (error) throw new Error(error.message)
      const batch = (data || []) as { id: string }[]
      ids.push(...batch.map(t => t.id))
      if (batch.length < PAGE) break
    }
    return { rows: ids, stats: {} }
  },
})
