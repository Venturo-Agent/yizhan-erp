'use client'

import { useState, useEffect } from 'react'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { DatePicker } from '@/components/ui/date-picker'
import { QuickDateButtons } from '../_components/QuickDateButtons'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { logger } from '@/lib/utils/logger'
import { useTranslations } from 'next-intl'
import { COMMON_MESSAGES } from '@/constants/messages'
import { toast } from 'sonner'

const PAGE_LABELS = {
  START_DATE: '開始日期',
  END_DATE: '結束日期',
  NO_REVENUE: '無收入記錄',
  OPERATING_COST: '營業成本',
  NO_COST: '無成本記錄',
  COST_TOTAL: '成本合計',
  GROSS_PROFIT: '毛利',
  OPERATING_EXPENSES: '營業費用',
  NO_EXPENSE: '無費用記錄',
  EXPENSE_TOTAL: '費用合計',
  INCOME_FORMULA_TITLE: '損益表公式',
  PLEASE_SELECT_DATE: '請選擇日期範圍並查詢',
} as const

interface AccountBalance {
  code: string
  name: string
  balance: number
}

interface IncomeStatementData {
  revenue: AccountBalance[]
  cost: AccountBalance[]
  expense: AccountBalance[]
  totalRevenue: number
  totalCost: number
  totalExpense: number
  grossProfit: number
  netIncome: number
}

export default function IncomeStatementPage() {
  const { user } = useAuthStore()
  const t = useTranslations('accounting')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [data, setData] = useState<IncomeStatementData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // 預設本月
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    setStartDate(firstDay.toISOString().split('T')[0])
    setEndDate(lastDay.toISOString().split('T')[0])
  }, [])

  const loadIncomeStatement = async () => {
    if (!startDate || !endDate || !user?.workspace_id) {
      toast.warning(COMMON_MESSAGES.PLEASE_SELECT_DATE_RANGE)
      return
    }

    setIsLoading(true)

    try {
      // 1. 取得收入、成本、費用科目
      const { data: accounts, error: accountsError } = await supabase
        .from('chart_of_accounts')
        .select('id, code, name, account_type')
        .eq('workspace_id', user.workspace_id)
        .in('account_type', ['revenue', 'cost', 'expense'])
        .order('code', { ascending: true })

      if (accountsError) throw accountsError

      // 2. 取得期間內的分錄
      const { data: lines, error: linesError } = await supabase
        .from('journal_lines')
        .select(
          `
          account_id,
          debit_amount,
          credit_amount,
          voucher:journal_vouchers!inner(
            voucher_date,
            workspace_id
          )
        `
        )
        .eq('voucher.workspace_id', user.workspace_id)
        .gte('voucher.voucher_date', startDate)
        .lte('voucher.voucher_date', endDate)

      if (linesError) throw linesError

      // 3. 計算各科目餘額
      const balanceMap = new Map<string, number>()

      ;(
        lines as Array<{ account_id: string; debit_amount: number; credit_amount: number }>
      ).forEach(line => {
        const existing = balanceMap.get(line.account_id) || 0
        // 收入：貸方增加（credit - debit）
        // 成本/費用：借方增加（debit - credit）
        balanceMap.set(line.account_id, existing + (line.credit_amount - line.debit_amount))
      })

      // 4. 整理數據
      const revenue: AccountBalance[] = []
      const cost: AccountBalance[] = []
      const expense: AccountBalance[] = []

      accounts.forEach(account => {
        const balance = balanceMap.get(account.id) || 0
        if (balance === 0) return // 跳過無交易科目

        const item = {
          code: account.code,
          name: account.name,
          balance: Math.abs(balance), // 取絕對值顯示
        }

        if (account.account_type === 'revenue') {
          revenue.push(item)
        } else if (account.account_type === 'cost') {
          cost.push(item)
        } else if (account.account_type === 'expense') {
          expense.push(item)
        }
      })

      // 5. 計算總計
      const totalRevenue = revenue.reduce((sum, item) => sum + item.balance, 0)
      const totalCost = cost.reduce((sum, item) => sum + item.balance, 0)
      const totalExpense = expense.reduce((sum, item) => sum + item.balance, 0)
      const grossProfit = totalRevenue - totalCost
      const netIncome = grossProfit - totalExpense

      setData({
        revenue,
        cost,
        expense,
        totalRevenue,
        totalCost,
        totalExpense,
        grossProfit,
        netIncome,
      })
    } catch (error) {
      logger.error('載入損益表失敗:', error)
      toast.error(COMMON_MESSAGES.LOAD_FAILED)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <ContentPageLayout title={t('incomeStatementTitle')}>
      <div className="p-6 space-y-4">
        {/* 查詢條件 */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{PAGE_LABELS.START_DATE}</Label>
              <DatePicker value={startDate} onChange={setStartDate} />
            </div>

            <div className="space-y-2">
              <Label>{PAGE_LABELS.END_DATE}</Label>
              <DatePicker value={endDate} onChange={setEndDate} />
            </div>

            <div className="flex items-end">
              <Button onClick={loadIncomeStatement} disabled={isLoading} className="w-full gap-2">
                <Search size={16} />
                {isLoading ? t('searching') : t('search')}
              </Button>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <QuickDateButtons onSelect={({ start, end }) => { setStartDate(start); setEndDate(end) }} />
          </div>
        </Card>

        {/* 損益表 */}
        {data && (
          <Card className="p-6">
            <div className="space-y-6">
              {/* 標題 */}
              <div className="text-center border-b border-border pb-4">
                <h2 className="text-xl font-bold">{t('incomeStatementTitle')}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {startDate} ~ {endDate}
                </p>
              </div>

              {/* 收入 */}
              <div>
                <div className="font-semibold mb-2 text-morandi-green">{t('operatingRevenue')}</div>
                {data.revenue.map(item => (
                  <div key={item.code} className="flex justify-between py-1 pl-4">
                    <span className="text-sm">
                      {item.code} {item.name}
                    </span>
                    <span className="text-sm font-mono">${item.balance.toLocaleString()}</span>
                  </div>
                ))}
                {data.revenue.length === 0 && (
                  <div className="text-sm text-muted-foreground pl-4">{PAGE_LABELS.NO_REVENUE}</div>
                )}
                <div className="flex justify-between py-2 border-t border-border mt-2 font-semibold">
                  <span>收入合計</span>
                  <span className="font-mono">${data.totalRevenue.toLocaleString()}</span>
                </div>
              </div>

              {/* 成本 */}
              <div>
                <div className="font-semibold mb-2 text-status-warning">{PAGE_LABELS.OPERATING_COST}</div>
                {data.cost.map(item => (
                  <div key={item.code} className="flex justify-between py-1 pl-4">
                    <span className="text-sm">
                      {item.code} {item.name}
                    </span>
                    <span className="text-sm font-mono">(${item.balance.toLocaleString()})</span>
                  </div>
                ))}
                {data.cost.length === 0 && (
                  <div className="text-sm text-muted-foreground pl-4">{PAGE_LABELS.NO_COST}</div>
                )}
                <div className="flex justify-between py-2 border-t border-border mt-2 font-semibold">
                  <span>{PAGE_LABELS.COST_TOTAL}</span>
                  <span className="font-mono text-morandi-red">
                    (${data.totalCost.toLocaleString()})
                  </span>
                </div>
              </div>

              {/* 毛利 */}
              <div
                className={`flex justify-between py-3 border-y-2 font-bold text-lg ${
                  data.grossProfit >= 0 ? 'text-morandi-green' : 'text-morandi-red'
                }`}
              >
                <span>{PAGE_LABELS.GROSS_PROFIT}</span>
                <span className="font-mono">${data.grossProfit.toLocaleString()}</span>
              </div>

              {/* 費用 */}
              <div>
                <div className="font-semibold mb-2 text-morandi-secondary">{PAGE_LABELS.OPERATING_EXPENSES}</div>
                {data.expense.map(item => (
                  <div key={item.code} className="flex justify-between py-1 pl-4">
                    <span className="text-sm">
                      {item.code} {item.name}
                    </span>
                    <span className="text-sm font-mono">(${item.balance.toLocaleString()})</span>
                  </div>
                ))}
                {data.expense.length === 0 && (
                  <div className="text-sm text-muted-foreground pl-4">{PAGE_LABELS.NO_EXPENSE}</div>
                )}
                <div className="flex justify-between py-2 border-t border-border mt-2 font-semibold">
                  <span>{PAGE_LABELS.EXPENSE_TOTAL}</span>
                  <span className="font-mono text-morandi-red">
                    (${data.totalExpense.toLocaleString()})
                  </span>
                </div>
              </div>

              {/* 淨利 */}
              <div
                className={`flex justify-between py-4 border-y-2 font-bold text-xl ${
                  data.netIncome >= 0 ? 'text-morandi-green' : 'text-morandi-red'
                }`}
              >
                <span>本期損益（淨利）</span>
                <span className="font-mono">${data.netIncome.toLocaleString()}</span>
              </div>

              {/* 說明 */}
              <div className="bg-status-info/10 p-4 rounded text-sm text-morandi-primary">
                <div className="font-semibold mb-2">{PAGE_LABELS.INCOME_FORMULA_TITLE}</div>
                <ul className="list-disc list-inside space-y-1">
                  <li>毛利 = 營業收入 - 營業成本 = ${data.grossProfit.toLocaleString()}</li>
                  <li>淨利 = 毛利 - 營業費用 = ${data.netIncome.toLocaleString()}</li>
                  <li>
                    毛利率 ={' '}
                    {data.totalRevenue > 0
                      ? ((data.grossProfit / data.totalRevenue) * 100).toFixed(2)
                      : 0}
                    %
                  </li>
                  <li>
                    淨利率 ={' '}
                    {data.totalRevenue > 0
                      ? ((data.netIncome / data.totalRevenue) * 100).toFixed(2)
                      : 0}
                    %
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        )}

        {!data && !isLoading && (
          <Card className="p-8">
            <div className="text-center text-muted-foreground">{PAGE_LABELS.PLEASE_SELECT_DATE}</div>
          </Card>
        )}
      </div>
    </ContentPageLayout>
  )
}
