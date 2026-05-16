'use client'

/**
 * CustomerInfoSidebar
 *
 * 對話頁右側「客戶資訊」面板。
 *
 * 狀態：
 *   - 載入中：顯示 loading
 *   - 沒綁：顯示「綁定到客戶」按鈕
 *   - 有綁：顯示客戶名 / 電話 / Email + 最近 10 筆訂單 + 「解綁」按鈕
 *
 * 資料源：GET /api/line/conversations/{lineUserId}/customer-orders
 */

import { useState } from 'react'
import useSWR from 'swr'
import { formatDate as formatDateSSOT } from '@/lib/utils/format-date'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Link2, Unlink, User, Phone, Mail, ShoppingBag } from 'lucide-react'
import { toast } from 'sonner'
import { confirm } from '@/lib/ui/alert-dialog'
import { BindCustomerDialog } from './BindCustomerDialog'
import type { CustomerOrdersResponse } from '@/app/api/line/conversations/[lineUserId]/customer-orders/route'

interface CustomerInfoSidebarProps {
  lineUserId: string
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const j = await res.json().catch(() => ({}))
    throw new Error(j.error || '載入失敗')
  }
  return res.json()
}

// 走 SSOT formatDate（YYYY-MM-DD）+ '-' 保留原 fallback
function formatDate(iso: string | null) {
  if (!iso) return '-'
  return formatDateSSOT(iso) || '-'
}

function formatCurrency(n: number | null | undefined) {
  if (n == null) return '-'
  return `NT$ ${n.toLocaleString('zh-TW')}`
}

export function CustomerInfoSidebar({ lineUserId }: CustomerInfoSidebarProps) {
  const url = `/api/line/conversations/${encodeURIComponent(lineUserId)}/customer-orders`
  const { data, error, isLoading, mutate } = useSWR<CustomerOrdersResponse>(url, fetcher, {
    revalidateOnFocus: false,
  })

  const [dialogOpen, setDialogOpen] = useState(false)
  const [unbinding, setUnbinding] = useState(false)

  const handleUnbind = async () => {
    const confirmed = await confirm('確定要解除綁定這個客戶嗎？解綁後對話跟客戶歷史訂單會脫鉤。', { title: '解除綁定', type: 'warning' })
    if (!confirmed) return
    setUnbinding(true)
    try {
      const res = await fetch(
        `/api/line/conversations/${encodeURIComponent(lineUserId)}/bind-customer`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customer_id: null }),
        }
      )
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(json.error || '解綁失敗')
        return
      }
      toast.success('已解除綁定')
      mutate()
    } catch {
      toast.error('網路錯誤')
    } finally {
      setUnbinding(false)
    }
  }

  if (isLoading) {
    return (
      <Card className="p-4">
        <p className="text-sm text-morandi-secondary">載入客戶資訊中...</p>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-4 border-status-danger/30 bg-status-danger/5">
        <p className="text-sm text-status-danger">
          載入失敗：{(error as Error).message}
        </p>
      </Card>
    )
  }

  const customer = data?.customer ?? null
  const orders = data?.orders ?? []

  return (
    <>
      <div className="space-y-3">
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-morandi-primary flex items-center gap-2">
              <User className="h-4 w-4 text-morandi-gold" />
              客戶資訊
            </h3>
            {customer ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUnbind}
                disabled={unbinding}
                className="gap-1 text-xs"
              >
                <Unlink className="h-3 w-3" />
                {unbinding ? '解綁中...' : '解綁'}
              </Button>
            ) : (
              <Button
                variant="soft-gold"
                size="sm"
                onClick={() => setDialogOpen(true)}
                className="gap-1 text-xs"
              >
                <Link2 className="h-3 w-3" />
                綁定到客戶
              </Button>
            )}
          </div>

          {customer ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-baseline gap-2">
                <span className="text-morandi-secondary text-xs w-12 shrink-0">姓名</span>
                <span className="text-morandi-primary font-medium">
                  {customer.name}
                  {customer.code && (
                    <span className="text-morandi-muted text-xs ml-2">{customer.code}</span>
                  )}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <Phone className="h-3 w-3 text-morandi-secondary mt-1 shrink-0" />
                <span className="text-morandi-primary">{customer.phone || '-'}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <Mail className="h-3 w-3 text-morandi-secondary mt-1 shrink-0" />
                <span className="text-morandi-primary break-all">
                  {customer.email || '-'}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-morandi-muted">
              尚未綁定客戶。綁定後可在這裡看到客戶資料 + 歷史訂單。
            </p>
          )}
        </Card>

        {customer && (
          <Card className="p-4 space-y-2">
            <h3 className="text-sm font-semibold text-morandi-primary flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-morandi-gold" />
              最近訂單
              <span className="text-xs text-morandi-muted font-normal">（最多 10 筆）</span>
            </h3>

            {orders.length === 0 ? (
              <p className="text-xs text-morandi-muted py-2">這個客戶還沒有訂單</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {orders.map(order => (
                  <div
                    key={order.id}
                    className="rounded-md border border-border p-2.5 text-xs space-y-1 hover:bg-morandi-container/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-morandi-primary">
                        {order.order_number || order.id.slice(0, 8)}
                      </span>
                      {order.payment_status && (
                        <span className="text-[0.588rem] px-1.5 py-0.5 rounded bg-morandi-container/50 text-morandi-secondary">
                          {order.payment_status}
                        </span>
                      )}
                    </div>
                    {order.tour_name && (
                      <div className="text-morandi-secondary line-clamp-2">
                        {order.tour_name}
                      </div>
                    )}
                    <div className="flex items-center justify-between text-morandi-muted">
                      <span>出發：{formatDate(order.departure_date)}</span>
                      <span className="font-medium text-morandi-primary">
                        {formatCurrency(order.total_amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>

      <BindCustomerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        lineUserId={lineUserId}
        onBound={() => mutate()}
      />
    </>
  )
}
