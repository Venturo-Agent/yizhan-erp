'use client'
/**
 * DisbursementDetailDialog
 * 出納單詳情對話框 - 用於查看詳情和確認出帳
 *
 * Phase 7（2026-05-17）：品項列表按銀行帳戶分區顯示（每個 bank group 加標題）
 */

import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { Check, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import {
  DisbursementOrder,
  PaymentRequest,
} from '@/stores/types'
import {
  usePaymentRequests,
  updatePaymentRequest as updatePaymentRequestApi,
  updateDisbursementOrder as updateDisbursementOrderApi,
} from '@/data'
import { useAuthStore } from '@/stores/auth-store'
import { DateCell, CurrencyCell } from '@/components/table-cells'
import { DisbursementPrintDialog } from './DisbursementPrintDialog'
import { DisbursementRequestsTable } from './DisbursementRequestsTable'
import { DisbursementPaymentStats } from './DisbursementPaymentStats'
import { confirm, alert } from '@/lib/ui/alert-dialog'
import { logger } from '@/lib/utils/logger'
import { apiPost, extractHttpErrorMessage } from '@/lib/api/client'
import { useTranslations } from 'next-intl'
import { recalculateExpenseStats } from '@/app/(main)/finance/payments/_services/expense-core.service'
// jsPDF + jspdf-autotable 大型 library（~150KB）→ 動態 import、只在點「確認出帳」才載入

// Phase 7：bank group 資料結構
interface BankGroupItem {
  doi_id: string
  payment_request_item_id: string
  amount: number
  description: string | null
  supplier_name: string | null
  request_code: string | null
  from_bank_account_id: string
}
interface BankGroup {
  bank_account_id: string
  bank_label: string   // "玉山銀行 (…1234)"
  items: BankGroupItem[]
  subtotal: number
}

interface DisbursementDetailDialogProps {
  order: DisbursementOrder | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DisbursementDetailDialog({
  order,
  open,
  onOpenChange,
}: DisbursementDetailDialogProps) {
  const t = useTranslations('finance')
  const { items: payment_requests } = usePaymentRequests({ all: true })
  const user = useAuthStore(state => state.user)
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState<Array<{ id: string; name: string }>>([])
  // Phase 7：按銀行分區的品項資料
  const [bankGroups, setBankGroups] = useState<BankGroup[]>([])

  // 載入付款方式
  useEffect(() => {
    if (!open || !order) return
    const workspaceId = user?.workspace_id
    if (!workspaceId) return
    supabase
      .from('payment_methods')
      .select('id, name')
      .eq('workspace_id', workspaceId)
      .eq('type', 'payment')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .then(({ data }) => setPaymentMethods(data || []))
  }, [open, order, user?.workspace_id])

  // Phase 7：載入 DOI + bank group 資料
  useEffect(() => {
    if (!open || !order) { setBankGroups([]); return }
    void (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamicFrom escape hatch
      const { data } = await (supabase as any)
        .from('disbursement_order_items')
        .select(`
          id,
          payment_request_item_id,
          from_bank_account_id,
          amount,
          bank_accounts:from_bank_account_id(id, name, account_number),
          payment_request_items:payment_request_item_id(description, supplier_name, request_id,
            payment_requests:request_id(code))
        `)
        .eq('disbursement_order_id', order.id)

      if (!data) { setBankGroups([]); return }

      type DoiDetailRow = {
        id: string
        payment_request_item_id: string
        from_bank_account_id: string
        amount: number
        bank_accounts: { id: string; name: string; account_number: string | null } | null
        payment_request_items: {
          description: string | null
          supplier_name: string | null
          request_id: string
          payment_requests: { code: string | null } | null
        } | null
      }

      const grouped = new Map<string, BankGroup>()
      for (const row of data as DoiDetailRow[]) {
        const bankId = row.from_bank_account_id
        if (!grouped.has(bankId)) {
          const bankName = row.bank_accounts?.name ?? '未知帳戶'
          const acctLast4 = row.bank_accounts?.account_number?.slice(-4) ?? '????'
          grouped.set(bankId, {
            bank_account_id: bankId,
            bank_label: `${bankName}（…${acctLast4}）`,
            items: [],
            subtotal: 0,
          })
        }
        const group = grouped.get(bankId)!
        group.items.push({
          doi_id: row.id,
          payment_request_item_id: row.payment_request_item_id,
          amount: Number(row.amount ?? 0),
          description: row.payment_request_items?.description ?? null,
          supplier_name: row.payment_request_items?.supplier_name ?? null,
          request_code: row.payment_request_items?.payment_requests?.code ?? null,
          from_bank_account_id: bankId,
        })
        group.subtotal += Number(row.amount ?? 0)
      }
      setBankGroups(Array.from(grouped.values()))
    })()
  }, [open, order])

  // 取得此出納單包含的請款單（FK 反查）
  const includedRequests = useMemo(() => {
    if (!order?.id) return []
    return payment_requests.filter(r => r.disbursement_order_id === order.id) as PaymentRequest[]
  }, [order, payment_requests])

  // 分類：團體請款 vs 公司請款
  const tourRequests = useMemo(
    () => includedRequests.filter(r => r.request_category !== 'company'),
    [includedRequests]
  )
  const companyRequests = useMemo(
    () => includedRequests.filter(r => r.request_category === 'company'),
    [includedRequests]
  )

  // 付款方式統計
  const paymentMethodStats = useMemo(() => {
    const stats = new Map<string, number>()
    for (const req of includedRequests) {
      const methodId = req.payment_method_id || 'unknown'
      stats.set(methodId, (stats.get(methodId) || 0) + (req.amount || 0))
    }
    return Array.from(stats.entries()).map(([id, amount]) => ({
      name: paymentMethods.find(m => m.id === id)?.name || '未指定',
      amount,
    }))
  }, [includedRequests, paymentMethods])

  if (!order) return null

  // 確認出帳（銀行帳戶已在建立時選好）
  const handleConfirmPaid = async () => {
    const confirmed = await confirm(t('disbursementConfirmPaid'), {
      title: t('disbursementConfirmPaidTitle'),
      type: 'warning',
    })
    if (!confirmed) return

    try {
      // 1. 更新出納單狀態（先樂觀寫入、傳票失敗會 revert）
      await updateDisbursementOrderApi(order.id, {
        status: 'paid',
        confirmed_by: user?.id || null,
        confirmed_at: new Date().toISOString(),
      })

      // 2. 自動產生會計傳票（沖應付 / 銀行支出）
      // 傳票失敗 = 會計帳會不平、必須擋下、把出納單狀態 revert 回 pending
      try {
        if (user?.workspace_id) {
          try {
            await apiPost('/api/accounting/vouchers/auto-create', {
              source_type: 'disbursement_order',
              source_id: order.id,
              workspace_id: user.workspace_id,
            })
          } catch (err) {
            throw new Error(`產生會計傳票失敗：${extractHttpErrorMessage(err, '未知錯誤')}`)
          }
        }
      } catch (voucherErr) {
        // revert 出納單狀態、避免留下「已出帳但無傳票」的不平帳資料
        logger.error('產生出納傳票失敗、revert 狀態:', voucherErr)
        await updateDisbursementOrderApi(order.id, {
          status: 'pending',
          confirmed_by: null,
          confirmed_at: null,
        })
        throw voucherErr
      }

      // 3. 更新所有請款單狀態為 paid（從 FK 反查、5/15 SSOT 對齊：billed 已併入 paid）
      const requestIds = includedRequests.map(r => r.id)
      const tour_ids_to_recalculate = new Set<string>()
      for (const requestId of requestIds) {
        await updatePaymentRequestApi(requestId, {
          status: 'paid',
        })
        const req = payment_requests.find(r => r.id === requestId)
        if (req?.tour_id) {
          tour_ids_to_recalculate.add(req.tour_id)
        }
      }

      // 4. 重算相關團的成本
      for (const tour_id of tour_ids_to_recalculate) {
        await recalculateExpenseStats(tour_id)
      }

      // 5. 自動存檔 PDF（best-effort、失敗不 revert 但要告訴使用者）
      let pdfFailed = false
      try {
        const allItems = await supabase
          .from('payment_request_items')
          .select(
            'id, request_id, description, quantity, unit_price, subtotal, category, tour_id, supplier_name, sort_order, item_number, notes, workspace_id'
          )
          .in('request_id', requestIds)
        const { generateDisbursementPDF } = await import('@/lib/pdf/disbursement-pdf')
        // Phase 7：若有 bankGroups 則用多銀行分區排版，否則 fallback 舊路徑
        const pdfBankGroups = bankGroups.length > 0
          ? bankGroups.map(g => ({
              bank_label: g.bank_label,
              items: g.items.map(i => ({
                request_code: i.request_code,
                description: i.description,
                supplier_name: i.supplier_name,
                amount: i.amount,
              })),
              subtotal: g.subtotal,
            }))
          : undefined
        const blob = await generateDisbursementPDF({
          order: {
            ...order,
            status: 'paid',
            confirmed_by: user?.id || null,
            confirmed_at: new Date().toISOString(),
          },
          paymentRequests: includedRequests,
          paymentRequestItems: (allItems.data ||
            []) as unknown as import('@/stores/types').PaymentRequestItem[],
          bankGroups: pdfBankGroups,
        })
        const filename = `disbursement/${order.order_number || order.id}.pdf`
        const { error: uploadErr } = await supabase.storage
          .from('documents')
          .upload(filename, blob, { contentType: 'application/pdf', upsert: true })
        if (uploadErr) throw uploadErr
        const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filename)
        if (urlData?.publicUrl) {
          await updateDisbursementOrderApi(order.id, {
            pdf_url: urlData.publicUrl,
          } as Partial<DisbursementOrder>)
        }
      } catch (pdfErr) {
        pdfFailed = true
        logger.error('PDF 存檔失敗:', pdfErr)
      }

      await alert(
        pdfFailed
          ? `${t('disbursementMarkedAsPaid')}（但 PDF 存檔失敗、可從列印按鈕重試）`
          : t('disbursementMarkedAsPaid'),
        pdfFailed ? 'warning' : 'success'
      )
      onOpenChange(false)
    } catch (error) {
      logger.error(t('disbursementUpdateFailedColon'), error)
      const msg = error instanceof Error ? error.message : t('disbursementUpdateFailed')
      await alert(msg, 'error')
    }
  }

  const handlePrintPDF = () => {
    setIsPrintDialogOpen(true)
  }

  return (
    <>
      {/* 主 Dialog：子 Dialog 開啟時完全不渲染（避免多重遮罩） */}
      {!isPrintDialogOpen && (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent level={1} className="!max-w-[90vw] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-xl">
                    {t('disbursementDocTitle')} {order.order_number}
                  </DialogTitle>
                  <div className="text-sm text-morandi-muted mt-1 flex items-center gap-1">
                    {t('disbursementDateLabel')}：
                    <DateCell
                      date={order.disbursement_date}
                      showIcon={false}
                      className="text-morandi-muted"
                    />
                  </div>
                </div>
                <StatusBadge type="disbursement" status={order.status} />
              </div>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              {/* 基本資訊 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-morandi-background/50 rounded-lg">
                <InfoItem label={t('disbursementNumber')} value={order.order_number || '-'} />
                <div>
                  <p className="text-xs text-morandi-muted mb-1">
                    {t('disbursementDateLabel')}
                  </p>
                  <DateCell date={order.disbursement_date} showIcon={false} className="text-sm" />
                </div>
                <InfoItem
                  label={t('disbursementRequestCount')}
                  value={`${includedRequests.length} ${t('disbursementUnit')}`}
                />
                <div>
                  <p className="text-xs text-morandi-muted mb-1">
                    {t('disbursementTotalLabel')}
                  </p>
                  <CurrencyCell
                    amount={order.amount || 0}
                    className="font-semibold text-morandi-gold"
                  />
                </div>
              </div>

              {/* Phase 7：銀行帳戶分區品項列表（若有 DOI 資料則優先顯示） */}
              {bankGroups.length > 0 ? (
                <div className="space-y-4">
                  {bankGroups.map((group, idx) => (
                    <div key={group.bank_account_id}>
                      {/* 分隔線 + 銀行標題 */}
                      {idx > 0 && <hr className="border-t-2 border-morandi-primary/30 my-3" />}
                      <h3 className="text-sm font-bold text-morandi-primary mb-2">
                        {group.bank_label}
                        <span className="ml-2 font-normal text-morandi-secondary text-xs">
                          （{group.items.length} 筆）
                        </span>
                      </h3>
                      <div className="border border-morandi-container/20 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-morandi-gold-header border-b border-border">
                              <th className="text-left py-2 px-3 text-xs font-medium text-morandi-primary">請款單號</th>
                              <th className="text-left py-2 px-3 text-xs font-medium text-morandi-primary">品項</th>
                              <th className="text-left py-2 px-3 text-xs font-medium text-morandi-primary">付款對象</th>
                              <th className="text-right py-2 px-3 text-xs font-medium text-morandi-primary">金額</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.items.map(item => (
                              <tr key={item.doi_id} className="border-b border-morandi-container/10">
                                <td className="py-1.5 px-3 font-medium text-morandi-primary">{item.request_code ?? '-'}</td>
                                <td className="py-1.5 px-3 text-morandi-secondary">{item.description ?? '-'}</td>
                                <td className="py-1.5 px-3 text-morandi-secondary">{item.supplier_name ?? '-'}</td>
                                <td className="py-1.5 px-3 text-right">
                                  <CurrencyCell amount={item.amount} className="font-medium text-morandi-gold" />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-morandi-background/50">
                              <td colSpan={3} className="py-2 px-3 text-right font-semibold text-sm">小計</td>
                              <td className="py-2 px-3 text-right">
                                <CurrencyCell amount={group.subtotal} className="font-bold text-morandi-gold" />
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* 舊資料 fallback：按請款單顯示（未有 DOI 的舊出納單） */
                <DisbursementRequestsTable
                  tourRequests={tourRequests}
                  companyRequests={companyRequests}
                />
              )}

              {/* 付款方式統計 */}
              <DisbursementPaymentStats
                stats={paymentMethodStats}
                total={order.amount || 0}
              />

              {/* 操作按鈕 */}
              <div className="flex items-center justify-between pt-4 border-t border-morandi-container/20">
                {/* 列印按鈕只在已出帳時顯示 */}
                {order.status === 'paid' && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="soft-gold"
                      onClick={handlePrintPDF}
                      className="text-morandi-gold border-morandi-gold hover:bg-morandi-gold/10"
                    >
                      <FileText size={16} className="mr-2" />
                      {t('disbursementPrintPdf')}
                    </Button>
                    {order.pdf_url && (
                      <a href={order.pdf_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm">
                          {t('disbursementViewArchive')}
                        </Button>
                      </a>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  {order.status === 'pending' && (
                    <Button
                      onClick={handleConfirmPaid}
                      className="bg-morandi-green hover:bg-morandi-green/90 text-white"
                    >
                      <Check size={16} className="mr-2" />
                      {t('disbursementConfirmPaidTitle')}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 列印預覽對話框 - 放在外層避免多重遮罩 */}
      <DisbursementPrintDialog
        order={order}
        open={isPrintDialogOpen}
        onOpenChange={setIsPrintDialogOpen}
      />
    </>
  )
}

// 資訊項目組件
function InfoItem({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div>
      <p className="text-xs text-morandi-muted mb-1">{label}</p>
      <p
        className={`text-sm ${highlight ? 'font-semibold text-morandi-gold' : 'text-morandi-primary'}`}
      >
        {value}
      </p>
    </div>
  )
}
