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
  PieChart,
  Building,
  Banknote,
  List,
  CalendarDays,
  Map,
  Truck,
} from 'lucide-react'
import { DateRangeSelector, type DateRange } from './_components/DateRangeSelector'
import { OverviewTab } from './_components/OverviewTab'
import { DisbursementTab } from './_components/DisbursementTab'
import { IncomeTab } from './_components/IncomeTab'
import { TourPnlTab } from './_components/TourPnlTab'
// 應收帳款暫時隱藏（2026-05-23 William 拍板）：來源欄位 orders.total_amount 實際未填、
// 算出的「未收」永遠是 0、報表無意義。待開團/報價金額串接補上 total_amount 後再開回。
// import { ReceivablesTab } from './_components/ReceivablesTab'
import { PayablesTab } from './_components/PayablesTab'
import { BankBalancesTab } from './_components/BankBalancesTab'

export type DetailGranularity = 'item' | 'day' | 'tour' | 'supplier'

type TabValue =
  | 'overview'
  | 'disbursement'
  | 'income'
  | 'pnl'
  | 'receivables'
  | 'payables'
  | 'banks'

const NO_DATE_TABS: TabValue[] = ['pnl', 'receivables', 'payables', 'banks']
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
      { value: 'pnl', label: '損益表', icon: PieChart },
      { value: 'payables', label: '應付帳款', icon: Building },
      { value: 'banks', label: '銀行餘額', icon: Banknote },
    ],
    []
  )

  if (permLoading) return null // ModuleGuard 已在外層顯示 loading
  if (!can(CAPABILITIES.FINANCE_READ_REPORTS)) return <UnauthorizedPage />

  // 2026-05-23 William 拍板：toolbar 搬回主標題區（header 右側）
  // ResponsiveHeader 內 tabs 與 actions 之間有 flex-1 spacer、actions 寬度變不會推 tabs 位置
  const headerToolbar = (
    <div className="flex items-center gap-3">
      {showDateSelector && <DateRangeSelector onChange={setDateRange} />}
      {showGranularity && (
        <>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center bg-morandi-container rounded-lg p-0.5">
            {GRANULARITY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setDetailGranularity(opt.value)}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  detailGranularity === opt.value
                    ? 'bg-card text-morandi-primary shadow-sm'
                    : 'text-morandi-secondary hover:text-morandi-primary'
                }`}
              >
                <opt.icon className="h-3.5 w-3.5" />
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
      {!showDateSelector && !showGranularity && (
        <span className="text-xs text-morandi-tertiary">即時資料</span>
      )}
    </div>
  )

  return (
    <ContentPageLayout
      title={t('financeReports')}
      icon={BarChart3}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      headerChildren={headerToolbar}
    >
      <div>
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
          <TabsContent value="pnl" className="mt-0">
            <TourPnlTab />
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
