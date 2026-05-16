'use client'

/**
 * useTourCreateOperation — 建立旅遊團的操作邏輯
 *
 * 從 useTourOperations 拆出、讓主 hook 維持單一檔案下 500 行。
 * 包含：新建正式團 / 提案 / 模板、建立訂單、連結報價單、跳轉導航。
 */

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Tour } from '@/stores/types'
import { tourService } from '@/app/(main)/tours/_services/tour.service'
import { logger } from '@/lib/utils/logger'
import { NewTourData } from '../_types'
import { OrderFormData } from '@/app/(main)/orders/_components/add-order-form'
import type { CreateInput } from '@/stores/core/types'
import { updateCountry, updateCity, updateQuote } from '@/data'
import { createOrder } from '@/data/entities/orders'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import { generateOrderNumber } from '@/lib/codes'
import { TOUR_STATUS } from '@/lib/constants/status-maps'

interface TourCreateActions {
  create: (data: CreateInput<Tour>) => Promise<Tour>
}

interface UseTourCreateOperationParams {
  actions: TourCreateActions
  resetForm: () => void
  closeDialog: () => void
  setSubmitting: (value: boolean) => void
  setFormError: (error: string | null) => void
  workspaceId?: string
  onQuoteLinked?: (quoteId: string, tourId: string) => void
  onCreated?: (tour: { id: string; code: string; order?: { id: string; order_number: string } }) => void
}

export function useTourCreateOperation(params: UseTourCreateOperationParams) {
  const router = useRouter()

  const {
    actions,
    resetForm,
    closeDialog,
    setSubmitting,
    setFormError,
    workspaceId,
    onQuoteLinked,
    onCreated,
  } = params

  // 🔧 核心表架構：直接用 id 更新、不需要 find
  const incrementCountryUsage = async (countryId: string) => {
    if (!countryId) return
    try {
      const { data } = await supabase
        .from('countries')
        .select('usage_count')
        .eq('id', countryId)
        .single()
      await updateCountry(countryId, { usage_count: ((data?.usage_count as number) || 0) + 1 })
    } catch {
      // 非關鍵操作，靜默處理
    }
  }

  const incrementCityUsage = async (cityName: string) => {
    if (!cityName) return
    try {
      const { data } = await supabase
        .from('cities')
        .select('id, usage_count')
        .eq('name', cityName)
        .single()
      if (data) {
        await updateCity(data.id, { usage_count: ((data.usage_count as number) || 0) + 1 })
      }
    } catch {
      // 非關鍵操作，靜默處理
    }
  }

  const handleAddTour = useCallback(
    async (newTour: NewTourData, newOrder: Partial<OrderFormData>, fromQuoteId?: string) => {
      const isProposalOrTemplate =
        newTour.status === TOUR_STATUS.PROPOSAL || newTour.status === TOUR_STATUS.TEMPLATE

      // 提案/模板只需要名稱，正式團需要日期
      if (!isProposalOrTemplate) {
        const { createTourSchema } = await import('@/lib/validations/schemas')
        const validation = createTourSchema.safeParse({
          name: newTour.name.trim(),
          departure_date: newTour.departure_date,
          return_date: newTour.return_date,
        })
        if (!validation.success) {
          setFormError(validation.error.issues[0].message)
          return
        }
      } else {
        if (!newTour.name.trim()) {
          setFormError('請輸入名稱')
          return
        }
      }

      // Check custom destination（正式團且有填自訂國家時）
      if (newTour.countryCode === '__custom__') {
        if (!newTour.customCountry?.trim()) {
          toast.error('請填寫國家名稱')
          return
        }
        if (!newTour.customLocation?.trim()) {
          toast.error('請填寫城市名稱')
          return
        }
        if (!newTour.customCityCode?.trim()) {
          toast.error('請填寫城市代號')
          return
        }
        if (newTour.customCityCode.length !== 3) {
          toast.error('城市代號必須是 3 碼')
          return
        }
      }

      try {
        setSubmitting(true)
        setFormError(null)

        let orderResult: { id: string; order_number: string } | undefined

        const cityCode =
          newTour.countryCode === '__custom__' ? newTour.customCityCode! : newTour.cityCode
        const cityName =
          newTour.countryCode === '__custom__'
            ? newTour.customLocation!
            : newTour.cityName || newTour.cityCode

        let code: string

        if (isProposalOrTemplate) {
          const prefix = newTour.status === TOUR_STATUS.PROPOSAL ? 'PROP' : 'TMPL'
          code = `${prefix}-${Date.now().toString(36).toUpperCase()}`
        } else {
          if (!cityCode || cityCode.length < 2) {
            setFormError('請選擇城市，或在「系統設定 > 地區管理」中為該城市設定機場代碼')
            setSubmitting(false)
            return
          }
          const departure_date = new Date(newTour.departure_date)
          code = await tourService.generateTourCode(
            cityCode,
            departure_date,
            newTour.isSpecial
          )
        }

        let countryId: string | undefined
        if (newTour.countryCode === '__custom__') {
          countryId = undefined
        } else {
          countryId = newTour.countryId
        }

        const defaultStatus = isProposalOrTemplate ? newTour.status : TOUR_STATUS.UPCOMING
        const tourData = {
          name: newTour.name,
          days_count: isProposalOrTemplate ? newTour.days_count || null : null,
          country_id: countryId,
          airport_code: cityCode || undefined,
          departure_date: isProposalOrTemplate ? null : newTour.departure_date,
          return_date: isProposalOrTemplate ? null : newTour.return_date,
          status: defaultStatus,
          price: newTour.price,
          max_participants: newTour.max_participants,
          code,
          contract_status: 'pending' as const,
          total_revenue: 0,
          total_cost: 0,
          profit: 0,
          current_participants: 0,
          enable_checkin: isProposalOrTemplate ? false : newTour.enable_checkin || false,
          workspace_id: workspaceId,
          tour_service_type: newTour.tour_service_type || 'tour_group',
        }

        // 建團：如果團號重複（23505），自動跳下一個字母重試
        let createdTour: Awaited<ReturnType<typeof actions.create>>
        let retries = 0
        while (true) {
          try {
            createdTour = await actions.create(tourData)
            break
          } catch (err: unknown) {
            const isDuplicate =
              err instanceof Error &&
              (err.message?.includes('23505') || err.message?.includes('duplicate'))
            if (isDuplicate && retries < 5 && tourData.code) {
              retries++
              const lastChar = tourData.code.slice(-1)
              const nextChar = String.fromCharCode(lastChar.charCodeAt(0) + 1)
              tourData.code = tourData.code.slice(0, -1) + nextChar
              logger.info(`團號重複，自動跳至 ${tourData.code}`)
              continue
            }
            throw err
          }
        }

        // 寫入動態選人欄位指派（field_id → employee_id）
        if (newTour.role_assignments && !isProposalOrTemplate) {
          const assignments = Object.entries(newTour.role_assignments)
            .filter(([, employeeId]) => employeeId)
            .map(([fieldId, employeeId]) => ({
              tour_id: createdTour.id,
              field_id: fieldId,
              employee_id: employeeId,
            }))
          if (assignments.length > 0) {
            await supabase.from('tour_role_assignments').insert(assignments as never[])
          }
        }

        if (countryId) {
          incrementCountryUsage(countryId)
        }
        if (cityName) {
          incrementCityUsage(cityName)
        }

        // 提案/模板不需要建立訂單和連結報價單
        if (!isProposalOrTemplate) {
          if (newOrder.contact_person?.trim() && newOrder.sales_person?.trim()) {
            const order_number = `${code}-O01`
            const memberCount = newOrder.member_count || 1
            const totalAmount = newOrder.total_amount || newTour.price * memberCount
            try {
              const createdOrder = await createOrder({
                order_number,
                tour_id: createdTour.id,
                tour_name: newTour.name,
                contact_person: newOrder.contact_person,
                sales_id: newOrder.sales_id || null,
                sales_person: newOrder.sales_person || '',
                assistant_id: newOrder.assistant_id || null,
                assistant: newOrder.assistant || '',
                member_count: memberCount,
                payment_status: 'unpaid',
                total_amount: totalAmount,
                paid_amount: 0,
                remaining_amount: totalAmount,
                workspace_id: workspaceId,
              } as Parameters<typeof createOrder>[0])
              if (createdOrder) {
                orderResult = { id: createdOrder.id, order_number: createdOrder.order_number || order_number }
              }
            } catch (orderErr) {
              const msg = (orderErr as Error).message
              logger.warn('建立訂單失敗:', msg)
              toast.error(`旅遊團已建立、但訂單沒建成：${msg}`)
            }
          }

          if (fromQuoteId) {
            try {
              await updateQuote(fromQuoteId, { tour_id: createdTour.id } as Parameters<
                typeof updateQuote
              >[1])
            } catch (quoteError) {
              logger.warn(
                '更新報價單失敗:',
                quoteError instanceof Error ? quoteError.message : quoteError
              )
            }
            onQuoteLinked?.(fromQuoteId, createdTour.id)
          }
        }

        resetForm()
        closeDialog()

        // onCreated callback 優先（嵌套場景如 todo dialog 用、抑制預設導航）
        if (onCreated) {
          onCreated({ id: createdTour.id, code, order: orderResult })
        } else if (!isProposalOrTemplate) {
          router.push(`/tours/${code}`)
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : '建立旅遊團失敗'
        setFormError(errorMessage)
        logger.error(
          'Failed to create tour:',
          err,
          JSON.stringify(err, Object.getOwnPropertyNames(err instanceof Error ? err : Object(err)))
        )
      } finally {
        setSubmitting(false)
      }
    },
    [
      actions,
      resetForm,
      closeDialog,
      setSubmitting,
      setFormError,
      router,
      incrementCountryUsage,
      incrementCityUsage,
      workspaceId,
      onQuoteLinked,
      onCreated,
    ]
  )

  return { handleAddTour }
}
