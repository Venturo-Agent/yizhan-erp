'use client'

import { useState, useEffect } from 'react'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { QuickDateButtons } from '../_components/QuickDateButtons'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { logger } from '@/lib/utils/logger'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

const PAGE_LABELS = {
  COL_DATE: '日期',
  COL_VOUCHER_NO: '傳票號碼',
  COL_SUMMARY: '摘要',
  COL_DEBIT: '借方',
  COL_CREDIT: '貸方',
  COL_BALANCE: '餘額',
} as const

interface Account {
  id: string
  code: string
  name: string
  account_type: string
}

interface JournalLine {
  id: string
  voucher_id: string
  line_no: number
  description: string
  debit_amount: number
  credit_amount: number
  voucher: {
    voucher_no: string
    voucher_date: string
    memo: string
  }
}

export default function GeneralLedgerPage() {
  const { user } = useAuthStore()
  const t = useTranslations('accounting')
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [lines, setLines] = useState<JournalLine[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [balance, setBalance] = useState({ debit: 0, credit: 0, net: 0 })

  useEffect(() => {
    loadAccounts()

    // 預設日期範圍（本月）
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    setStartDate(firstDay.toISOString().split('T')[0])
    setEndDate(lastDay.toISOString().split('T')[0])
  }, [user?.workspace_id])

  const loadAccounts = async () => {
    if (!user?.workspace_id) return

    try {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('id, code, name, account_type')
        .eq('workspace_id', user.workspace_id)
        .eq('is_active', true)
        .order('code', { ascending: true })

      if (error) throw error
      setAccounts(data || [])

      // 預設選第一個科目
      if (data && data.length > 0) {
        setSelectedAccountId(data[0].id)
      }
    } catch (error) {
      logger.error('載入科目失敗:', error)
    }
  }

  const loadLedger = async () => {
    if (!selectedAccountId || !startDate || !endDate) {
      toast.warning(t('pleaseSelectAccountAndDate'))
      return
    }

    setIsLoading(true)

    try {
      const { data, error } = await supabase
        .from('journal_lines')
        .select(
          `
          id,
          voucher_id,
          line_no,
          description,
          debit_amount,
          credit_amount,
          voucher:journal_vouchers(
            voucher_no,
            voucher_date,
            memo
          )
        `
        )
        .eq('account_id', selectedAccountId)
        .gte('voucher.voucher_date', startDate)
        .lte('voucher.voucher_date', endDate)
        .order('voucher.voucher_date', { ascending: true })

      if (error) throw error

      const ledgerLines = (data || []) as unknown as typeof lines
      setLines(ledgerLines)

      // 計算總計
      const totalDebit = ledgerLines.reduce((sum, line) => sum + (line.debit_amount || 0), 0)
      const totalCredit = ledgerLines.reduce((sum, line) => sum + (line.credit_amount || 0), 0)
      setBalance({
        debit: totalDebit,
        credit: totalCredit,
        net: totalDebit - totalCredit,
      })
    } catch (error) {
      logger.error('載入總帳失敗:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const selectedAccount = accounts.find(a => a.id === selectedAccountId)

  return (
    <ContentPageLayout title={t('generalLedger')}>
      <div className="space-y-4">
        {/* 查詢條件 */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>{t('subject')}</Label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectAccount')} />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.code} - {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('startDate')}</Label>
              <DatePicker value={startDate} onChange={setStartDate} />
            </div>

            <div className="space-y-2">
              <Label>{t('endDate')}</Label>
              <DatePicker value={endDate} onChange={setEndDate} />
            </div>

            <div className="flex items-end">
              <Button onClick={loadLedger} disabled={isLoading} className="w-full gap-2">
                <Search size={16} />
                {isLoading ? t('searching') : t('search')}
              </Button>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <QuickDateButtons onSelect={({ start, end }) => { setStartDate(start); setEndDate(end) }} />
          </div>
        </Card>

        {/* 科目資訊 */}
        {selectedAccount && lines.length > 0 && (
          <Card className="p-4">
            <div className="text-lg font-semibold mb-2">
              {selectedAccount.code} - {selectedAccount.name}
            </div>
            <div className="text-sm text-muted-foreground">
              期間：{startDate} ~ {endDate}
            </div>
          </Card>
        )}

        {/* 總帳明細 */}
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-morandi-container border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">{PAGE_LABELS.COL_DATE}</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">{PAGE_LABELS.COL_VOUCHER_NO}</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">{PAGE_LABELS.COL_SUMMARY}</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">{PAGE_LABELS.COL_DEBIT}</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">{PAGE_LABELS.COL_CREDIT}</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">{PAGE_LABELS.COL_BALANCE}</th>
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      {isLoading ? '載入中...' : '請選擇科目和日期範圍'}
                    </td>
                  </tr>
                ) : (
                  <>
                    {lines.map((line, index) => {
                      // 計算累計餘額
                      const runningBalance = lines
                        .slice(0, index + 1)
                        .reduce((sum, l) => sum + (l.debit_amount - l.credit_amount), 0)

                      return (
                        <tr key={line.id} className="border-b hover:bg-morandi-container">
                          <td className="px-4 py-3 text-sm">{line.voucher?.voucher_date}</td>
                          <td className="px-4 py-3 text-sm font-mono">
                            {line.voucher?.voucher_no}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {line.description || line.voucher?.memo}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-mono">
                            {line.debit_amount > 0 ? line.debit_amount.toLocaleString() : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-mono">
                            {line.credit_amount > 0 ? line.credit_amount.toLocaleString() : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-mono font-semibold">
                            {runningBalance.toLocaleString()}
                          </td>
                        </tr>
                      )
                    })}
                    {/* 總計 */}
                    <tr className="bg-morandi-container font-semibold">
                      <td colSpan={3} className="px-4 py-3 text-sm">
                        總計
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono">
                        {balance.debit.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono">
                        {balance.credit.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono">
                        {balance.net.toLocaleString()}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </ContentPageLayout>
  )
}
