import { useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { dynamicFrom } from '@/lib/supabase/typed-client'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { isValidRecordLocator } from '@/lib/pnr-parser/utils'
import type { ParsedPNR } from '@/lib/pnr-parser'
import { useTranslations } from 'next-intl'

interface TourMember {
  id: string
  chinese_name: string | null
  passport_name: string | null
  pnr?: string | null
}

interface SuggestedCustomer {
  id: string
  name: string
  passport_name: string | null
  passport_number: string | null
  passport_expiry: string | null
  passport_image_url: string | null
  national_id: string | null
  birth_date: string | null
  gender: string | null
  score: number
}

interface MatchResult {
  pnrPassenger: string
  matchedMember: TourMember | null
  suggestedCustomers: SuggestedCustomer[]
  selectedCustomerId: string | null
  confidence: 'exact' | 'partial' | 'none'
  score: number
}

interface UsePnrMatchSaveParams {
  parsedPnr: ParsedPNR | null
  manualPnr: string
  finalResults: MatchResult[]
  isTourMode: boolean
  orderId?: string
  workspaceId?: string
  selectedOrderIds: Record<string, string>
  onSuccess?: () => void
  onClose: () => void
  setIsSaving: (v: boolean) => void
}

/**
 * PNR 儲存邏輯 hook
 * - 更新現有成員的 PNR、機票號、票價、開票期限、member_flights
 * - 從建議客戶建立新成員
 */
export function usePnrMatchSave({
  parsedPnr,
  manualPnr,
  finalResults,
  isTourMode,
  orderId,
  workspaceId,
  selectedOrderIds,
  onSuccess,
  onClose,
  setIsSaving,
}: UsePnrMatchSaveParams) {
  const t = useTranslations('orders')

  const handleSave = useCallback(async () => {
    if (!parsedPnr) return

    const recordLocator = manualPnr.trim().toUpperCase()
    if (!isValidRecordLocator(recordLocator)) {
      toast.error('訂位代號格式不對（必須 5-8 字、純英數）、請確認後重填')
      return
    }

    const matchedMembers = finalResults.filter(r => r.matchedMember)
    const selectedCustomers = finalResults.filter(r => r.selectedCustomerId && !r.matchedMember)

    if (matchedMembers.length === 0 && selectedCustomers.length === 0) {
      toast.error(t('noSavablePairs'))
      return
    }

    if (selectedCustomers.length > 0) {
      if (isTourMode) {
        const missingOrders = selectedCustomers.filter(r => !selectedOrderIds[r.pnrPassenger])
        if (missingOrders.length > 0) {
          toast.error(
            `${t('pleaseAssignOrderFor')}${missingOrders.length}${t('selectOrderForPassengers')}`
          )
          return
        }
      } else if (!orderId) {
        toast.error(t('cannotCreateMember'))
        return
      }
    }

    setIsSaving(true)
    try {
      let updatedCount = 0
      let createdCount = 0

      // 計算每人票價（僅「機票訂單明細」格式的金額為成本價）
      let perPersonFare: number | null = null
      if (parsedPnr.fareData && parsedPnr.sourceFormat === 'ticket_order_detail') {
        if (parsedPnr.fareData.perPassenger) {
          perPersonFare = parsedPnr.fareData.totalFare
        } else {
          const passengerCount = parsedPnr.passengerNames.length || 1
          perPersonFare = Math.round(parsedPnr.fareData.totalFare / passengerCount)
        }
      }

      // 1. 更新現有成員的 PNR 和機票號碼
      if (matchedMembers.length > 0) {
        const updates = matchedMembers.map(r => {
          let ticketInfo = parsedPnr.ticketNumbers.find(
            tk =>
              tk.passenger &&
              (tk.passenger === r.pnrPassenger ||
                tk.passenger.includes(r.pnrPassenger.split('/')[0]))
          )
          if (!ticketInfo && parsedPnr.ticketNumbers.length === 1 && matchedMembers.length === 1) {
            ticketInfo = parsedPnr.ticketNumbers[0]
          }
          if (!ticketInfo && parsedPnr.ticketNumbers.length > 0) {
            logger.warn(
              `[PnrMatchDialog] 無法為旅客 ${r.pnrPassenger} 配對機票號、保留 null 由人工填入`
            )
          }
          return {
            id: r.matchedMember!.id,
            pnr: recordLocator,
            ticket_number: ticketInfo?.number || null,
          }
        })

        for (const update of updates) {
          const updateData: {
            pnr: string
            ticket_number?: string | null
            flight_cost?: number | null
            ticketing_deadline?: string | null
          } = { pnr: update.pnr }
          if (update.ticket_number) updateData.ticket_number = update.ticket_number
          if (perPersonFare !== null) updateData.flight_cost = perPersonFare
          if (parsedPnr.ticketingDeadline) {
            updateData.ticketing_deadline = parsedPnr.ticketingDeadline.toISOString().split('T')[0]
          }
          await supabase.from('order_members').update(updateData).eq('id', update.id)
        }
        updatedCount = matchedMembers.length

        // Phase 2（5/14 William 拍板 A）：把 PNR 解析的航班 segments 寫進 member_flights
        if (parsedPnr.segments && parsedPnr.segments.length > 0 && workspaceId) {
          for (const update of updates) {
            try {
              await dynamicFrom('member_flights').delete().eq('member_id', update.id)
              const flightRows = parsedPnr.segments.map((seg, idx) => ({
                workspace_id: workspaceId,
                member_id: update.id,
                segment_index: idx,
                airline: seg.airline || null,
                flight_number: seg.flightNumber || null,
                departure_date: seg.departureDate || null,
                departure_time: seg.departureTime || null,
                arrival_time: seg.arrivalTime || null,
                origin: seg.origin || null,
                destination: seg.destination || null,
                cabin_class: seg.class || null,
                aircraft: seg.aircraft || null,
                status: seg.status || null,
                meal: seg.meal || null,
              }))
              await dynamicFrom('member_flights').insert(flightRows)
            } catch (err) {
              logger.warn(`寫入 member_flights 失敗（member ${update.id}）:`, err)
            }
          }
        }
      }

      // 2. 從選擇的客戶建立新成員
      if (selectedCustomers.length > 0 && workspaceId) {
        const nextSortOrderByOrder = new Map<string, number>()
        for (let idx = 0; idx < selectedCustomers.length; idx++) {
          const result = selectedCustomers[idx]
          const customer = result.suggestedCustomers.find(c => c.id === result.selectedCustomerId)
          if (!customer) continue

          const targetOrderId = isTourMode ? selectedOrderIds[result.pnrPassenger] : orderId
          if (!targetOrderId) continue

          if (!nextSortOrderByOrder.has(targetOrderId)) {
            const { data: maxRow } = await supabase
              .from('order_members')
              .select('sort_order')
              .eq('order_id', targetOrderId)
              .order('sort_order', { ascending: false })
              .limit(1)
              .maybeSingle()
            nextSortOrderByOrder.set(targetOrderId, (maxRow?.sort_order ?? 0) + 1)
          }
          const memberSortOrder = nextSortOrderByOrder.get(targetOrderId)!
          nextSortOrderByOrder.set(targetOrderId, memberSortOrder + 1)

          let ticketInfo = parsedPnr.ticketNumbers.find(
            tk =>
              tk.passenger &&
              (tk.passenger === result.pnrPassenger ||
                tk.passenger.includes(result.pnrPassenger.split('/')[0]))
          )
          if (!ticketInfo && parsedPnr.ticketNumbers.length === selectedCustomers.length) {
            ticketInfo = parsedPnr.ticketNumbers[idx]
          }
          if (!ticketInfo && parsedPnr.ticketNumbers.length === 1) {
            ticketInfo = parsedPnr.ticketNumbers[0]
          }

          const newMember = {
            order_id: targetOrderId,
            workspace_id: workspaceId,
            customer_id: customer.id,
            chinese_name: customer.name,
            passport_name: customer.passport_name,
            passport_number: customer.passport_number,
            passport_expiry: customer.passport_expiry,
            passport_image_url: customer.passport_image_url,
            id_number: customer.national_id,
            birth_date: customer.birth_date,
            gender: customer.gender,
            pnr: recordLocator,
            ticket_number: ticketInfo?.number || null,
            flight_cost: perPersonFare,
            ticketing_deadline: parsedPnr.ticketingDeadline?.toISOString() || null,
            member_type: 'adult',
            identity: '大人',
            sort_order: memberSortOrder,
          }

          const { error } = await supabase.from('order_members').insert(newMember)
          if (error) {
            logger.error('建立成員失敗:', error)
          } else {
            createdCount++
          }
        }
      }

      const messages: string[] = []
      if (updatedCount > 0) messages.push(`${updatedCount}${t('membersUpdatedPnr')}`)
      if (createdCount > 0) messages.push(`${createdCount}${t('newMembersCreated')}`)
      toast.success(`${messages.join('，')}${t('bookingCode2')} ${recordLocator}`)

      onSuccess?.()
      onClose()
    } catch (error) {
      logger.error(t('saveFailedColon'), error)
      toast.error(t('saveFailed'))
    } finally {
      setIsSaving(false)
    }
  }, [
    parsedPnr,
    manualPnr,
    finalResults,
    isTourMode,
    orderId,
    workspaceId,
    selectedOrderIds,
    onSuccess,
    onClose,
    setIsSaving,
    t,
  ])

  return { handleSave }
}
