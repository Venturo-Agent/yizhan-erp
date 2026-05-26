'use client'

/**
 * useOrderMemberActions - 成員 CRUD 操作
 * 從 useOrderMembersData.ts 拆分出來
 *
 * 此 hook 負責：
 * - 新增成員（含排序計算）
 * - 刪除成員（含確認對話框）
 * - 重新排序成員
 * - 新增成員對話框狀態
 * - 訂單選擇對話框狀態（團體模式）
 */

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { alert, confirm } from '@/lib/ui/alert-dialog'
import { toast } from 'sonner'
import type { OrderMember } from '../_types/order-member.types'
import { deleteMember } from '@/data'
import { useTranslations } from 'next-intl'
import { recalculateParticipants } from '@/app/(main)/tours/_services/tour-stats.service'
import { recalculateOrderAmount } from '@/app/(main)/orders/_services/order-stats.service'

interface TourOrder {
  id: string
  order_number: string | null
}

interface UseOrderMemberActionsParams {
  orderId?: string
  tourId: string
  workspaceId: string
  mode: 'order' | 'tour'
  members: OrderMember[]
  setMembers: React.Dispatch<React.SetStateAction<OrderMember[]>>
  tourOrders: TourOrder[]
  loadMembers: () => Promise<void>
}

export function useOrderMemberActions({
  orderId,
  tourId,
  workspaceId,
  mode,
  members,
  setMembers,
  tourOrders,
  loadMembers,
}: UseOrderMemberActionsParams) {
  const t = useTranslations('orders')
  // ========== 新增成員對話框狀態 ==========
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [memberCountToAdd, setMemberCountToAdd] = useState<number | ''>(1)
  const [selectedOrderIdForAdd, setSelectedOrderIdForAdd] = useState<string | null>(null)
  const [showOrderSelectDialog, setShowOrderSelectDialog] = useState(false)

  /**
   * 處理新增成員按鈕點擊
   * - 團體模式：需要先選擇訂單
   * - 單一訂單模式：直接開啟新增對話框
   */
  const handleAddMember = async () => {
    if (mode === 'tour') {
      // 團體模式：需要先選擇訂單
      if (tourOrders.length === 0) {
        await alert(t('noOrdersInTour'), 'warning')
        return
      }
      if (tourOrders.length === 1) {
        // 只有一個訂單，直接使用
        setSelectedOrderIdForAdd(tourOrders[0].id)
        setIsAddDialogOpen(true)
      } else {
        // 多個訂單，顯示選擇對話框
        setShowOrderSelectDialog(true)
      }
    } else {
      setIsAddDialogOpen(true)
    }
  }

  /**
   * 確認新增成員
   */
  const confirmAddMembers = async () => {
    // 如果是空白或無效數字，預設為 1
    const count = typeof memberCountToAdd === 'number' ? memberCountToAdd : 1

    // 團體模式使用選擇的訂單 ID，單一訂單模式使用 prop 的 orderId
    const targetOrderId = mode === 'tour' ? selectedOrderIdForAdd : orderId
    if (!targetOrderId) {
      await alert(t('pleaseSelectOrderAlert'), 'warning')
      return
    }

    try {
      // 拿這張單目前最大 sort_order、新成員從 max+1 起遞增、避免一堆都搶 default 0 → 排序亂跳
      const { data: maxRow } = await supabase
        .from('order_members')
        .select('sort_order')
        .eq('order_id', targetOrderId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle()
      const baseSortOrder = maxRow?.sort_order ?? 0

      const newMembers = Array.from({ length: count }, (_, i) => ({
        order_id: targetOrderId,
        workspace_id: workspaceId,
        member_type: 'adult',
        identity: t('adult'),
        sort_order: baseSortOrder + i + 1,
      }))

      const { data, error } = await supabase.from('order_members').insert(newMembers).select()

      if (error) throw error
      setMembers([...members, ...(data || [])])
      setIsAddDialogOpen(false)
      setMemberCountToAdd(1)

      // 重算：團人數 + 訂單金額（人加進去、訂單 total_amount 要增）
      if (tourId) {
        recalculateParticipants(tourId).catch(err => {
          logger.error('重算團人數失敗:', err)
        })
      }
      recalculateOrderAmount(targetOrderId).catch(err => {
        logger.error('重算訂單金額失敗:', err)
      })
    } catch (error) {
      logger.error(t('addMemberFailed'), error)
      await alert(t('addFailed'), 'error')
    }
  }

  /**
   * 重新排序成員
   */
  const handleReorderMembers = async (reorderedMembers: OrderMember[]) => {
    // 更新本地狀態（同時更新每個成員的 sort_order）
    const membersWithNewOrder = reorderedMembers.map((member, index) => ({
      ...member,
      sort_order: index + 1,
    }))
    setMembers(membersWithNewOrder)

    // 批次更新資料庫中的 sort_order
    try {
      const updates = membersWithNewOrder.map(member => ({
        id: member.id,
        sort_order: member.sort_order,
      }))

      // 使用 Promise.all 批次更新
      await Promise.all(
        updates.map(({ id, sort_order }) =>
          supabase.from('order_members').update({ sort_order }).eq('id', id)
        )
      )
    } catch (error) {
      logger.error(t('updateSortFailed'), error)
      toast.error(t('sortUpdateFailed'))
      // 重新載入以恢復正確順序
      loadMembers()
    }
  }

  /**
   * 刪除成員
   */
  const handleDeleteMember = async (memberId: string) => {
    // 找到要刪除的成員，顯示名稱讓使用者確認
    const memberToDelete = members.find(m => m.id === memberId)
    const memberName =
      memberToDelete?.chinese_name || memberToDelete?.passport_name || t('thisMember')

    const confirmed = await confirm(t('memberConfirmDelete', { name: memberName }), {
      title: t('deleteMember'),
      type: 'warning',
    })
    if (!confirmed) return

    try {
      const orderIdOfDeleted = memberToDelete?.order_id
      await deleteMember(memberId)
      setMembers(members.filter(m => m.id !== memberId))

      // 重算：團人數 + 訂單金額（少了一個人、訂單 total_amount 要減）
      if (tourId) {
        recalculateParticipants(tourId).catch(err => {
          logger.error('重算團人數失敗:', err)
        })
      }
      if (orderIdOfDeleted) {
        recalculateOrderAmount(orderIdOfDeleted).catch(err => {
          logger.error('重算訂單金額失敗:', err)
        })
      }
    } catch (error) {
      logger.error(t('deleteMemberFailed'), error)
      await alert(t('deleteFailed'), 'error')
    }
  }

  return {
    // 新增成員對話框狀態
    isAddDialogOpen,
    setIsAddDialogOpen,
    memberCountToAdd,
    setMemberCountToAdd,

    // 訂單選擇對話框狀態（團體模式）
    selectedOrderIdForAdd,
    setSelectedOrderIdForAdd,
    showOrderSelectDialog,
    setShowOrderSelectDialog,

    // 成員操作
    handleAddMember,
    confirmAddMembers,
    handleDeleteMember,
    handleReorderMembers,
  }
}
