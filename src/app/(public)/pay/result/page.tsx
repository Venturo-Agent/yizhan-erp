/**
 * 永豐刷卡付款結果落地頁 — /pay/result?t=<token>
 *
 * 客戶在永豐刷卡頁刷完、永豐 redirect 回這裡（returnUrl）。
 * 本頁輪詢 /api/public/payment-status/[token]、該 API 反查永豐確認真實入帳狀態。
 *   - captured：顯示「付款成功」+ 金額 + 交易序號
 *   - pending：顯示「確認付款中…」、每 3 秒輪詢、約撐 2 分鐘
 *   - failed / 無 token：顯示「付款未完成或連結無效」
 *
 * 取代 Phase 1「刷完撞 /pay/return 報無效連結」的 placeholder。
 * 走 morandi design token、不用永豐品牌色（UI 紅線）。
 */

'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

type View = 'loading' | 'pending' | 'captured' | 'failed'

const MAX_POLLS = 40 // 每 3 秒一次、約 2 分鐘

const LABELS = {
  CONFIRMING: '確認付款中…',
  CONFIRMING_HINT: '若您已完成刷卡、請稍候片刻、系統正在跟銀行確認入帳。',
  SUCCESS: '付款成功',
  TRANS_NO_PREFIX: '交易序號：',
  SUCCESS_HINT: '感謝您的付款、可以關閉此頁。',
  FAILED: '付款未完成',
  FAILED_HINT: '這筆付款尚未完成、或連結已失效。若您已刷卡、款項仍在確認中、請稍後回原付款連結查看。',
} as const

function ResultInner() {
  const token = useSearchParams().get('t')
  const [view, setView] = useState<View>('loading')
  const [amount, setAmount] = useState<number | null>(null)
  const [transNo, setTransNo] = useState<string | null>(null)

  const poll = useCallback(async (): Promise<'stop' | 'retry'> => {
    if (!token) {
      setView('failed')
      return 'stop'
    }
    try {
      const res = await fetch(`/api/public/payment-status/${token}`)
      if (!res.ok) return 'retry'
      const json = await res.json()
      const d = json.data as { status: string; amount: number | null; external_trans_no: string | null }
      setAmount(d.amount)
      setTransNo(d.external_trans_no)
      if (d.status === 'captured') {
        setView('captured')
        return 'stop'
      }
      if (d.status === 'failed' || d.status === 'expired') {
        setView('failed')
        return 'stop'
      }
      setView('pending')
      return 'retry'
    } catch {
      return 'retry'
    }
  }, [token])

  useEffect(() => {
    if (!token) {
      setView('failed')
      return
    }
    let stopped = false
    let timer: ReturnType<typeof setTimeout>
    let count = 0
    const tick = async () => {
      if (stopped) return
      const r = await poll()
      count += 1
      if (r === 'stop' || count >= MAX_POLLS) return
      timer = setTimeout(tick, 3000)
    }
    void tick()
    return () => {
      stopped = true
      clearTimeout(timer)
    }
  }, [token, poll])

  return (
    <div className="min-h-screen flex items-center justify-center bg-morandi-cream px-4">
      <div className="w-full max-w-md rounded-2xl bg-card shadow-sm border border-morandi-container p-8 text-center">
        {(view === 'loading' || view === 'pending') && (
          <>
            <Loader2 className="mx-auto h-14 w-14 text-morandi-gold animate-spin" />
            <h1 className="mt-5 text-xl font-semibold text-morandi-primary">{LABELS.CONFIRMING}</h1>
            <p className="mt-2 text-sm text-morandi-secondary">{LABELS.CONFIRMING_HINT}</p>
          </>
        )}

        {view === 'captured' && (
          <>
            <CheckCircle2 className="mx-auto h-14 w-14 text-status-success" />
            <h1 className="mt-5 text-xl font-semibold text-morandi-primary">{LABELS.SUCCESS}</h1>
            {amount != null && (
              <p className="mt-3 text-2xl font-bold text-morandi-primary">
                NT$ {amount.toLocaleString()}
              </p>
            )}
            {transNo && (
              <p className="mt-2 text-sm text-morandi-secondary">
                {LABELS.TRANS_NO_PREFIX}
                {transNo}
              </p>
            )}
            <p className="mt-4 text-sm text-morandi-secondary">{LABELS.SUCCESS_HINT}</p>
          </>
        )}

        {view === 'failed' && (
          <>
            <XCircle className="mx-auto h-14 w-14 text-status-danger" />
            <h1 className="mt-5 text-xl font-semibold text-morandi-primary">{LABELS.FAILED}</h1>
            <p className="mt-2 text-sm text-morandi-secondary">{LABELS.FAILED_HINT}</p>
          </>
        )}
      </div>
    </div>
  )
}

export default function PayResultPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-morandi-cream">
          <Loader2 className="h-10 w-10 text-morandi-gold animate-spin" />
        </div>
      }
    >
      <ResultInner />
    </Suspense>
  )
}
