'use client'

/**
 * 費用紀錄 tab — workspace 詳情頁
 *
 * 顯示：
 *   - 上方：訂閱方案（單月 / 季 / 年約）+ 下次到期日
 *   - 下方：付款紀錄列表（amount / period / status）
 *   - 「新增付款紀錄」按鈕：有 workspaces.write capability 的 user 看得到
 *
 * 守門：API 端守 workspaces.write、UI 用 useLayoutContext 判斷有沒有 cap、
 * 沒有就不顯示按鈕（純 UX、安全靠 API）
 */

import { useEffect, useState, useCallback } from 'react'
import { useAsyncSubmit } from '@/hooks/useAsyncSubmit'
import { Wallet, Plus, Save } from 'lucide-react'
import { formatDateTaipei } from '@/lib/utils/format-date'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { ModuleLoading } from '@/components/module-loading'
import { FormDialog } from '@/components/dialog'
import { useLayoutContext } from '@/lib/auth/useLayoutContext'

const PLAN_LABEL: Record<string, string> = {
  monthly: '單月',
  quarterly: '季繳',
  annual: '年約',
}

const STATUS_LABEL: Record<string, string> = {
  pending: '待繳',
  paid: '已繳清',
  overdue: '逾期',
}

const STATUS_BADGE_CLASS: Record<string, string> = {
  pending: 'bg-morandi-gold/20 text-morandi-gold',
  paid: 'bg-morandi-green/20 text-morandi-green',
  overdue: 'bg-red-100 text-red-700',
}

interface BillingRecord {
  id: string
  amount: number
  period_start: string
  period_end: string
  status: 'pending' | 'paid' | 'overdue'
  paid_at: string | null
  notes: string | null
  created_at: string
}

interface BillingResponse {
  subscription: {
    plan: 'monthly' | 'quarterly' | 'annual' | null
    period_end: string | null
  }
  records: BillingRecord[]
}

interface BillingTabProps {
  workspaceId: string
}

const formatTwd = (amount: number) =>
  new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    minimumFractionDigits: 0,
  }).format(amount)

const formatDate = (iso: string | null) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function BillingTab({ workspaceId }: BillingTabProps) {
  const { capabilitiesSet } = useLayoutContext()

  // 漫途 admin / 有租戶管理權的人才能新增紀錄（純 UI gate、安全靠 API）
  const canManage = capabilitiesSet.has('workspaces.write')

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<BillingResponse | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  // 新增表單 state
  const today = formatDateTaipei(new Date())
  const [form, setForm] = useState({
    amount: '',
    period_start: today,
    period_end: today,
    status: 'pending' as 'pending' | 'paid' | 'overdue',
    paid_at: '',
    notes: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/billing`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        toast.error('讀取費用紀錄失敗', { description: body.error || `HTTP ${res.status}` })
        return
      }
      const json = (await res.json()) as BillingResponse
      setData(json)
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    load()
  }, [load])

  const resetForm = () => {
    setForm({
      amount: '',
      period_start: today,
      period_end: today,
      status: 'pending',
      paid_at: '',
      notes: '',
    })
  }

  const { isSubmitting: submitting, execute: handleCreate } = useAsyncSubmit(
    async () => {
      const amount = Number(form.amount)
      if (!isFinite(amount) || amount < 0) {
        toast.error('金額必須為非負數')
        return
      }
      if (!form.period_start || !form.period_end) {
        toast.error('請填寫週期起訖日')
        return
      }
      if (form.period_start > form.period_end) {
        toast.error('週期起日不能晚於迄日')
        return
      }

      const res = await fetch(`/api/workspaces/${workspaceId}/billing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          period_start: form.period_start,
          period_end: form.period_end,
          status: form.status,
          paid_at: form.status === 'paid' && form.paid_at ? form.paid_at : null,
          notes: form.notes || null,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      toast.success('已新增付款紀錄')
      setCreateOpen(false)
      resetForm()
      await load()
    },
    {
      onError: () =>
        toast.error('新增失敗', { description: '請稍後再試' }),
    }
  )

  if (loading) {
    return <ModuleLoading />
  }

  const subscription = data?.subscription
  const records = data?.records ?? []

  return (
    <div className="space-y-6">
      {/* 訂閱方案卡片 */}
      {/* eslint-disable-next-line venturo/no-forbidden-classes */}
      <div className="rounded-[24px] p-6 bg-gradient-to-t from-white to-morandi-cream border-[3px] border-white shadow-[rgba(180,160,120,0.15)_0px_12px_24px_-8px]">
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="h-4 w-4 text-morandi-gold" />
          <h3 className="font-semibold text-morandi-primary">訂閱方案</h3>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="text-sm text-morandi-secondary mb-1">當前方案</div>
            <div className="font-semibold text-morandi-primary">
              {subscription?.plan ? PLAN_LABEL[subscription.plan] : '未訂閱'}
            </div>
          </div>
          <div>
            <div className="text-sm text-morandi-secondary mb-1">下次到期</div>
            <div className="font-semibold text-morandi-primary">
              {formatDate(subscription?.period_end ?? null)}
            </div>
          </div>
        </div>
      </div>

      {/* 付款紀錄卡片 */}
      {/* eslint-disable-next-line venturo/no-forbidden-classes */}
      <div className="rounded-[24px] overflow-hidden bg-gradient-to-t from-white to-morandi-cream border-[3px] border-white shadow-[rgba(180,160,120,0.15)_0px_12px_24px_-8px]">
        <div className="px-6 py-4 border-b border-morandi-gold/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-morandi-gold"></div>
            <h3 className="font-semibold text-morandi-primary">付款紀錄</h3>
            <span className="text-sm text-morandi-secondary">共 {records.length} 筆</span>
          </div>
          {canManage && (
            <Button
              variant="soft-gold"
              size="sm"
              onClick={() => setCreateOpen(true)}
              className="border-morandi-gold text-morandi-gold hover:bg-morandi-gold/10"
            >
              <Plus className="h-4 w-4 mr-1" />
              新增付款紀錄
            </Button>
          )}
        </div>
        <div className="p-6">
          {records.length === 0 ? (
            <div className="text-center py-8 text-morandi-secondary text-sm">
              尚無付款紀錄
            </div>
          ) : (
            <div className="space-y-3">
              {records.map(record => (
                <div
                  key={record.id}
                  // eslint-disable-next-line venturo/no-forbidden-classes
                  className="grid grid-cols-12 gap-4 items-center px-4 py-3 rounded-[16px] bg-gradient-to-t from-morandi-cream-soft to-morandi-cream-warm shadow-[rgba(180,160,120,0.3)_0px_8px_20px_-4px]"
                >
                  <div className="col-span-3">
                    <div className="text-xs text-morandi-secondary">金額</div>
                    <div className="font-semibold text-morandi-primary">
                      {formatTwd(record.amount)}
                    </div>
                  </div>
                  <div className="col-span-4">
                    <div className="text-xs text-morandi-secondary">服務週期</div>
                    <div className="text-sm text-morandi-primary">
                      {formatDate(record.period_start)} ~ {formatDate(record.period_end)}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs text-morandi-secondary">狀態</div>
                    <Badge className={STATUS_BADGE_CLASS[record.status] || ''}>
                      {STATUS_LABEL[record.status] || record.status}
                    </Badge>
                  </div>
                  <div className="col-span-3">
                    <div className="text-xs text-morandi-secondary">付款日</div>
                    <div className="text-sm text-morandi-primary">
                      {formatDate(record.paid_at)}
                    </div>
                  </div>
                  {record.notes && (
                    <div className="col-span-12 mt-1">
                      <div className="text-xs text-morandi-secondary">備註</div>
                      <div className="text-sm text-morandi-primary">{record.notes}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 新增付款紀錄 Dialog */}
      <FormDialog
        open={createOpen}
        onOpenChange={open => {
          if (!open) {
            setCreateOpen(false)
            resetForm()
          }
        }}
        title="新增付款紀錄"
        subtitle="補登一筆歷史付款 / 開立扣款單"
        onSubmit={handleCreate}
        submitLabel={submitting ? '儲存中...' : '儲存'}
        cancelLabel="取消"
        loading={submitting}
        submitDisabled={submitting}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>金額（TWD）</Label>
            <Input
              type="number"
              min={0}
              step="1"
              value={form.amount}
              onChange={e => setForm(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="0"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>週期起日</Label>
              <Input
                type="date"
                value={form.period_start}
                onChange={e => setForm(prev => ({ ...prev, period_start: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>週期迄日</Label>
              <Input
                type="date"
                value={form.period_end}
                onChange={e => setForm(prev => ({ ...prev, period_end: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>狀態</Label>
            <Select
              value={form.status}
              onValueChange={value =>
                setForm(prev => ({
                  ...prev,
                  status: value as 'pending' | 'paid' | 'overdue',
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">{STATUS_LABEL.pending}</SelectItem>
                <SelectItem value="paid">{STATUS_LABEL.paid}</SelectItem>
                <SelectItem value="overdue">{STATUS_LABEL.overdue}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.status === 'paid' && (
            <div className="space-y-2">
              <Label>付款日（留空 = 今天）</Label>
              <Input
                type="date"
                value={form.paid_at}
                onChange={e => setForm(prev => ({ ...prev, paid_at: e.target.value }))}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>備註</Label>
            <Textarea
              value={form.notes}
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="例如：年約優惠 9 折、轉帳尾號 1234"
              rows={3}
            />
          </div>
        </div>
      </FormDialog>
    </div>
  )
}
