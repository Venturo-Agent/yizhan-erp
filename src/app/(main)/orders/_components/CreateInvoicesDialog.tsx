'use client'

/**
 * CreateInvoicesDialog — 帳單管理（左：開新帳單 / 右：歷史帳單）
 *
 * 2026-05-15 William 拍板：
 *   - 從「一人一單 N 條 link」改成「一批一 link、客戶端勾選代付」
 *   - 大版面（max-w-7xl）左右分版
 *   - 左側「開新帳單」：團員清單 + 勾選 + 金額 + 確認、成功後只顯示 1 條 link
 *   - 右側「歷史帳單」：該訂單既有 batch 列表 + 各員付款狀態
 *
 * 流程：
 *   1. 列團員 + checkbox + 金額 + 說明（移除「全部帶入」按鈕、保留「全選」）
 *   2. 確認 → POST /api/invoices → 建 1 個 batch + N 個 invoices → 回 1 條 token
 *   3. 顯示成功狀態 + 1 條 link（替代之前的 N 條）
 *   4. 右側即時撈該訂單歷史 batches、可複製 link / 看各員付款狀態
 */

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useAsyncSubmit } from '@/hooks/useAsyncSubmit'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Receipt, History, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { dynamicFrom } from '@/lib/supabase/typed-client'
import { logger } from '@/lib/utils/logger'
import { apiMutate } from '@/lib/swr/api-mutate'
import type { OrderMember } from '../_types/order-member.types'

import { NewInvoiceForm } from './_invoice-dialog/NewInvoiceForm'
import { SuccessPanel } from './_invoice-dialog/SuccessPanel'
import { HistoryBatchCard } from './_invoice-dialog/HistoryBatchCard'
import {
  type CreatedBatch,
  type HistoryBatch,
  type MemberFlightRow,
  formatFlightSegment,
} from './_invoice-dialog/invoice-dialog.types'

interface CreateInvoicesDialogProps {
  open: boolean
  onClose: () => void
  orderId: string
  orderCode?: string | null
  members: OrderMember[]
}

function getDefaultAmount(member: OrderMember): number {
  return (
    member.selling_price ||
    member.total_payable ||
    (member.deposit_amount ?? 0) + (member.balance_amount ?? 0) ||
    0
  )
}

export function CreateInvoicesDialog({
  open,
  onClose,
  orderId,
  orderCode,
  members,
}: CreateInvoicesDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  // 5/15 改：值用 number | null（搭配 CalcInput）、null = 還沒填、placeholder 顯示「0」
  const [amounts, setAmounts] = useState<Record<string, number | null>>({})
  const [costs, setCosts] = useState<Record<string, number | null>>({})
  const [descriptions, setDescriptions] = useState<Record<string, string>>({})
  const [createdBatch, setCreatedBatch] = useState<CreatedBatch | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  // 歷史 batches
  const [history, setHistory] = useState<HistoryBatch[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const fetchHistory = useCallback(async () => {
    if (!orderId) return
    setHistoryLoading(true)
    try {
      const res = await fetch(`/api/invoice-batches?order_id=${encodeURIComponent(orderId)}`)
      const json = await res.json()
      if (res.ok) setHistory(json.batches || [])
      else setHistory([])
    } catch {
      setHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    if (open) void fetchHistory()
  }, [open, fetchHistory])

  // 「帶入」單行：填預設成本 / 售價 / 說明
  const handleFillRow = (member: OrderMember) => {
    setCosts(prev => ({ ...prev, [member.id]: member.cost_price || 0 }))
    setAmounts(prev => ({ ...prev, [member.id]: getDefaultAmount(member) }))
    setDescriptions(prev => ({
      ...prev,
      [member.id]: `${orderCode || ''} ${member.chinese_name || ''}`.trim() || '團費',
    }))
    setSelected(prev => {
      const next = new Set(prev)
      next.add(member.id)
      return next
    })
  }

  // 帶入「機票」項目
  const handleFillItem = async (member: OrderMember, item: 'flight') => {
    if (item !== 'flight') return
    const flightCost = member.flight_cost || 0
    setCosts(prev => {
      const current = prev[member.id] || 0
      return { ...prev, [member.id]: current + flightCost }
    })

    let append = '機票'
    try {
      const { data: flights } = await dynamicFrom('member_flights')
        .select('airline, flight_number, departure_date, departure_time, arrival_time, origin, destination')
        .eq('member_id', member.id)
        .order('segment_index', { ascending: true })

      if (flights && flights.length > 0) {
        append = (flights as MemberFlightRow[]).map(formatFlightSegment).join(' ｜ ')
      }
    } catch {
      // fallback「機票」
    }

    setDescriptions(prev => {
      const current = prev[member.id] || ''
      return {
        ...prev,
        [member.id]: current ? `${current} + ${append}` : append,
      }
    })
    setSelected(prev => {
      const next = new Set(prev)
      next.add(member.id)
      return next
    })
  }

  // 過濾沒 customer_id 的 member
  const availableMembers = useMemo(
    () => members.filter(m => m.customer_id && m.customer_id.trim()),
    [members]
  )

  const handleToggle = (memberId: string) => {
    const next = new Set(selected)
    if (next.has(memberId)) next.delete(memberId)
    else next.add(memberId)
    setSelected(next)
  }

  const handleSelectAll = () => {
    if (selected.size === availableMembers.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(availableMembers.map(m => m.id)))
    }
  }

  const { isSubmitting: submitting, execute: handleSubmit } = useAsyncSubmit(
    async () => {
      if (selected.size === 0) {
        toast.error('請至少選一位團員')
        return
      }

      const splits = Array.from(selected).map(memberId => {
        const member = members.find(m => m.id === memberId)!
        const amt = amounts[memberId] || 0
        return {
          member_id: memberId,
          customer_id: member.customer_id!,
          total_amount: amt,
          notes: descriptions[memberId] || null,
        }
      })

      const validSplits = splits.filter(s => s.total_amount > 0)
      if (validSplits.length === 0) {
        toast.error('金額必須大於 0')
        return
      }

      const res = await apiMutate<{ batch: CreatedBatch; error?: string; details?: string; hint?: string; code?: string }>(
        '/api/invoices',
        {
          method: 'POST',
          body: { order_id: orderId, splits: validSplits },
          invalidate: [`/api/invoice-batches?order_id=${encodeURIComponent(orderId)}`],
        }
      )

      if (!res.ok || !res.data) {
        logger.error('[/api/invoices POST] failed:', res.status, res.data)
        throw new Error(
          res.data?.error || res.data?.details || res.data?.hint || res.data?.code || res.error || `建帳單失敗 (HTTP ${res.status})`
        )
      }

      setCreatedBatch(res.data.batch)
      toast.success(`成功開立 ${res.data.batch.invoice_count} 人帳單、產生 1 條付款連結`)
      // 重整歷史
      void fetchHistory()
    },
    { onError: () => toast.error('建帳單失敗，請稍後再試') }
  )

  const buildLink = (token: string): string => {
    const base = typeof window !== 'undefined' ? window.location.origin : ''
    return `${base}/pay/${token}`
  }

  const handleCopy = async (token: string) => {
    const link = buildLink(token)
    try {
      await navigator.clipboard.writeText(link)
      setCopied(token)
      setTimeout(() => setCopied(null), 1500)
      toast.success('Link 已複製')
    } catch {
      toast.error('複製失敗')
    }
  }

  const handleClose = () => {
    setSelected(new Set())
    setCreatedBatch(null)
    setCopied(null)
    setAmounts({})
    setCosts({})
    setDescriptions({})
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt size={18} />
            帳單 {orderCode ? `（訂單 ${orderCode}）` : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
          {/* 左側：開新帳單 */}
          <div className="space-y-3">
            {createdBatch ? (
              <SuccessPanel
                batch={createdBatch}
                link={buildLink(createdBatch.public_token)}
                copied={copied === createdBatch.public_token}
                onCopy={() => handleCopy(createdBatch.public_token)}
                onAnother={() => {
                  setCreatedBatch(null)
                  setSelected(new Set())
                }}
              />
            ) : availableMembers.length === 0 ? (
              <div className="text-sm text-morandi-secondary py-8 text-center border border-dashed border-border rounded-lg">
                此訂單沒有已綁定客戶資料的團員、無法開帳單。
                <br />
                請先在團員列表為團員綁定客戶。
              </div>
            ) : (
              <NewInvoiceForm
                availableMembers={availableMembers}
                members={members}
                selected={selected}
                amounts={amounts}
                costs={costs}
                descriptions={descriptions}
                setAmounts={setAmounts}
                setCosts={setCosts}
                setDescriptions={setDescriptions}
                onToggle={handleToggle}
                onSelectAll={handleSelectAll}
                onFillRow={handleFillRow}
                onFillItem={handleFillItem}
              />
            )}
          </div>

          {/* 右側：歷史帳單 */}
          <div className="border-l border-border lg:pl-4">
            <div className="flex items-center gap-2 mb-3">
              <History size={16} className="text-morandi-secondary" />
              <h3 className="text-sm font-semibold text-morandi-primary">歷史帳單</h3>
              {history.length > 0 && (
                <span className="text-xs text-morandi-secondary">（{history.length} 批）</span>
              )}
            </div>

            {historyLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-5 w-5 mx-auto animate-spin text-morandi-secondary" />
              </div>
            ) : history.length === 0 ? (
              <div className="text-sm text-morandi-secondary text-center py-8 border border-dashed border-border rounded-lg">
                尚未開過帳單
              </div>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {history.map(b => (
                  <HistoryBatchCard
                    key={b.id}
                    batch={b}
                    link={buildLink(b.public_token)}
                    copied={copied === b.public_token}
                    onCopy={() => handleCopy(b.public_token)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {!createdBatch && availableMembers.length > 0 && (
          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={submitting}>
              取消
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || selected.size === 0}
            >
              {submitting ? '建立中…' : `開帳單 (${selected.size} 人)`}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
