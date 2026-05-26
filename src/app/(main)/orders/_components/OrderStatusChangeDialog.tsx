'use client'

import React, { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, AlertCircle, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { updateOrder } from '@/data'
import { useAuthStore } from '@/stores'
import { logger } from '@/lib/utils/logger'
import { ORDER_STATUS_MAP } from '@/lib/constants/status-maps'
import type { Order, OrderStatus } from '@/types/order.types'

interface InvoiceInfo {
  hasInvoice: boolean
  totalAmount: number
  paidAmount: number
}

interface OrderStatusChangeDialogProps {
  order: Order | null
  newStatus: OrderStatus | null
  isOpen: boolean
  onClose: () => void
  onSuccess: (orderId: string, newStatus: OrderStatus) => void
}

export function OrderStatusChangeDialog({
  order,
  newStatus,
  isOpen,
  onClose,
  onSuccess,
}: OrderStatusChangeDialogProps) {
  const user = useAuthStore(state => state.user)
  const [invoiceInfo, setInvoiceInfo] = useState<InvoiceInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isOpen || !order) return

    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase as any)
      .from('invoice_batches')
      .select('id, status')
      .eq('order_id', order.id)
      .then(({ data }: { data: unknown[] | null }) => {
        setInvoiceInfo({
          hasInvoice: (data?.length ?? 0) > 0,
          totalAmount: order.total_amount ?? 0,
          paidAmount: order.paid_amount ?? 0,
        })
        setLoading(false)
      })
  }, [isOpen, order])

  const handleConfirm = async () => {
    if (!order || !newStatus || !user?.workspace_id) return
    setSaving(true)

    try {
      // 5/24：訂單狀態改走 updateOrder entity hook（自動失效訂單快取、狀態改後列表即時反映）
      await updateOrder(order.id, { status: newStatus })

      // order_status_logs 是 fire-and-forget 審計 log（無 UI 列表需失效）→ 維持直接 insert（合法豁免）
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('order_status_logs').insert({
        order_id: order.id,
        workspace_id: user.workspace_id,
        from_status: order.status ?? null,
        to_status: newStatus,
        changed_by: user.id,
      })

      onSuccess(order.id, newStatus)
      onClose()
    } catch (err) {
      logger.error('[OrderStatusChangeDialog] 狀態更新失敗:', err)
    } finally {
      setSaving(false)
    }
  }

  if (!order || !newStatus) return null

  const fromLabel = ORDER_STATUS_MAP[order.status as OrderStatus] ?? order.status ?? '—'
  const toLabel = ORDER_STATUS_MAP[newStatus]
  const remaining = (invoiceInfo?.totalAmount ?? 0) - (invoiceInfo?.paidAmount ?? 0)

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>變更訂單狀態</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 狀態轉換 */}
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline">{fromLabel}</Badge>
            <span className="text-muted-foreground">→</span>
            <Badge>{toLabel}</Badge>
          </div>

          {/* 帳單資訊 */}
          {loading ? (
            <p className="text-sm text-muted-foreground">載入中...</p>
          ) : (
            <div className="space-y-2 rounded-md border p-3 text-sm">
              <div className="flex items-center gap-2">
                {invoiceInfo?.hasInvoice ? (
                  <CheckCircle2 size={14} className="text-green-500" />
                ) : (
                  <AlertCircle size={14} className="text-amber-500" />
                )}
                <span>帳單</span>
                <span className="ml-auto text-muted-foreground">
                  {invoiceInfo?.hasInvoice ? '已開立' : '尚未開立'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <FileText size={14} className="text-muted-foreground" />
                <span>應收金額</span>
                <span className="ml-auto tabular-nums">
                  NT$ {(invoiceInfo?.totalAmount ?? 0).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {remaining <= 0 ? (
                  <CheckCircle2 size={14} className="text-green-500" />
                ) : (
                  <AlertCircle size={14} className="text-amber-500" />
                )}
                <span>待收金額</span>
                <span className="ml-auto tabular-nums">NT$ {remaining.toLocaleString()}</span>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">以上資訊僅供確認，未完成收款仍可儲存。</p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={saving || loading}>
            {saving ? '儲存中...' : '確認變更'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
