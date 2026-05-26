'use client'

/**
 * /pay/mock/[token] — 永豐線上刷卡 mock 付款頁
 *
 * Phase 1（2026-05-22 William 拍板）：純 UI demo、後端 API 是 mock、不真接永豐。
 *
 * 流程：
 *   1. 進來 GET /api/pay/mock/[token]、撈交易資訊（金額 / provider / 公司名）
 *   2. 顯示永豐 EPOS 風格的刷卡表單（卡號 / 過期 / CVV、純假表單、不真驗證）
 *   3. 客戶按「付款」→ POST /api/payment-webhooks/mock/[token]
 *      → 後端把 transaction status pending → captured + receipts status confirmed
 *   4. 顯示付款成功畫面
 *
 * Phase 2：替換成永豐 EPOS URL 付款頁 iframe、不會再有這個 mock 頁。
 */

import { useEffect, useState, use } from 'react'
import { Loader2, CheckSquare, AlertTriangle, CreditCard, Lock } from 'lucide-react'

interface TxData {
  id: string
  provider: string
  amount: number
  currency: string
  customer_name: string | null
  customer_email: string | null
  status: string
  payment_link_expires_at: string | null
  external_trans_no: string | null
  external_approve_code: string | null
  provider_info: { provider_name: string; provider_kind: string } | null
  workspace: { name: string } | null
}

export default function MockPaymentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [tx, setTx] = useState<TxData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // 假表單欄位（不真寄、純 UI demo）
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [cardholder, setCardholder] = useState('')

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/pay/mock/${token}`)
        const json = await res.json()
        if (!res.ok) {
          setError(json.error || '讀取失敗')
          return
        }
        setTx(json.data)
        if (json.data?.status === 'captured') {
          setSuccess(true)
        }
      } catch {
        setError('連線失敗')
      } finally {
        setLoading(false)
      }
    })()
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/payment-webhooks/mock/${token}`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || '付款失敗')
        return
      }
      setSuccess(true)
      // 重撈最新狀態
      const refreshRes = await fetch(`/api/pay/mock/${token}`)
      const refreshJson = await refreshRes.json()
      if (refreshRes.ok) setTx(refreshJson.data)
    } catch {
      setError('連線失敗')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-morandi-container/30">
        <Loader2 className="w-8 h-8 animate-spin text-morandi-gold" />
      </div>
    )
  }

  if (error && !tx) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-morandi-container/30 px-4">
        <div className="max-w-md w-full bg-card rounded-xl border border-border p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-status-danger mx-auto mb-4" />
          <h1 className="text-lg font-semibold text-morandi-primary mb-2">無法載入</h1>
          <p className="text-sm text-morandi-secondary">{error}</p>
        </div>
      </div>
    )
  }

  if (!tx) return null

  // 付款成功畫面
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-morandi-container/30 px-4 py-8">
        <div className="max-w-md w-full bg-card rounded-xl border border-border p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-status-success-bg flex items-center justify-center mx-auto mb-4">
            <CheckSquare className="w-10 h-10 text-status-success" />
          </div>
          <h1 className="text-xl font-semibold text-morandi-primary mb-2">付款成功</h1>
          <p className="text-sm text-morandi-secondary mb-6">
            {tx.workspace?.name ?? ''} 已收到您的付款
          </p>
          <div className="bg-morandi-container/40 rounded-lg p-4 text-left space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-morandi-muted">金額</span>
              <span className="font-medium">{tx.amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-morandi-muted">付款方式</span>
              <span className="font-medium">{tx.provider_info?.provider_name ?? tx.provider}</span>
            </div>
            {tx.external_trans_no && (
              <div className="flex justify-between">
                <span className="text-morandi-muted">交易序號</span>
                <span className="font-mono text-xs">{tx.external_trans_no}</span>
              </div>
            )}
            {tx.external_approve_code && (
              <div className="flex justify-between">
                <span className="text-morandi-muted">授權碼</span>
                <span className="font-mono">{tx.external_approve_code}</span>
              </div>
            )}
          </div>
          <p className="text-xs text-morandi-muted mt-6">
            這是 Phase 1 demo 付款頁、Phase 2 將直接導向永豐 EPOS 真實頁面
          </p>
        </div>
      </div>
    )
  }

  // 假刷卡表單
  return (
    <div className="min-h-screen bg-morandi-container/30 py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* 付款 header（走 venturo CIS、不用永豐銀行品牌色）*/}
        <div className="bg-card rounded-t-xl border border-b-0 border-border p-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-6 bg-morandi-gold rounded-sm" />
            <span className="text-base font-bold text-morandi-primary">線上付款（永豐金流）</span>
          </div>
          <p className="text-xs text-morandi-muted">Venturo ERP × SinoPac Bank</p>
        </div>

        {/* 訂單資訊 */}
        <div className="bg-card border-x border-border p-5 space-y-3">
          <div className="flex justify-between items-baseline">
            <span className="text-sm text-morandi-muted">特店</span>
            <span className="text-sm font-medium">{tx.workspace?.name ?? '—'}</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-sm text-morandi-muted">付款方式</span>
            <span className="text-sm font-medium">
              {tx.provider_info?.provider_name ?? tx.provider}
            </span>
          </div>
          <div className="flex justify-between items-baseline pt-3 border-t border-morandi-muted/15">
            <span className="text-sm text-morandi-muted">應付金額</span>
            <span className="text-2xl font-bold text-morandi-primary">
              {tx.amount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* 刷卡表單 */}
        <form
          onSubmit={handleSubmit}
          className="bg-card rounded-b-xl border border-t-0 border-border p-5"
        >
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-morandi-muted/15">
            <CreditCard className="w-4 h-4 text-morandi-gold" />
            <span className="text-sm font-semibold text-morandi-primary">信用卡資訊</span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-morandi-secondary mb-1.5">卡號</label>
              <input
                type="text"
                value={cardNumber}
                onChange={e => setCardNumber(e.target.value)}
                placeholder="4311 9500 0000 0000"
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm font-mono"
                maxLength={19}
                disabled={submitting}
              />
              <p className="text-[0.65rem] text-morandi-muted mt-1">
                測試模式：任何 16 位數字皆可、不會真扣款
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-morandi-secondary mb-1.5">有效期限</label>
                <input
                  type="text"
                  value={expiry}
                  onChange={e => setExpiry(e.target.value)}
                  placeholder="MM/YY"
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm font-mono"
                  maxLength={5}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className="block text-xs text-morandi-secondary mb-1.5">安全碼 CVV</label>
                <input
                  type="text"
                  value={cvv}
                  onChange={e => setCvv(e.target.value)}
                  placeholder="•••"
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm font-mono"
                  maxLength={4}
                  disabled={submitting}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-morandi-secondary mb-1.5">持卡人姓名</label>
              <input
                type="text"
                value={cardholder}
                onChange={e => setCardholder(e.target.value)}
                placeholder="LAST NAME / FIRST NAME"
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                disabled={submitting}
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 rounded-md bg-status-danger-bg border border-status-danger/30 text-sm text-status-danger">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-5 py-2.5 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 [background:var(--btn-primary-bg)] [color:var(--btn-primary-fg)] [border-color:var(--btn-primary-border)] border font-semibold transition-[filter] hover:brightness-[.96] active:brightness-[.92]"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                處理中…
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                確認付款 {tx.amount.toLocaleString()}
              </>
            )}
          </button>

          <p className="text-[0.65rem] text-morandi-muted mt-4 text-center leading-relaxed">
            ⚠️ 此為 Phase 1 demo 頁面、無真實刷卡
            <br />
            Phase 2 將替換為永豐 EPOS 官方 URL 付款頁
          </p>
        </form>

        <div className="text-center mt-4 text-[0.65rem] text-morandi-muted">
          🔒 連線採 SSL 加密保護
        </div>
      </div>
    </div>
  )
}
