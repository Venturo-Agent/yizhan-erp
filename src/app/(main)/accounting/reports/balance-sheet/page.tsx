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
  END_DATE: '截止日期',
  LIABILITIES_AND_EQUITY: '負債與權益',
  LIABILITIES: '負債',
  LIABILITIES_TOTAL: '負債合計',
  EQUITY: '權益',
  CURRENT_PROFIT: '本期損益',
  EQUITY_TOTAL: '權益合計',
  TOTAL_LIABILITIES_AND_EQUITY: '負債與權益總計',
  ACCOUNTING_EQUATION_VERIFICATION: '會計等式驗證',
  PLEASE_SELECT_DATE: '請選擇日期並查詢',
} as const

interface AccountBalance {
  code: string
  name: string
  balance: number
}

interface BalanceSheetData {
  assets: AccountBalance[]
  liabilities: AccountBalance[]
  equity: AccountBalance[]
  totalAssets: number
  totalLiabilities: number
  totalEquity: number
  netIncome: number // 本期損益
}

export default function BalanceSheetPage() {
  const { user } = useAuthStore()
  const t = useTranslations('accounting')
  const [asOfDate, setAsOfDate] = useState('')
  const [data, setData] = useState<BalanceSheetData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // 預設今天
    setAsOfDate(new Date().toISOString().split('T')[0])
  }, [])

  const loadBalanceSheet = async () => {
    if (!asOfDate || !user?.workspace_id) {
      toast.warning(COMMON_MESSAGES.PLEASE_SELECT_DATE)
      return
    }

    setIsLoading(true)

    try {
      // 1. 取得資產、負債、權益科目（剔除停用）
      const { data: accounts, error: accountsError } = await supabase
        .from('chart_of_accounts')
        .select('id, code, name, account_type')
        .eq('workspace_id', user.workspace_id)
        .eq('is_active', true)
        .in('account_type', ['asset', 'liability', 'equity'])
        .order('code', { ascending: true })

      if (accountsError) throw accountsError

      // 2. 取得截至指定日期的所有分錄（剔除已反沖 / 草稿、只算 posted / locked）
      const { data: lines, error: linesError } = await supabase
        .from('journal_lines')
        .select(
          `
          account_id,
          debit_amount,
          credit_amount,
          voucher:journal_vouchers!inner(
            voucher_date,
            workspace_id,
            status
          )
        `
        )
        .eq('voucher.workspace_id', user.workspace_id)
        .lte('voucher.voucher_date', asOfDate)
        .in('voucher.status', ['posted', 'locked'])

      if (linesError) throw linesError

      // 3. 計算各科目餘額
      const balanceMap = new Map<string, number>()

      ;(
        lines as Array<{ account_id: string; debit_amount: number; credit_amount: number }>
      ).forEach(line => {
        const existing = balanceMap.get(line.account_id) || 0
        // 資產：借方增加（debit - credit）
        // 負債/權益：貸方增加（credit - debit）
        balanceMap.set(line.account_id, existing + (line.debit_amount - line.credit_amount))
      })

      // 4. 整理數據
      const assets: AccountBalance[] = []
      const liabilities: AccountBalance[] = []
      const equity: AccountBalance[] = []

      accounts.forEach(account => {
        const rawBalance = balanceMap.get(account.id) || 0
        if (rawBalance === 0) return

        // 資產：借方餘額為正
        // 負債/權益：貸方餘額為正（所以要取負值）
        const balance = account.account_type === 'asset' ? rawBalance : -rawBalance

        if (balance === 0) return

        const item = {
          code: account.code,
          name: account.name,
          balance: Math.abs(balance),
        }

        if (account.account_type === 'asset') {
          assets.push(item)
        } else if (account.account_type === 'liability') {
          liabilities.push(item)
        } else if (account.account_type === 'equity') {
          equity.push(item)
        }
      })

      // 5. 計算本期損益（年初至今）
      const yearStart = `${asOfDate.substring(0, 4)}-01-01`

      const { data: plLines, error: plError } = await supabase
        .from('journal_lines')
        .select(
          `
          account_id,
          debit_amount,
          credit_amount,
          voucher:journal_vouchers!inner(
            voucher_date,
            workspace_id,
            status
          )
        `
        )
        .eq('voucher.workspace_id', user.workspace_id)
        .gte('voucher.voucher_date', yearStart)
        .lte('voucher.voucher_date', asOfDate)
        .in('voucher.status', ['posted', 'locked'])

      if (plError) throw plError

      // 取得損益科目（剔除停用）
      const { data: plAccounts } = await supabase
        .from('chart_of_accounts')
        .select('id, account_type')
        .eq('workspace_id', user.workspace_id)
        .eq('is_active', true)
        .in('account_type', ['revenue', 'cost', 'expense'])

      const plAccountIds = new Set(plAccounts?.map(a => a.id) || [])

      let revenueTotal = 0
      let costExpenseTotal = 0

      ;(
        plLines as Array<{ account_id: string; debit_amount: number; credit_amount: number }>
      ).forEach(line => {
        if (!plAccountIds.has(line.account_id)) return

        const account = plAccounts?.find(a => a.id === line.account_id)
        if (!account) return

        if (account.account_type === 'revenue') {
          revenueTotal += line.credit_amount - line.debit_amount
        } else {
          costExpenseTotal += line.debit_amount - line.credit_amount
        }
      })

      const netIncome = revenueTotal - costExpenseTotal

      // 6. 計算總計
      const totalAssets = assets.reduce((sum, item) => sum + item.balance, 0)
      const totalLiabilities = liabilities.reduce((sum, item) => sum + item.balance, 0)
      const totalEquity = equity.reduce((sum, item) => sum + item.balance, 0) + netIncome

      setData({
        assets,
        liabilities,
        equity,
        totalAssets,
        totalLiabilities,
        totalEquity,
        netIncome,
      })
    } catch (error) {
      logger.error('載入資產負債表失敗:', error)
      toast.error(COMMON_MESSAGES.LOAD_FAILED)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <ContentPageLayout title={t('balanceSheetTitle')}>
      <div className="space-y-4">
        {/* 查詢條件 */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{PAGE_LABELS.END_DATE}</Label>
              <DatePicker value={asOfDate} onChange={setAsOfDate} />
            </div>

            <div className="flex items-end">
              <Button onClick={loadBalanceSheet} disabled={isLoading} className="w-full gap-2">
                <Search size={16} />
                {isLoading ? t('searching') : t('search')}
              </Button>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <QuickDateButtons onlyEnd onSelect={({ end }) => setAsOfDate(end)} />
          </div>
        </Card>

        {/* 資產負債表 */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 左側：資產 */}
            <Card className="p-6">
              <div className="space-y-4">
                <div className="text-center border-b border-border pb-4">
                  <h2 className="text-xl font-bold">{t('assets')}</h2>
                  <p className="text-sm text-muted-foreground mt-1">截至 {asOfDate}</p>
                </div>

                <div>
                  <div className="font-semibold mb-2 text-status-info">{t('currentAssets')}</div>
                  {data.assets.map(item => (
                    <div key={item.code} className="flex justify-between py-1 pl-4">
                      <span className="text-sm">
                        {item.code} {item.name}
                      </span>
                      <span className="text-sm font-mono">${item.balance.toLocaleString()}</span>
                    </div>
                  ))}
                  {data.assets.length === 0 && (
                    <div className="text-sm text-muted-foreground pl-4">無{t('assets')}記錄</div>
                  )}
                </div>

                <div className="flex justify-between py-3 border-t-2 font-bold text-lg text-status-info">
                  <span>{t('assets')}總計</span>
                  <span className="font-mono">${data.totalAssets.toLocaleString()}</span>
                </div>
              </div>
            </Card>

            {/* 右側：負債 + 權益 */}
            <Card className="p-6">
              <div className="space-y-4">
                <div className="text-center border-b border-border pb-4">
                  <h2 className="text-xl font-bold">{PAGE_LABELS.LIABILITIES_AND_EQUITY}</h2>
                  <p className="text-sm text-muted-foreground mt-1">截至 {asOfDate}</p>
                </div>

                {/* 負債 */}
                <div>
                  <div className="font-semibold mb-2 text-morandi-red">
                    {PAGE_LABELS.LIABILITIES}
                  </div>
                  {data.liabilities.map(item => (
                    <div key={item.code} className="flex justify-between py-1 pl-4">
                      <span className="text-sm">
                        {item.code} {item.name}
                      </span>
                      <span className="text-sm font-mono">${item.balance.toLocaleString()}</span>
                    </div>
                  ))}
                  {data.liabilities.length === 0 && (
                    <div className="text-sm text-muted-foreground pl-4">
                      無{t('liabilities')}記錄
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-t border-border mt-2 font-semibold">
                    <span>{PAGE_LABELS.LIABILITIES_TOTAL}</span>
                    <span className="font-mono">${data.totalLiabilities.toLocaleString()}</span>
                  </div>
                </div>

                {/* 權益 */}
                <div>
                  <div className="font-semibold mb-2 text-morandi-green">{PAGE_LABELS.EQUITY}</div>
                  {data.equity.map(item => (
                    <div key={item.code} className="flex justify-between py-1 pl-4">
                      <span className="text-sm">
                        {item.code} {item.name}
                      </span>
                      <span className="text-sm font-mono">${item.balance.toLocaleString()}</span>
                    </div>
                  ))}
                  {/* 本期損益 */}
                  {data.netIncome !== 0 && (
                    <div className="flex justify-between py-1 pl-4">
                      <span className="text-sm">{PAGE_LABELS.CURRENT_PROFIT}</span>
                      <span
                        className={`text-sm font-mono ${data.netIncome >= 0 ? 'text-morandi-green' : 'text-morandi-red'}`}
                      >
                        ${data.netIncome.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {data.equity.length === 0 && data.netIncome === 0 && (
                    <div className="text-sm text-muted-foreground pl-4">無{t('equity')}記錄</div>
                  )}
                  <div className="flex justify-between py-2 border-t border-border mt-2 font-semibold">
                    <span>{PAGE_LABELS.EQUITY_TOTAL}</span>
                    <span className="font-mono">${data.totalEquity.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex justify-between py-3 border-t-2 font-bold text-lg text-morandi-secondary">
                  <span>{PAGE_LABELS.TOTAL_LIABILITIES_AND_EQUITY}</span>
                  <span className="font-mono">
                    ${(data.totalLiabilities + data.totalEquity).toLocaleString()}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* 平衡檢查 */}
        {data && (
          <Card
            className={`p-4 ${
              Math.abs(data.totalAssets - (data.totalLiabilities + data.totalEquity)) < 0.01
                ? 'bg-morandi-green/10 border-morandi-green/30'
                : 'bg-morandi-red/10 border-morandi-red/30'
            }`}
          >
            <div
              className={`text-sm ${
                Math.abs(data.totalAssets - (data.totalLiabilities + data.totalEquity)) < 0.01
                  ? 'text-morandi-green'
                  : 'text-morandi-red'
              }`}
            >
              <div className="font-semibold mb-2">
                {PAGE_LABELS.ACCOUNTING_EQUATION_VERIFICATION}
              </div>
              <div className="space-y-1">
                <div>資產 = ${data.totalAssets.toLocaleString()}</div>
                <div>
                  負債 + 權益 = ${(data.totalLiabilities + data.totalEquity).toLocaleString()}
                </div>
                <div className="font-bold mt-2">
                  {Math.abs(data.totalAssets - (data.totalLiabilities + data.totalEquity)) < 0.01
                    ? '✅ 平衡（資產 = 負債 + 權益）'
                    : `⚠️ 不平衡！差額：${(data.totalAssets - (data.totalLiabilities + data.totalEquity)).toLocaleString()}`}
                </div>
              </div>
            </div>
          </Card>
        )}

        {!data && !isLoading && (
          <Card className="p-8">
            <div className="text-center text-muted-foreground">
              {PAGE_LABELS.PLEASE_SELECT_DATE}
            </div>
          </Card>
        )}
      </div>
    </ContentPageLayout>
  )
}
