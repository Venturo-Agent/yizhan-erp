'use client'

/**
 * OrderMembersDialog — 訂單成員管理彈窗（薄殼）
 *
 * 背景（2026-05-28 William 拍板）：訂單主頁原本點「成員」是 inline 在表格列下方
 * 撐開一大塊面板（撐高列、欄多擠、橫向滾動亂）。改成點「成員」→ 彈出此 Dialog、
 * 把既有的 OrderMembersExpandable 裝在 Dialog 裡（畫面乾淨、隔離性好）。
 *
 * 設計：
 * - 純薄殼、不持有任何成員業務 state，全交給 OrderMembersExpandable。
 * - 用大尺寸（full = max-w-[95vw]）+ 高 ~90vh，內部由 OrderMembersExpandable 自己捲動。
 * - level={1}：成員面板裡的子 Dialog（AddMemberDialog / MemberEditDialog / OrderSelectDialog /
 *   CustomerMatchDialog 等）全部寫死 level={2}，本殼必須是 level={1} 才能讓子 Dialog 疊在上面。
 * - 團詳情頁（/tours/[code]?tab=orders 的成員 tab）走 inline、不經此殼、不受影響。
 */

import React from 'react'
import { useTranslations } from 'next-intl'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { OrderMembersExpandable } from '@/app/(main)/orders/_components/OrderMembersExpandable'
import type { Order, Tour } from '@/stores/types'

interface OrderMembersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: Order | null
  workspaceId: string
  /** 對應訂單所屬團（給成員面板算出發日期、分房分車用） */
  tour?: Tour
}

export function OrderMembersDialog({
  open,
  onOpenChange,
  order,
  workspaceId,
  tour,
}: OrderMembersDialogProps) {
  const t = useTranslations('orders')
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        level={1}
        size="full"
        className="h-[90vh] max-h-[90vh] flex flex-col overflow-hidden p-6"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>
            {t('membersDialogTitle')}
            {order?.order_number ? (
              <span className="ml-2 text-sm font-normal text-morandi-secondary">
                {order.order_number}
                {order.contact_person ? `・${order.contact_person}` : ''}
              </span>
            ) : null}
          </DialogTitle>
        </DialogHeader>

        {/* 只有實際選到訂單才掛載成員面板；key 綁 order.id 確保切換訂單時重新掛載、不殘留上一張單的 state */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {order && (
            <OrderMembersExpandable
              key={order.id}
              orderId={order.id}
              tourId={order.tour_id || ''}
              workspaceId={workspaceId}
              embedded={false}
              headerLabel={`${t('membersDialogTitle')}${order.order_number ? `　${order.order_number}` : ''}`}
              tour={tour}
              onClose={() => onOpenChange(false)}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
