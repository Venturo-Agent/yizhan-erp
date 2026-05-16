'use client'

import { formatDate } from '@/lib/utils/format-date'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { generateTourCode } from '@/lib/codes'
import { useWorkspaceId } from '@/lib/workspace-context'
import type { ParticipantCounts, SellingPrices, CostCategory } from '../_types'
import type { Quote, Tour } from '@/stores/types'
import type { CreateInput } from '@/stores/core/types'

interface UseQuoteTourProps {
  quote: Quote | null | undefined
  updateQuote: (id: string, data: Partial<Quote>) => void
  addTour: (data: CreateInput<Tour>) => Promise<Tour | undefined>
  router: ReturnType<typeof useRouter>
  updatedCategories: CostCategory[]
  total_cost: number
  groupSize: number
  quoteName: string
  accommodationDays: number
  participantCounts: ParticipantCounts
  sellingPrices: SellingPrices
}

export const useQuoteTour = ({
  quote,
  updateQuote,
  addTour,
  router,
  updatedCategories,
  total_cost,
  groupSize,
  quoteName,
  accommodationDays,
  participantCounts,
  sellingPrices,
}: UseQuoteTourProps) => {
  const workspaceId = useWorkspaceId()

  // 開旅遊團
  const handleCreateTour = useCallback(async () => {
    if (!quote) return

    // 更新報價單狀態為已核准
    updateQuote(quote.id, {
      status: 'approved',
    })

    // 創建旅遊團
    const departure_date = new Date()
    departure_date.setDate(departure_date.getDate() + 30) // 預設30天後出發
    const return_date = new Date(departure_date)
    return_date.setDate(return_date.getDate() + 5) // 預設5天行程

    // 使用報價單名稱作為地點（用戶可以在旅遊團頁面再修改）
    const location = quoteName || '待定'

    // 生成團號（DB RPC + advisory lock 防競態、預設城市代碼 'XX'、用戶可後續改）
    if (!workspaceId) {
      throw new Error('無法取得當前分公司、請重新登入')
    }
    const tourCode = await generateTourCode(workspaceId, 'XX', departure_date)

    const newTour = await addTour({
      name: quoteName,
      location: location,
      departure_date: formatDate(departure_date),
      return_date: formatDate(return_date),
      price: Math.round(total_cost / groupSize), // 每人單價
      status: 'draft',
      code: tourCode,
      contract_status: 'pending',
      total_revenue: 0,
      total_cost: total_cost,
      profit: 0,
    })

    // 更新報價單的 tour_id（葡萄串模型：quote 自己貼標籤、不需要 tour 反指）
    if (newTour?.id) {
      await updateQuote(quote.id, { tour_id: newTour.id })
    }

    // 跳轉到旅遊團管理頁面，並高亮新建的團
    router.push(`/tours?highlight=${newTour?.id}`)
  }, [
    quote,
    updatedCategories,
    total_cost,
    groupSize,
    accommodationDays,
    participantCounts,
    sellingPrices,
    updateQuote,
    quoteName,
    addTour,
    router,
    workspaceId,
  ])

  return {
    handleCreateTour,
  }
}
