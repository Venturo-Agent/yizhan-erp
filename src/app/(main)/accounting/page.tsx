'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import {
  FileText,
  BookOpen,
  BarChart3,
  TrendingUp,
  Calendar,
  AlertTriangle,
  Edit,
} from 'lucide-react'
import Link from 'next/link'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { logger } from '@/lib/utils/logger'
import { useTranslations } from 'next-intl'

const PAGE_LABELS = {
  SETUP_INCOMPLETE: '會計設定不完整',
  GO_TO_FINANCE_SETTINGS: '前往「財務設定」補上 →',
} as const

interface SetupGap {
  paymentMethodsMissing: number
  expenseCategoriesMissing: number
  bankAccountsMissing: number
  totalMissing: number
}

export default function AccountingPage() {
  const { user } = useAuthStore()
  const t = useTranslations('accounting')
  const [gap, setGap] = useState<SetupGap | null>(null)

  const quickLinks = [
    {
      href: '/accounting/vouchers',
      icon: FileText,
      title: t('voucherManagement'),
      description: '查看和管理會計傳票',
      color: 'text-status-info',
      bg: 'bg-status-info/10',
    },
    {
      href: '/accounting/accounts',
      icon: BookOpen,
      title: t('accountManagement'),
      description: '管理會計科目表',
      color: 'text-status-success',
      bg: 'bg-status-success/10',
    },
    {
      href: '/accounting/reports',
      icon: BarChart3,
      title: t('accountingReports'),
      description: '總帳、試算表、損益表',
      color: 'text-morandi-secondary',
      bg: 'bg-morandi-container',
    },
    {
      href: '/accounting/checks',
      icon: TrendingUp,
      title: t('checkManagement'),
      description: '管理支票和票據',
      color: 'text-status-warning',
      bg: 'bg-status-warning/10',
    },
    {
      href: '/accounting/period-closing',
      icon: Calendar,
      title: t('periodClosingTitle'),
      description: '月結、季結、年結（含保留盈餘）',
      color: 'text-status-danger',
      bg: 'bg-status-danger/10',
    },
    {
      href: '/accounting/opening-balances',
      icon: Edit,
      title: t('openingBalances'),
      description: '啟用會計時設定資產 / 負債 / 權益期初',
      color: 'text-morandi-gold',
      bg: 'bg-morandi-gold/10',
    },
  ]

  useEffect(() => {
    let cancelled = false
    const checkSetup = async () => {
      if (!user?.workspace_id) return
      try {
        const [pmRes, ecRes, baRes] = await Promise.all([
          supabase
            .from('payment_methods')
            .select('id', { count: 'exact', head: true })
            .eq('workspace_id', user.workspace_id)
            .eq('is_active', true)
            .or('debit_account_id.is.null,credit_account_id.is.null'),
          supabase
            .from('expense_categories')
            .select('id', { count: 'exact', head: true })
            .eq('is_active', true)
            .or('debit_account_id.is.null,credit_account_id.is.null'),
          supabase
            .from('bank_accounts')
            .select('id', { count: 'exact', head: true })
            .eq('workspace_id', user.workspace_id)
            .eq('is_active', true)
            .is('account_id', null),
        ])
        const pm = pmRes.count || 0
        const ec = ecRes.count || 0
        const ba = baRes.count || 0
        const total = pm + ec + ba
        if (!cancelled) {
          setGap({
            paymentMethodsMissing: pm,
            expenseCategoriesMissing: ec,
            bankAccountsMissing: ba,
            totalMissing: total,
          })
        }
      } catch (error) {
        logger.error('讀取會計設定狀況失敗:', error)
      }
    }
    checkSetup()
    return () => {
      cancelled = true
    }
  }, [user?.workspace_id])

  return (
    <ContentPageLayout title={t('accountingSystem')}>
      {gap && gap.totalMissing > 0 && (
        <Card className="p-4 mb-4 bg-status-warning-bg border-status-warning/40">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-status-warning flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-status-warning mb-1">
                {PAGE_LABELS.SETUP_INCOMPLETE}
              </div>
              <div className="text-sm text-morandi-primary space-y-0.5">
                {gap.paymentMethodsMissing > 0 && (
                  <div>• {gap.paymentMethodsMissing} 個收款方式還沒綁會計科目</div>
                )}
                {gap.expenseCategoriesMissing > 0 && (
                  <div>• {gap.expenseCategoriesMissing} 個請款類別還沒綁會計科目</div>
                )}
                {gap.bankAccountsMissing > 0 && (
                  <div>• {gap.bankAccountsMissing} 個銀行帳戶還沒綁會計科目</div>
                )}
                <div className="mt-2">
                  <Link
                    href="/finance/settings"
                    className="text-status-info underline hover:text-status-info/80"
                  >
                    {PAGE_LABELS.GO_TO_FINANCE_SETTINGS}
                  </Link>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  沒綁科目的項目、收款 / 請款 / 出納確認後不會自動產生傳票。
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {quickLinks.map(link => (
          <Link key={link.href} href={link.href}>
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${link.bg}`}>
                  <link.icon className={`w-6 h-6 ${link.color}`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{link.title}</h3>
                  <p className="text-sm text-muted-foreground">{link.description}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </ContentPageLayout>
  )
}
