'use client'

import { useState, useCallback, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useCapabilities, CAPABILITIES } from '@/lib/permissions'
import { UnauthorizedPage } from '@/components/unauthorized-page'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { useTranslations } from 'next-intl'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import {
  BarChart3,
  TrendingUp,
  FileDown,
  AlertCircle,
  PieChart,
  Trophy,
  Receipt,
  Building,
  Banknote,
  List,
  CalendarDays,
  Map,
  Truck,
} from 'lucide-react'
import {
  DateRangeSelector,
  type DateRange,
} from './_components/DateRangeSelector'
import { OverviewTab } from './_components/OverviewTab'
import { DisbursementTab } from './_components/DisbursementTab'
import { IncomeTab } from './_components/IncomeTab'
import { UnclosedToursTab } from './_components/UnclosedToursTab'
import { TourPnlTab } from './_components/TourPnlTab'
import { SalesPerformanceTab } from './_components/SalesPerformanceTab'
import { ReceivablesTab } from './_components/ReceivablesTab'
import { PayablesTab } from './_components/PayablesTab'
import { BankBalancesTab } from './_components/BankBalancesTab'

export type DetailGranularity = 'item' | 'day' | 'tour' | 'supplier'

type TabValue =
  | 'overview'
  | 'disbursement'
  | 'income'
  | 'unclosed'
  | 'pnl'
  | 'sales'
  | 'receivables'
  | 'payables'
  | 'banks'

const NO_DATE_TABS: TabValue[] = ['unclosed', 'pnl', 'receivables', 'payables', 'banks']
const GRANULARITY_TABS: TabValue[] = ['overview']

const GRANULARITY_OPTIONS: {
  value: DetailGranularity
  label: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { value: 'item', label: '按筆', icon: List },
  { value: 'day', label: '按日', icon: CalendarDays },
  { value: 'tour', label: '按團', icon: Map },
  { value: 'supplier', label: '按供應商', icon: Truck },
]

function getDefaultRange(): DateRange {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`
  return { startDate, endDate }
}

export default function ReportsPage() {
  const t = useTranslations('finance')
  const { can, loading: permLoading } = useCapabilities()
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialTab = (searchParams.get('tab') as TabValue) || 'overview'

  const [activeTab, setActiveTab] = useState<TabValue>(initialTab)
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultRange)
  const [detailGranularity, setDetailGranularity] = useState<DetailGranularity>('item')

  const handleTabChange = useCallback(
    (value: string) => {
      const tab = value as TabValue
      setActiveTab(tab)
      const url = new URL(window.location.href)
      url.searchParams.set('tab', tab)
      router.replace(url.pathname + url.search, { scroll: false })
    },
    [router]
  )

  const showDateSelector = !NO_DATE_TABS.includes(activeTab)
  const showGranularity = GRANULARITY_TABS.includes(activeTab)

  const tabs = useMemo(
    () => [
      { value: 'overview', label: '收支總覽', icon: BarChart3 },
      { value: 'disbursement', label: '請款報表', icon: FileDown },
      { value: 'income', label: '收款報表', icon: TrendingUp },
      { value: 'unclosed', label: '未結團', icon: AlertCircle },
      { value: 'pnl', label: '損益表', icon: PieChart },
      { value: 'sales', label: '業務員業績', icon: Trophy },
      { value: 'receivables', label: '應收帳款', icon: Receipt },
      { value: 'payables', label: '應付帳款', icon: Building },
      { value: 'banks', label: '銀行餘額', icon: Banknote },
    ],
    []
  )

  if (permLoading) return null  // ModuleGuard 已在外層顯示 loading
  if (!can(CAPABILITIES.FINANCE_READ_REPORTS)) return <UnauthorizedPage />

  return (
    <ContentPageLayout
      title={t('financeReports')}
      icon={BarChart3}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      headerActions={
        showDateSelector ? (
          <div className="flex items-center gap-3">
            <DateRangeSelector onChange={setDateRange} />
            {showGranularity && (
              <>
                <div className="h-5 w-px bg-border" />
                <div className="flex items-center bg-morandi-container rounded-lg p-0.5">
                  {GRANULARITY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setDetailGranularity(opt.value)}
                      className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        detailGranularity === opt.value
                          ? 'bg-card text-morandi-primary shadow-sm'
                          : 'text-morandi-secondary hover:text-morandi-primary'
                      }`}
                    >
                      <opt.icon className="h-4 w-4" />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : undefined
      }
    >
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsContent value="overview" className="mt-0">
            <OverviewTab dateRange={dateRange} granularity={detailGranularity} />
          </TabsContent>
          <TabsContent value="disbursement" className="mt-0">
            <DisbursementTab dateRange={dateRange} />
          </TabsContent>
          <TabsContent value="income" className="mt-0">
            <IncomeTab dateRange={dateRange} />
          </TabsContent>
          <TabsContent value="unclosed" className="mt-0">
            <UnclosedToursTab />
          </TabsContent>
          <TabsContent value="pnl" className="mt-0">
            <TourPnlTab />
          </TabsContent>
          <TabsContent value="sales" className="mt-0">
            <SalesPerformanceTab dateRange={dateRange} />
          </TabsContent>
          <TabsContent value="receivables" className="mt-0">
            <ReceivablesTab />
          </TabsContent>
          <TabsContent value="payables" className="mt-0">
            <PayablesTab />
          </TabsContent>
          <TabsContent value="banks" className="mt-0">
            <BankBalancesTab />
          </TabsContent>
        </Tabs>
      </div>
    </ContentPageLayout>
  )
}
