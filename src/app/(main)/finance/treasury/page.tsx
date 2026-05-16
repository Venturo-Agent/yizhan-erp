'use client'
/**
 * 金庫總覽頁面
 *
 * 功能：
 * 1. 本月收入/支出/餘額彙總
 * 2. 近期交易列表（收款 + 請款合併）
 * 3. 快速連結到請款/收款/撥款
 */

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useCapabilities, CAPABILITIES } from '@/lib/permissions'
import { UnauthorizedPage } from '@/components/unauthorized-page'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Landmark,
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  CreditCard,
  FileText,
  Banknote,
  AlertCircle,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format-currency'
import { useReceipts } from '@/data/entities/receipts'
import { usePaymentRequests } from '@/data/entities/payment-requests'
import { useDisbursementOrders } from '@/data/entities/disbursement-orders'
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { getStatusLabelFor } from '@/lib/design/status-tone-map'

interface TransactionRow {
  id: string
  date: string
  description: string
  type: 'income' | 'expense'
  amount: number
  status: string
  source: 'receipt' | 'payment_request'
}

export default function TreasuryPage() {
  const t = useTranslations('finance')
  const { can, loading: permLoading } = useCapabilities()
  const router = useRouter()
  const { items: receipts, loading: receiptsLoading } = useReceipts()
  const { items: paymentRequests, loading: prLoading } = usePaymentRequests()
  const { items: disbursementOrders, loading: doLoading } = useDisbursementOrders()

  const isLoading = receiptsLoading || prLoading || doLoading

  // 本月範圍
  const monthRange = useMemo(() => {
    const now = new Date()
    return { start: startOfMonth(now), end: endOfMonth(now) }
  }, [])

  // 本月統計
  const stats = useMemo(() => {
    const monthReceipts = receipts.filter(r => {
      const d = new Date(r.receipt_date || r.created_at)
      return isWithinInterval(d, monthRange)
    })
    const monthPayments = paymentRequests.filter(pr => {
      const d = new Date(pr.request_date || pr.created_at || '')
      return isWithinInterval(d, monthRange)
    })
    const monthDisbursements = disbursementOrders.filter(d => {
      const dt = new Date(d.disbursement_date || d.created_at || '')
      return isWithinInterval(dt, monthRange)
    })

    const totalIncome = monthReceipts.reduce(
      (sum, r) => sum + (r.actual_amount || r.receipt_amount || 0),
      0
    )
    const totalExpense = monthPayments
      .filter(pr => pr.status === 'paid')
      .reduce((sum, pr) => sum + (pr.amount || 0), 0)
    const pendingReceipts = monthReceipts.filter(r => r.status === 'pending').length
    const pendingPayments = monthPayments.filter(pr => pr.status === 'pending').length
    const pendingDisbursements = monthDisbursements.filter(d => d.status === 'pending').length

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      pendingReceipts,
      pendingPayments,
      pendingDisbursements,
    }
  }, [receipts, paymentRequests, disbursementOrders, monthRange])

  // 近期交易（合併收款 + 請款，按日期排序）
  const recentTransactions = useMemo(() => {
    const transactions: TransactionRow[] = []

    // 收款 → income
    receipts.slice(0, 30).forEach(r => {
      transactions.push({
        id: r.id,
        date: r.receipt_date || r.created_at,
        description: `${r.receipt_number} ${r.tour_name || r.order_number || ''}`.trim(),
        type: 'income',
        amount: r.actual_amount || r.receipt_amount || 0,
        status: getStatusLabelFor('receipt', r.status),
        source: 'receipt',
      })
    })

    // 請款 → expense
    paymentRequests.slice(0, 30).forEach(pr => {
      transactions.push({
        id: pr.id,
        date: pr.request_date || pr.created_at || '',
        description:
          `${pr.code || pr.request_number || ''} ${pr.supplier_name || pr.tour_name || ''}`.trim(),
        type: 'expense',
        amount: pr.amount || 0,
        status: getStatusLabelFor('payment_request', pr.status),
        source: 'payment_request',
      })
    })

    // 按日期倒序
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return transactions.slice(0, 50)
  }, [receipts, paymentRequests])

  const monthLabel = format(new Date(), 'yyyy年M月', { locale: zhTW })

  if (permLoading) return null  // ModuleGuard 已在外層顯示 loading
  if (!can(CAPABILITIES.FINANCE_READ_TREASURY)) return <UnauthorizedPage />

  return (
    <ContentPageLayout title={t('treasuryOverview')} icon={Landmark} className="space-y-6">
      {/* 快速連結 */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant="soft-gold"
          size="sm"
          onClick={() => router.push('/finance/payments')}
          className="gap-2"
        >
          <CreditCard className="h-4 w-4" />
          收款管理
        </Button>
        <Button
          variant="soft-gold"
          size="sm"
          onClick={() => router.push('/finance/requests')}
          className="gap-2"
        >
          <FileText className="h-4 w-4" />
          請款管理
        </Button>
        <Button
          variant="soft-gold"
          size="sm"
          onClick={() => router.push('/finance/treasury/disbursement')}
          className="gap-2"
        >
          <Banknote className="h-4 w-4" />
          撥款管理
        </Button>
      </div>

      {/* 本月統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-morandi-secondary">
              {monthLabel} 收入
            </CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-morandi-green" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-morandi-green">
              {isLoading ? '...' : formatCurrency(stats.totalIncome)}
            </div>
            {stats.pendingReceipts > 0 && (
              <p className="text-xs text-morandi-gold mt-1">{stats.pendingReceipts} 筆待確認</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-morandi-secondary">
              {monthLabel} 支出
            </CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-morandi-red" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-morandi-red">
              {isLoading ? '...' : formatCurrency(stats.totalExpense)}
            </div>
            {stats.pendingPayments > 0 && (
              <p className="text-xs text-morandi-gold mt-1">{stats.pendingPayments} 筆待審核</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-morandi-secondary">本月餘額</CardTitle>
            <Wallet className="h-4 w-4 text-morandi-gold" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${stats.balance >= 0 ? 'text-morandi-green' : 'text-morandi-red'}`}
            >
              {isLoading ? '...' : formatCurrency(stats.balance)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-morandi-secondary">待處理撥款</CardTitle>
            <AlertCircle className="h-4 w-4 text-morandi-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : stats.pendingDisbursements}
            </div>
            <p className="text-xs text-morandi-secondary mt-1">筆出納單待出帳</p>
          </CardContent>
        </Card>
      </div>

      {/* 近期交易列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5" />
            近期交易
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-morandi-secondary">載入中...</div>
          ) : recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-morandi-secondary">尚無交易記錄</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 text-sm font-medium text-morandi-secondary">
                      日期
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-morandi-secondary">
                      類型
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-morandi-secondary">
                      說明
                    </th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-morandi-secondary">
                      金額
                    </th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-morandi-secondary">
                      狀態
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.map(tx => (
                    <tr
                      key={tx.id}
                      className="border-b last:border-0 hover:bg-morandi-container/50 cursor-pointer transition-colors"
                      onClick={() => {
                        if (tx.source === 'receipt') router.push('/finance/payments')
                        else router.push('/finance/requests')
                      }}
                    >
                      <td className="py-3 px-2 text-sm">
                        {tx.date ? format(new Date(tx.date), 'MM/dd', { locale: zhTW }) : '-'}
                      </td>
                      <td className="py-3 px-2">
                        <Badge
                          variant={tx.type === 'income' ? 'default' : 'outline'}
                          className={
                            tx.type === 'income'
                              ? 'bg-morandi-green/20 text-morandi-green border-0'
                              : 'bg-morandi-red/10 text-morandi-red border-0'
                          }
                        >
                          {tx.type === 'income' ? '收入' : '支出'}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-sm max-w-[300px] truncate">{tx.description}</td>
                      <td
                        className={`py-3 px-2 text-right font-medium text-sm ${
                          tx.type === 'income' ? 'text-morandi-green' : 'text-morandi-red'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : '-'}
                        {formatCurrency(tx.amount)}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <Badge variant="outline" className="text-xs">
                          {tx.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </ContentPageLayout>
  )
}
