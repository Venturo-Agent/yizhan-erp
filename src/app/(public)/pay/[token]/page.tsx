'use client'

/**
 * /pay/[token] — 客戶自助付款公開頁(2026-05-15 William 拍板 batch 版)
 *
 * 流程:
 *   1. 進來 GET /api/public/invoices/[token]、token 對到 batch
 *   2. 顯示 batch 下所有 invoice items(每員一行)+ 公司收款帳號 + 歷次付款
 *   3. 客戶勾「我要付這幾個人」→ 系統算加總(不能改)→ 點「我要付款」
 *   4. Dialog 填: 收款方式(dropdown)/ 識別碼(動態 placeholder)/ 匯款日 / 備註 / 金額(唯讀)
 *   5. submit → POST /api/public/invoices/[token]/pay → 顯示「待確認」+ 重整列表
 *   6. 允許多次回訪付不同人(只要 batch.status != paid 且未過期)
 */

import { useCallback, useEffect, useMemo, useState, use } from 'react'
import { Loader2, CheckSquare, XCircle, AlertTriangle, Building2 } from 'lucide-react'
import { LABELS, BatchData } from './types'
import { AmountRow, BankRow, MemberRow, ReceiptHistoryRow } from './PaymentDisplayComponents'
import { PayFormDialog } from './PayFormDialog'

export default function PublicPayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [data, setData] = useState<BatchData | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [pendingSubmittedIds, setPendingSubmittedIds] = useState<Set<string>>(new Set())
  const [showForm, setShowForm] = useState(false)

  const fetchData = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true)
      setErrorMsg(null)
      try {
        const res = await fetch(`/api/public/invoices/${token}`)
        const json = await res.json()
        if (!res.ok) {
          setErrorMsg(json.error || '載入失敗')
          return
        }
        setData(json as BatchData)
        if (!silent) setSelected(new Set())
      } catch {
        setErrorMsg(LABELS.ERR_NETWORK)
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [token]
  )

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const selectedTotal = useMemo(() => {
    if (!data) return 0
    return data.invoices
      .filter(inv => selected.has(inv.id))
      .reduce((sum, inv) => sum + inv.remaining, 0)
  }, [data, selected])

  const handleToggle = (invoiceId: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(invoiceId)) next.delete(invoiceId)
      else next.add(invoiceId)
      return next
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-morandi-gold-light/30">
        <div className="text-center">
          <Loader2 className="h-8 w-8 mx-auto animate-spin text-morandi-gold" />
          <p className="mt-2 text-sm text-morandi-secondary">{LABELS.LOADING}</p>
        </div>
      </div>
    )
  }

  if (errorMsg || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-morandi-gold-light/30 p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-xl p-6 text-center shadow-sm">
          <XCircle className="h-12 w-12 mx-auto text-status-danger mb-3" />
          <h1 className="text-lg font-semibold text-morandi-primary mb-2">
            {LABELS.ERR_LOAD_FAILED_TITLE}
          </h1>
          <p className="text-sm text-morandi-secondary">
            {errorMsg || LABELS.ERR_INVOICE_NOT_FOUND}
          </p>
        </div>
      </div>
    )
  }

  const { batch, invoices, tour, workspace, payment_methods, receipts } = data
  const isAllPaid = batch.status === 'paid'
  const progressPercent =
    batch.total_amount > 0 ? Math.min(100, (batch.paid_amount / batch.total_amount) * 100) : 0

  return (
    <div className="min-h-screen bg-morandi-gold-light/30 py-6 px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 shadow-sm">
          {workspace?.logo_url ? (
            <img
              src={workspace.logo_url}
              alt={workspace.name}
              className="h-10 w-auto object-contain"
              style={{ maxWidth: '160px' }}
            />
          ) : (
            <Building2 className="h-8 w-8 text-morandi-gold" />
          )}
          <div className="flex-1">
            <h1 className="text-base font-semibold text-morandi-primary">{workspace?.name}</h1>
            <p className="text-xs text-morandi-secondary">{LABELS.PAGE_TITLE}</p>
          </div>
        </div>

        {/* 團摘要 + 加總 + 進度 */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
          <p className="text-sm text-morandi-primary">{LABELS.GREETING}</p>

          {tour && (
            <div className="text-sm space-y-1 pb-3 border-b border-border/40">
              <div className="flex">
                <span className="w-16 text-morandi-secondary">{LABELS.TOUR_NAME}</span>
                <span className="text-morandi-primary">
                  {tour.name} <span className="text-morandi-secondary">({tour.code})</span>
                </span>
              </div>
              {tour.departure_date && (
                <div className="flex">
                  <span className="w-16 text-morandi-secondary">{LABELS.DEPARTURE_DATE}</span>
                  <span className="text-morandi-primary">{tour.departure_date}</span>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <AmountRow label={LABELS.TOTAL_AMOUNT} amount={batch.total_amount} />
            <AmountRow label={LABELS.PAID_AMOUNT} amount={batch.paid_amount} />
            <div className="h-px bg-border my-2" />
            <AmountRow
              label={LABELS.REMAINING}
              amount={batch.remaining}
              emphasis
              strikeThrough={isAllPaid}
            />
            <div className="mt-2 h-2 rounded-full bg-morandi-gold-light overflow-hidden">
              <div
                className="h-full bg-morandi-gold transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {isAllPaid && (
            <div className="flex items-center gap-2 px-3 py-2 bg-status-success/10 border border-status-success/30 rounded-lg text-status-success text-sm">
              <CheckSquare className="h-4 w-4" />
              {LABELS.ALL_PAID}
            </div>
          )}
        </div>

        {/* 公司收款帳號 */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-morandi-primary mb-3">
            {LABELS.BANK_INFO_TITLE}
          </h2>
          {workspace?.bank && workspace.bank.account ? (
            <div className="text-sm space-y-1.5">
              <BankRow
                label={LABELS.BANK_LABEL}
                value={`${workspace.bank.bank_name || '-'}${workspace.bank.bank_code ? ` (${workspace.bank.bank_code})` : ''}`}
              />
              <BankRow label={LABELS.BRANCH_LABEL} value={workspace.bank.branch || '-'} />
              <BankRow label={LABELS.ACCOUNT_LABEL} value={workspace.bank.account} mono />
              <BankRow
                label={LABELS.ACCOUNT_NAME_LABEL}
                value={workspace.bank.account_name || '-'}
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-morandi-secondary">
              <AlertTriangle className="h-4 w-4 text-status-danger" />
              {LABELS.NO_BANK_INFO}
            </div>
          )}
        </div>

        {/* 團員應付明細 + checkbox */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-morandi-primary mb-3">
            {LABELS.MEMBERS_TITLE}
          </h2>
          <div className="space-y-1">
            {invoices.map(inv => (
              <MemberRow
                key={inv.id}
                invoice={inv}
                checked={selected.has(inv.id)}
                onToggle={() => handleToggle(inv.id)}
                pendingSubmit={pendingSubmittedIds.has(inv.id) && inv.status !== 'paid'}
              />
            ))}
          </div>
        </div>

        {/* 歷次付款 */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-morandi-primary mb-3">
            {LABELS.HISTORY_TITLE}
          </h2>
          {receipts.length === 0 ? (
            <p className="text-sm text-morandi-secondary text-center py-2">{LABELS.NO_RECEIPTS}</p>
          ) : (
            <div className="space-y-2">
              {receipts.map(r => (
                <ReceiptHistoryRow key={r.id} receipt={r} />
              ))}
            </div>
          )}
        </div>

        {/* 付款按鈕 */}
        {!isAllPaid && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            disabled={selected.size === 0}
            className="w-full py-3 rounded-xl shadow-sm disabled:opacity-50 disabled:cursor-not-allowed [background:var(--btn-primary-bg)] [color:var(--btn-primary-fg)] [border-color:var(--btn-primary-border)] border font-semibold transition-[filter] hover:brightness-[.96] active:brightness-[.92]"
          >
            {selected.size === 0
              ? LABELS.ERR_NO_SELECTION
              : `${LABELS.PAY_BUTTON_PREFIX} ${selected.size} ${LABELS.PAY_BUTTON_SUFFIX}（共 ${selectedTotal.toLocaleString()}）`}
          </button>
        )}
      </div>

      {/* 付款 form Dialog */}
      {showForm && !isAllPaid && (
        <PayFormDialog
          token={token}
          selectedIds={Array.from(selected)}
          totalAmount={selectedTotal}
          paymentMethods={payment_methods}
          initialNotes={invoices
            .filter(inv => selected.has(inv.id))
            .map(inv => inv.member_name)
            .join('、')}
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false)
            setPendingSubmittedIds(prev => new Set([...prev, ...Array.from(selected)]))
            setSelected(new Set())
            void fetchData(true)
          }}
        />
      )}
    </div>
  )
}
