/**
 * useMemberFieldHandlers — 成員欄位更新 + 附加費用處理 hooks
 *
 * 從 OrderMembersExpandable 拆出，封裝所有與 order_members 欄位寫入相關的業務邏輯。
 */

import { useCallback } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import { updateMembersTicketingDeadline } from '@/app/(main)/orders/_services/order_member.service'
import { updateMember } from '@/data/entities/members'
import { logger } from '@/lib/utils/logger'
import { markMemberLocalWrite } from './member-write-tracker'
import type { OrderMember } from '../_types/order-member.types'
import type { MemberSurcharges } from '../_types/member-surcharge.types'

const SURCHARGE_LABELS = {
  TOAST_SURCHARGE_SAVE_FAILED: '儲存附加費用失敗',
} as const

interface UseMemberFieldHandlersParams {
  members: OrderMember[]
  setMembers: React.Dispatch<React.SetStateAction<OrderMember[]>>
}

export function useMemberFieldHandlers({ members, setMembers }: UseMemberFieldHandlersParams) {
  const handleUpdateField = useCallback(
    async (memberId: string, field: keyof OrderMember, value: string | number | null) => {
      // 對於開票期限，同步更新同 PNR 的所有成員
      if (field === 'ticketing_deadline') {
        const currentMember = members.find(m => m.id === memberId)
        if (currentMember?.pnr) {
          const samePnrMembers = members.filter(m => m.pnr === currentMember.pnr)
          const deadlineValue = typeof value === 'string' || value === null ? value : null
          setMembers(
            members.map(m =>
              m.pnr === currentMember.pnr ? { ...m, ticketing_deadline: deadlineValue } : m
            )
          )
          try {
            const memberIds = samePnrMembers.map(m => m.id)
            // 標記本地寫入：擋掉 realtime 自己的回音蓋回正在編輯的列
            memberIds.forEach(markMemberLocalWrite)
            await updateMembersTicketingDeadline(memberIds, deadlineValue)
          } catch (error) {
            logger.error('更新欄位失敗:', error)
          }
          return
        }
      }

      // 一般欄位更新
      // 標記本地寫入：擋掉 realtime 自己的回音蓋回正在編輯的輸入框（中文快打重複字根因）
      markMemberLocalWrite(memberId)
      setMembers(members.map(m => (m.id === memberId ? { ...m, [field]: value } : m)))
      try {
        await updateMember(memberId, { [field]: value })
      } catch (error) {
        logger.error('更新欄位失敗:', error)
      }
    },
    [members, setMembers]
  )

  const handleSurchargeChange = useCallback(
    async (memberId: string, surcharges: MemberSurcharges) => {
      try {
        let surchargeTotal = 0
        if (surcharges.single_room_surcharge) surchargeTotal += surcharges.single_room_surcharge
        surcharges.add_on_items.forEach(item => {
          if (item.amount) surchargeTotal += item.amount
        })
        surcharges.other_charges.forEach(item => {
          if (item.amount) surchargeTotal += item.amount
        })

        const member = members.find(m => m.id === memberId)
        const newTotalPayable = (member?.selling_price || 0) + surchargeTotal

        setMembers(prev =>
          prev.map(m => {
            if (m.id === memberId) {
              return { ...m, total_payable: newTotalPayable }
            }
            return m
          })
        )

        const { data: existing } = await supabase
          .from('order_members')
          .select('custom_costs')
          .eq('id', memberId)
          .single()

        const existingRaw = existing as Record<string, unknown> | null
        const currentCosts = (existingRaw?.custom_costs as Record<string, unknown>) || {}
        const updatedCosts = { ...currentCosts, surcharges: surcharges }

        await supabase
          .from('order_members')
          .update({
            custom_costs: updatedCosts,
            total_payable: newTotalPayable,
          } as Record<string, unknown>)
          .eq('id', memberId)
      } catch (err) {
        logger.error('儲存附加費用失敗', err)
        toast.error(SURCHARGE_LABELS.TOAST_SURCHARGE_SAVE_FAILED)
      }
    },
    [members, setMembers]
  )

  return { handleUpdateField, handleSurchargeChange }
}
