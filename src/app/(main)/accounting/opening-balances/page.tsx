'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Save, Info } from 'lucide-react'
import { logger } from '@/lib/utils/logger'
import { toast } from 'sonner'
import { apiMutate } from '@/lib/swr/api-mutate'
import { ACCOUNTS_TABS } from '../accounts/components/accounts-tabs'
import { useTranslations } from 'next-intl'

const PAGE_LABELS = {
  DIFFERENCE: '差額',
  LOAD_FAILED: '載入期初餘額失敗',
  UNBALANCED: '借貸不平衡、無法儲存',
  SAVE_FAILED: '儲存失敗',
  SAVE_SUCCESS_PREFIX: '期初餘額已儲存（傳票 ',
  SAVE_SUCCESS_SUFFIX: '）',
} as const

interface OpeningAccount {
  id: string
  code: string
  name: string
  account_type: 'asset' | 'liability' | 'equity'
  balance: number
}

interface ExistingVoucher {
  id: string
  voucher_no: string
  voucher_date: string
  status: string
}

const TYPE_LABEL: Record<OpeningAccount['account_type'], string> = {
  asset: '資產',
  liability: '負債',
  equity: '權益',
}

export default function OpeningBalancesPage() {
  const router = useRouter()
  const t = useTranslations('accounting')
  const [accounts, setAccounts] = useState<OpeningAccount[]>([])
  const [voucher, setVoucher] = useState<ExistingVoucher | null>(null)
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0])
  const [balances, setBalances] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/accounting/opening-balances')
        const json = await res.json()
        if (!res.ok) {
          toast.error(json.error || PAGE_LABELS.LOAD_FAILED)
          return
        }
        setAccounts(json.accounts || [])
        setVoucher(json.voucher || null)
        const initial: Record<string, string> = {}
        for (const acc of json.accounts || []) {
          if (acc.balance > 0) initial[acc.id] = String(acc.balance)
        }
        setBalances(initial)
        if (json.voucher?.voucher_date) {
          setAsOfDate(json.voucher.voucher_date)
        }
      } catch (error) {
        logger.error('載入期初餘額失敗:', error)
        toast.error(PAGE_LABELS.LOAD_FAILED)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const grouped = useMemo(() => {
    const result: Record<OpeningAccount['account_type'], OpeningAccount[]> = {
      asset: [],
      liability: [],
      equity: [],
    }
    for (const acc of accounts) {
      result[acc.account_type].push(acc)
    }
    return result
  }, [accounts])

  const totals = useMemo(() => {
    let debit = 0
    let credit = 0
    for (const acc of accounts) {
      const raw = balances[acc.id]
      const amount = Number(raw)
      if (!raw || isNaN(amount) || amount <= 0) continue
      if (acc.account_type === 'asset') debit += amount
      else credit += amount
    }
    return { debit, credit, diff: debit - credit }
  }, [accounts, balances])

  const isBalanced = Math.abs(totals.diff) < 0.01 && totals.debit > 0

  const handleSave = async () => {
    if (!isBalanced) {
      toast.error(PAGE_LABELS.UNBALANCED)
      return
    }

    setIsSaving(true)
    try {
      const items = Object.entries(balances)
        .map(([account_id, raw]) => ({ account_id, amount: Number(raw) }))
        .filter(i => !isNaN(i.amount) && i.amount > 0)

      const res = await apiMutate<{ voucher_no: string; error?: string }>(
        '/api/accounting/opening-balances',
        {
          method: 'POST',
          body: { as_of_date: asOfDate, items },
          invalidate: ['/api/accounting/opening-balances'],
        }
      )
      if (!res.ok) {
        toast.error(res.error || PAGE_LABELS.SAVE_FAILED)
        return
      }
      toast.success(`${PAGE_LABELS.SAVE_SUCCESS_PREFIX}${res.data?.voucher_no}${PAGE_LABELS.SAVE_SUCCESS_SUFFIX}`)
      // 重載
      const reloadRes = await fetch('/api/accounting/opening-balances')
      const reload = await reloadRes.json()
      setVoucher(reload.voucher || null)
      setAccounts(reload.accounts || [])
    } catch (error) {
      logger.error('儲存期初餘額失敗:', error)
      toast.error(PAGE_LABELS.SAVE_FAILED)
    } finally {
      setIsSaving(false)
    }
  }

  const renderRow = (acc: OpeningAccount) => (
    <div key={acc.id} className="grid grid-cols-12 gap-2 py-1 items-center">
      <div className="col-span-3 font-mono text-sm text-muted-foreground">{acc.code}</div>
      <div className="col-span-5 text-sm">{acc.name}</div>
      <div className="col-span-4">
        <Input
          type="number"
          step="0.01"
          placeholder="0"
          value={balances[acc.id] || ''}
          onChange={e =>
            setBalances(prev => ({ ...prev, [acc.id]: e.target.value }))
          }
          className="text-right font-mono"
        />
      </div>
    </div>
  )

  return (
    <ContentPageLayout
      title={t('openingBalances')}
      tabs={ACCOUNTS_TABS}
      activeTab="/accounting/opening-balances"
      onTabChange={href => router.push(href)}
    >
      <div className="space-y-4">
        {/* 說明 */}
        <Card className="p-4 bg-status-info/5 border-status-info/30">
          <div className="flex items-start gap-3">
            <Info size={20} className="text-status-info flex-shrink-0 mt-0.5" />
            <div className="text-sm text-morandi-primary space-y-1">
              <div className="font-semibold">啟用會計時設定一次、之後通常不再改</div>
              <div className="text-muted-foreground">
                資產類期初記為借方、負債 + 權益記為貸方、必須借貸平衡。儲存後會產生一張「期初開帳傳票」（鎖定不可改）、覆寫前次設定。
              </div>
            </div>
          </div>
        </Card>

        {/* 期初日 */}
        <Card className="p-4">
          <div className="flex items-end gap-4">
            <div className="space-y-2">
              <Label>期初日（會計啟用日）</Label>
              <DatePicker value={asOfDate} onChange={setAsOfDate} className="w-48" />
            </div>
            {voucher && (
              <div className="text-sm text-muted-foreground pb-2">
                已有期初傳票：<span className="font-mono">{voucher.voucher_no}</span>（{voucher.voucher_date}）
              </div>
            )}
          </div>
        </Card>

        {isLoading ? (
          <Card className="p-8 text-center text-muted-foreground">載入中...</Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {(['asset', 'liability', 'equity'] as const).map(type => (
              <Card key={type} className="p-4">
                <div className="font-semibold mb-3 pb-2 border-b">
                  {TYPE_LABEL[type]}（{grouped[type].length} 個科目）
                </div>
                <div className="space-y-1">
                  {grouped[type].length === 0 ? (
                    <div className="text-sm text-muted-foreground py-4 text-center">
                      沒有 {TYPE_LABEL[type]} 類科目、請先到「科目管理」建立
                    </div>
                  ) : (
                    grouped[type].map(renderRow)
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* 合計 + 儲存 */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <div>
              <div className="text-sm text-muted-foreground">借方合計（資產）</div>
              <div className="text-xl font-mono font-bold">${totals.debit.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">貸方合計（負債+權益）</div>
              <div className="text-xl font-mono font-bold">${totals.credit.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{PAGE_LABELS.DIFFERENCE}</div>
              <div
                className={`text-xl font-mono font-bold ${
                  isBalanced ? 'text-morandi-green' : 'text-morandi-red'
                }`}
              >
                {isBalanced ? '✅ 平衡' : `$${totals.diff.toLocaleString()}`}
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={!isBalanced || isSaving}
                className="gap-2"
              >
                <Save size={16} />
                {isSaving ? '儲存中...' : voucher ? '覆寫期初餘額' : '儲存期初餘額'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </ContentPageLayout>
  )
}
