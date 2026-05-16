/**
 * useEditModeSyncCustomers — 關閉全部編輯模式時自動將未關聯顧客的成員存為顧客
 *
 * 從 OrderMembersExpandable 拆出，純業務邏輯 hook。
 */

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import type { OrderMember } from '../_types/order-member.types'

interface UseEditModeSyncCustomersParams {
  members: OrderMember[]
}

export function useEditModeSyncCustomers({ members }: UseEditModeSyncCustomersParams) {
  const [isAllEditMode, setIsAllEditMode] = useState(false)

  const handleToggleEditMode = useCallback(async () => {
    if (isAllEditMode) {
      // 關閉編輯模式 → 自動存為顧客
      const membersToSync = members.filter(
        m => !m.customer_id && (m.chinese_name || m.passport_name || m.id_number)
      )

      if (membersToSync.length > 0) {
        const { createCustomer } = await import('@/data')

        for (const member of membersToSync) {
          try {
            // 先查是否已有顧客
            const { data: existing } = await supabase
              .from('customers')
              .select('id')
              .or(
                `passport_number.eq.${member.passport_number || ''},national_id.eq.${member.id_number || ''}`
              )
              .not('passport_number', 'is', null)
              .limit(1)
              .maybeSingle()

            let customerId: string | null = null

            if (existing) {
              customerId = existing.id
            } else if (member.chinese_name || member.passport_name) {
              // 建立新顧客
              const newCustomer = await createCustomer({
                name: member.chinese_name || '',
                passport_name: member.passport_name || '',
                passport_number: member.passport_number || null,
                national_id: member.id_number || null,
                birth_date: member.birth_date || null,
                gender: member.gender || null,
                is_active: true,
                member_type: 'member',
                verification_status: 'unverified',
              })
              if (newCustomer) {
                customerId = newCustomer.id
              }
            }

            // 關聯到成員
            if (customerId) {
              await supabase
                .from('order_members')
                .update({ customer_id: customerId })
                .eq('id', member.id)
            }
          } catch (err) {
            logger.warn('自動存為顧客失敗:', member.chinese_name, err)
          }
        }

        toast.success(`已自動建立/關聯 ${membersToSync.length} 位顧客`)
      }
    }
    setIsAllEditMode(prev => !prev)
  }, [isAllEditMode, members])

  return { isAllEditMode, handleToggleEditMode }
}
