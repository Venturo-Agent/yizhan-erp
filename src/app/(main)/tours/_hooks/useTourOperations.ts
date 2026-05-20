'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Tour } from '@/stores/types'
import { tourService } from '@/app/(main)/tours/_services/tour.service'
import { logger } from '@/lib/utils/logger'
import { NewTourData } from '../_types'
import { OrderFormData } from '@/app/(main)/orders/_components/add-order-form'
import type { CreateInput, UpdateInput } from '@/stores/core/types'
import { createOrder } from '@/data/entities/orders'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import { generateOrderNumber } from '@/lib/codes'
import { useAuthStore } from '@/stores/auth-store'
import { softDelete } from '@/lib/data/soft-delete'
import { TOUR_STATUS } from '@/lib/constants/status-maps'
import {
  checkTourDependencies,
  deleteTourEmptyOrders,
  deleteTourConfigurationData,
  unlinkTourQuotes,
  unlinkTourItineraries,
} from '@/app/(main)/tours/_services/tour_dependency.service'
import { useTourCreateOperation } from './useTourCreateOperation'

interface TourActions {
  create: (data: CreateInput<Tour>) => Promise<Tour>
  update: (id: string, data: UpdateInput<Tour>) => Promise<Tour>
  delete: (id: string) => Promise<boolean | void>
}

// 🔧 編輯模式已移至 TourEditDialog + useTourEdit hook
interface UseTourOperationsParams {
  actions: TourActions
  resetForm: () => void
  closeDialog: () => void
  setSubmitting: (value: boolean) => void
  setFormError: (error: string | null) => void
  workspaceId?: string
  onQuoteLinked?: (quoteId: string, tourId: string) => void
  /** 建立成功 callback：傳則抑制預設 router.push、由呼叫端決定下一步（給 todo dialog 等嵌套場景用） */
  onCreated?: (tour: { id: string; code: string; order?: { id: string; order_number: string } }) => void
}

export function useTourOperations(params: UseTourOperationsParams) {
  const router = useRouter()
  const currentUser = useAuthStore(s => s.user)

  // handleAddTour 拆至 useTourCreateOperation（避免單檔超 500 行）
  const { handleAddTour } = useTourCreateOperation({
    actions: params.actions,
    resetForm: params.resetForm,
    closeDialog: params.closeDialog,
    setSubmitting: params.setSubmitting,
    setFormError: params.setFormError,
    workspaceId: params.workspaceId,
    onQuoteLinked: params.onQuoteLinked,
    onCreated: params.onCreated,
  })

  const handleDeleteTour = useCallback(
    async (tour: Tour | null): Promise<{ success: boolean; error?: string }> => {
      if (!tour) return { success: false, error: '無效的旅遊團' }

      try {
        // 檢查是否有關聯資料（團員、收款單、請款單、PNR 不能刪）
        const { blockers, hasBlockers } = await checkTourDependencies(tour.id)

        if (hasBlockers) {
          const errorMsg = `無法刪除：此旅遊團有 ${blockers.join('、')}，請先刪除相關資料`
          logger.warn(`刪除旅遊團 ${tour.code} 失敗：${errorMsg}`)
          return { success: false, error: errorMsg }
        }

        // 清理關聯資料（即時計算用表、保留 hard delete）
        await supabase.from('tour_itinerary_items').delete().eq('tour_id', tour.id)
        await supabase.from('calendar_events').delete().eq('related_tour_id', tour.id)

        // 斷開報價單和行程表連結
        await unlinkTourQuotes(tour.id)
        await unlinkTourItineraries(tour.id)

        // 清除配置類子表（FK RESTRICT 後必須顯式清）
        await deleteTourConfigurationData(tour.id)

        // 刪除空訂單
        await deleteTourEmptyOrders(tour.id)

        // 軟刪除旅遊團（保留 DB row）
        const sdResult = await softDelete(
          supabase as never,
          {
            workspaceId: currentUser?.workspace_id ?? params.workspaceId ?? '',
            actorId: currentUser?.id ?? '',
          },
          { table: 'tours', id: tour.id }
        )

        if (!sdResult.ok) {
          throw new Error(sdResult.error ?? '軟刪除旅遊團失敗')
        }

        logger.info(`已軟刪除旅遊團 ${tour.code}`)
        return { success: true }
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : '刪除旅遊團失敗'
        logger.error('刪除旅遊團失敗:', JSON.stringify(err, null, 2))
        return { success: false, error: errorMsg }
      }
    },
    [params.actions, currentUser, params.workspaceId]
  )

  const handleArchiveTour = useCallback(
    async (tour: Tour, reason?: string) => {
      try {
        // 封存時斷開連結，解除封存不需要
        if (!tour.archived) {
          const linkedQuotesCount = await unlinkTourQuotes(tour.id)
          const linkedItinerariesCount = await unlinkTourItineraries(tour.id)
          logger.info(
            `封存旅遊團 ${tour.code}，斷開 ${linkedQuotesCount} 個報價單和 ${linkedItinerariesCount} 個行程表的連結`
          )
        }

        // 封存時記錄原因，解除封存時清除原因
        await params.actions.update(tour.id, {
          archived: !tour.archived,
          archive_reason: tour.archived ? null : reason,
        } as Partial<Tour>)

        logger.info(tour.archived ? '已解除封存旅遊團' : `已封存旅遊團、原因：${reason}`)
      } catch (err) {
        logger.error('封存/解封旅遊團失敗:', err)
      }
    },
    [params.actions]
  )

  /**
   * handleConvertToOfficial - 將提案/模板轉為正式團
   * - 提案：直接更新 status='upcoming'，填入日期，產生團號
   * - 模板：複製一份新團 status='upcoming'（模板保留）
   */
  const handleConvertToOfficial = useCallback(
    async (
      tour: Tour,
      payload: {
        departure_date: string
        return_date: string
        controller_id: string
        // 提案 airport_code 為空時、由 dialog 補
        city_code?: string
        orderData?: {
          contact_person?: string
          sales_id?: string
          sales_person?: string
          member_count?: number
          total_amount?: number
        }
      }
    ) => {
      try {
        const { departure_date, return_date, controller_id, city_code, orderData } = payload

        // 城市代碼來源：dialog 補的 city_code（提案沒城市時） > 提案保存的 airport_code
        const cityCode = city_code || tour.airport_code
        if (!cityCode) {
          throw new Error('轉開團缺城市代碼、無法產生團號')
        }
        const departureDate = new Date(departure_date)
        const code = await tourService.generateTourCode(cityCode, departureDate, false)

        let tourId = tour.id

        if (tour.status === TOUR_STATUS.PROPOSAL) {
          // 提案 → 直接更新（補上團控、補上城市[若新增]、換正式團號）
          const updatePayload: Partial<Tour> & {
            controller_id?: string
            airport_code?: string
          } = {
            departure_date,
            return_date,
            code,
            controller_id,
            status: TOUR_STATUS.UPCOMING,
          }
          if (city_code) {
            updatePayload.airport_code = city_code
          }
          await params.actions.update(tour.id, updatePayload)
        } else {
          // 模板 → 複製一份新團（用 unknown 繞過嚴格型別，實際欄位由 Supabase 驗證）
          const newTourData = {
            name: tour.name,
            country_id: tour.country_id || null,
            airport_code: city_code || tour.airport_code || null,
            controller_id,
            departure_date,
            return_date,
            code,
            status: TOUR_STATUS.UPCOMING,
            contract_status: 'pending' as const,
            price: tour.price || 0,
            max_participants: tour.max_participants || 20,
            total_revenue: 0,
            total_cost: 0,
            profit: 0,
            current_participants: 0,
            description: tour.description,
            days_count: tour.days_count,
            workspace_id: params.workspaceId,
          }
          const createdTour = await (params.actions.create as (data: unknown) => Promise<Tour>)(
            newTourData
          )
          tourId = createdTour.id
        }

        // 批次重新編號既有 orders（提案階段就建的訂單、轉開團後 order_number 跟著換）
        // 提案分支才需要：模板分支建的是新 tour、沒有 orphan orders
        if (tour.status === TOUR_STATUS.PROPOSAL) {
          const { data: existingOrders, error: fetchErr } = await supabase
            .from('orders')
            .select('id, created_at')
            .eq('tour_id', tour.id)
            .order('created_at', { ascending: true })
          if (fetchErr) {
            logger.warn('查詢既有訂單失敗、跳過批次重編:', fetchErr.message)
          } else if (existingOrders && existingOrders.length > 0) {
            for (let i = 0; i < existingOrders.length; i++) {
              const idx = i + 1
              const newNumber = `${code}-O${idx.toString().padStart(2, '0')}`
              const { error: updErr } = await supabase
                .from('orders')
                // A1（5/13 拍板）：砍 orders.code、order_number 為 SSOT
                .update({ order_number: newNumber })
                .eq('id', existingOrders[i].id)
              if (updErr) {
                logger.warn(`重編訂單 ${existingOrders[i].id} 失敗:`, updErr.message)
              }
            }
          }
        }

        // 有填訂單資料就建立訂單（接在既有訂單之後、下一個流水號）
        if (orderData?.contact_person?.trim() && orderData?.sales_person?.trim()) {
          const orderNumber = await generateOrderNumber(tourId)
          const memberCount = orderData.member_count || 1
          const totalAmount = orderData.total_amount || (tour.price || 0) * memberCount
          try {
            await createOrder({
              order_number: orderNumber,
              tour_id: tourId,
              tour_name: tour.name,
              contact_person: orderData.contact_person,
              sales_id: orderData.sales_id || null,
              sales_person: orderData.sales_person,
              member_count: memberCount,
              payment_status: 'unpaid',
              total_amount: totalAmount,
              paid_amount: 0,
              remaining_amount: totalAmount,
              workspace_id: params.workspaceId,
            } as Parameters<typeof createOrder>[0])
          } catch (orderErr) {
            const msg = (orderErr as Error).message
            logger.warn('轉開團建立訂單失敗:', msg)
            toast.error(`轉開團成功、但訂單沒建成：${msg}`)
          }
        }

        // 導航到新團號
        router.push(`/tours/${code}`)
      } catch (err) {
        logger.error('轉開團失敗:', err)
        throw err
      }
    },
    [params.actions, router, params.workspaceId]
  )

  return {
    handleAddTour,
    handleDeleteTour,
    handleArchiveTour,
    handleConvertToOfficial,
  }
}
