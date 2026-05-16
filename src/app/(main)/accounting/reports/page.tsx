'use client'

import { Card } from '@/components/ui/card'
import { BookOpen, BarChart3, TrendingUp, DollarSign } from 'lucide-react'
import Link from 'next/link'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { useTranslations } from 'next-intl'

const reports = [
  {
    href: '/accounting/reports/general-ledger',
    icon: BookOpen,
    title: '總帳',
    description: '查看科目明細帳',
    color: 'text-status-info',
    bg: 'bg-status-info/10',
  },
  {
    href: '/accounting/reports/trial-balance',
    icon: BarChart3,
    title: '試算表',
    description: '查看所有科目餘額',
    color: 'text-morandi-green',
    bg: 'bg-morandi-green/10',
  },
  {
    href: '/accounting/reports/income-statement',
    icon: TrendingUp,
    title: '損益表',
    description: '查看收入與支出',
    color: 'text-morandi-secondary',
    bg: 'bg-morandi-container',
  },
  {
    href: '/accounting/reports/balance-sheet',
    icon: DollarSign,
    title: '資產負債表',
    description: '查看資產、負債、權益',
    color: 'text-status-warning',
    bg: 'bg-status-warning/10',
  },
]

export default function ReportsPage() {
  const t = useTranslations('accounting')
  return (
    <ContentPageLayout title={t('accountingReports')}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
        {reports.map(report => (
          <Link key={report.href} href={report.href}>
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${report.bg}`}>
                  <report.icon className={`w-6 h-6 ${report.color}`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{report.title}</h3>
                  <p className="text-sm text-muted-foreground">{report.description}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </ContentPageLayout>
  )
}
