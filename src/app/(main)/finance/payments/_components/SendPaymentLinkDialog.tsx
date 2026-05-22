'use client'

/**
 * 發送付款連結 Dialog
 *
 * Phase 1 mock 流程（2026-05-22 William 拍板）：
 *   1. 業務填：金額 / 客戶 Email / 客戶名 / 付款方式（限永豐 provider）/ 有效期
 *   2. 按「產生連結」→ POST /api/finance/payment-links → 預存 payment_transaction（status=pending）
 *   3. 回顯連結（複製 + 開新分頁預覽）
 *   4. 客戶刷卡完 → mock webhook → payment_transaction.status = captured
 *      （未來 Phase 2 接上永豐真實 API、不用改前端）
 *
 * 跟既有「新增收款」AddReceiptDialog 解耦、Phase 1 不影響舊流程。
 * Phase 2 之後再考慮整合進 AddReceiptDialog。
 */

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Loader2, Link2, Copy, ExternalLink, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

interface PlatformProvider {
  code: string
  provider_name: string
  provider_kind: string
}

interface GeneratedLink {
  id: string
  payment_link: string
  payment_link_token: string
  payment_link_expires_at: string | null
  amount: number
  status: string
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

const EXPIRY_OPTIONS = [
  { value: 60, label: '1 小時' },
  { value: 60 * 12, label: '12 小時' },
  { value: 60 * 24, label: '1 天' },
  { value: 60 * 24 * 3, label: '3 天' },
  { value: 60 * 24 * 7, label: '7 天' },
]

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SendPaymentLinkDialog({ open, onOpenChange }: Props) {
  const [provider, setProvider] = useState('sinopac_card')
  const [amount, setAmount] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [expiryMinutes, setExpiryMinutes] = useState(60 * 24)
  const [submitting, setSubmitting] = useState(false)
  const [generated, setGenerated] = useState<GeneratedLink | null>(null)

  const { data: providersResp } = useSWR<PlatformProvider[]>(
    open ? '/api/finance/payment-providers' : null,
    fetcher,
    { revalidateOnFocus: false }
  )
  // 只列永豐 provider（不列 manual）
  const sinopacProviders = (providersResp ?? []).filter(p => p.code.startsWith('sinopac_'))

  // 開啟時 reset
  useEffect(() => {
    if (open) {
      setProvider('sinopac_card')
      setAmount('')
      setCustomerEmail('')
      setCustomerName('')
      setExpiryMinutes(60 * 24)
      setGenerated(null)
    }
  }, [open])

  const handleSubmit = async () => {
    const amountNum = parseFloat(amount)
    if (!amountNum || amountNum <= 0) {
      toast.error('金額需大於 0')
      return
    }
    if (!customerEmail) {
      toast.error('請填客戶 Email')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/finance/payment-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          amount: amountNum,
          customer_email: customerEmail,
          customer_name: customerName || null,
          expires_minutes: expiryMinutes,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        toast.error(json.error || '產生失敗')
        return
      }
      setGenerated(json.data)
      toast.success('付款連結已產生')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '連線失敗')
    } finally {
      setSubmitting(false)
    }
  }

  const absoluteLink = generated
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}${generated.payment_link}`
    : ''

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(absoluteLink)
      toast.success('已複製連結')
    } catch {
      toast.error('複製失敗、請手動選取')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-morandi-gold" />
            發送付款連結
          </DialogTitle>
        </DialogHeader>

        {/* 還沒產生：表單 */}
        {!generated && (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm">付款方式 *</Label>
              <select
                value={provider}
                onChange={e => setProvider(e.target.value)}
                disabled={submitting}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                {sinopacProviders.map(p => (
                  <option key={p.code} value={p.code}>
                    {p.provider_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">金額（TWD）*</Label>
              <Input
                type="number"
                min="1"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="例：15000"
                disabled={submitting}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">客戶 Email *</Label>
              <Input
                type="email"
                value={customerEmail}
                onChange={e => setCustomerEmail(e.target.value)}
                placeholder="例：customer@example.com"
                disabled={submitting}
              />
              <p className="text-[0.65rem] text-morandi-muted">
                Phase 1 不會自動寄信、請複製連結手動傳給客戶；Phase 1.5 將自動寄
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">客戶名稱</Label>
              <Input
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="選填"
                disabled={submitting}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">連結有效期</Label>
              <select
                value={expiryMinutes}
                onChange={e => setExpiryMinutes(Number(e.target.value))}
                disabled={submitting}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                {EXPIRY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                取消
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Link2 className="w-4 h-4 mr-2" />}
                產生連結
              </Button>
            </div>
          </div>
        )}

        {/* 產生成功：顯示連結 */}
        {generated && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 p-3 rounded-md bg-green-50 border border-green-200">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
              <div className="text-sm text-green-800">
                付款連結已產生、複製傳給客戶
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">付款連結</Label>
              <div className="flex gap-2">
                <Input value={absoluteLink} readOnly className="font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={handleCopy} title="複製">
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(absoluteLink, '_blank')}
                  title="開新分頁預覽"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="bg-morandi-container/30 rounded-md p-3 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-morandi-muted">金額</span>
                <span className="font-medium">NT$ {generated.amount.toLocaleString()}</span>
              </div>
              {generated.payment_link_expires_at && (
                <div className="flex justify-between">
                  <span className="text-morandi-muted">有效期至</span>
                  <span className="font-medium">
                    {new Date(generated.payment_link_expires_at).toLocaleString('zh-TW')}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-morandi-muted">狀態</span>
                <span className="font-medium">待付款</span>
              </div>
            </div>

            <div className="flex justify-between gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setGenerated(null)
                }}
              >
                再產一筆
              </Button>
              <Button onClick={() => onOpenChange(false)}>
                完成
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
