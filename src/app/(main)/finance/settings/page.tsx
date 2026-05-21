'use client'

// 財務設定 page。本檔只當 router + data loader、實際 section 渲染交給 _components/。
//
// state ownership：
//   - data（paymentMethods / bankAccounts / chartOfAccounts / expenseCategories）+ loadData：留 page.tsx
//   - activeSection / dialog open + editing 物件：留 page.tsx（給 primaryAction「新增」按鈕用）
//   - mutation handler：搬進對應 section（每個 section 用 reload() 還回來）

import { useState, useEffect } from 'react'
import { UnauthorizedPage } from '@/components/unauthorized-page'
import { useCapabilities, CAPABILITIES } from '@/lib/permissions'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { useTranslations } from 'next-intl'
import {
  Settings,
  CreditCard,
  Banknote,
  Plus,
  Building2,
  Tag,
  TrendingUp,
  Award,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { logger } from '@/lib/utils/logger'
import { toast } from 'sonner'
import { alert } from '@/lib/ui/alert-dialog'
import {
  type PaymentMethod,
  type BankAccount,
  type ChartOfAccount,
  type ExpenseCategory,
  type ActiveSection,
} from './_components/types'
import { PaymentMethodsSection } from './_components/PaymentMethodsSection'
import { BankAccountsSection } from './_components/BankAccountsSection'
import { CategoriesSection } from './_components/CategoriesSection'
import { BonusSection } from './_components/BonusSection'

export default function FinanceSettingsPage() {
  const t = useTranslations('finance')
  const { can, loading: permLoading } = useCapabilities()
  const [activeSection, setActiveSection] = useState<ActiveSection>('receipt')
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [chartOfAccounts, setChartOfAccounts] = useState<ChartOfAccount[]>([])
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([])

  // 編輯對話框
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null)
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null)
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null)
  const [isMethodDialogOpen, setIsMethodDialogOpen] = useState(false)
  const [isBankDialogOpen, setIsBankDialogOpen] = useState(false)
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)

  const workspaceId = useAuthStore(state => state.user?.workspace_id)

  // 載入資料
  useEffect(() => {
    if (workspaceId) {
      loadData()
    }
  }, [workspaceId])

  const loadData = async () => {
    try {
      // 2026-05-21 重構：4 個 fetch 改 Promise.all 並行（原本串行、無謂多 3 個 RTT）
      // 也拿掉冗餘 ?workspace_id=（4 個 API 都從 session 取、不信 client）
      const [methodsRes, banksRes, accountsRes, categoriesRes] = await Promise.all([
        fetch('/api/finance/payment-methods?include_inactive=true'),
        fetch('/api/bank-accounts'),
        fetch('/api/finance/accounting-subjects'),
        fetch('/api/finance/expense-categories'),
      ])
      const [methodsData, banksData, accountsData, categoriesData] = await Promise.all([
        methodsRes.json(),
        banksRes.json(),
        accountsRes.json(),
        categoriesRes.json(),
      ])
      // bug fix: API 失敗時回 {error: ...}、要 type guard 防止 setState 成 object 後 .filter 崩
      setPaymentMethods(Array.isArray(methodsData) ? methodsData : [])
      setBankAccounts(Array.isArray(banksData) ? banksData : [])
      setChartOfAccounts(Array.isArray(accountsData) ? accountsData : [])
      setExpenseCategories(Array.isArray(categoriesData) ? categoriesData : [])
    } catch (error) {
      logger.error('載入資料失敗:', error)
      // 2026-05-21 加：失敗也要告訴 user、不再靜默
      toast.error('財務設定載入失敗、請重新整理或聯絡管理員')
    }
  }

  const tabs = [
    { value: 'receipt', label: '收款方式', icon: CreditCard },
    { value: 'payment', label: '付款方式', icon: Banknote },
    { value: 'category', label: '團體請款類別', icon: Tag },
    { value: 'company_expense', label: '公司支出項目', icon: Building2 },
    { value: 'company_income', label: '公司收入項目', icon: TrendingUp },
    { value: 'bank', label: '銀行帳戶', icon: Building2 },
    { value: 'bonus', label: '獎金設定', icon: Award },
  ]

  // 新增按鈕
  const renderAddButton = () => {
    const buttonConfig: Record<string, { label: string; onClick: () => void }> = {
      receipt: {
        label: '新增收款方式',
        onClick: () => {
          setEditingMethod(null)
          setIsMethodDialogOpen(true)
        },
      },
      payment: {
        label: '新增付款方式',
        onClick: () => {
          setEditingMethod(null)
          setIsMethodDialogOpen(true)
        },
      },
      category: {
        label: '新增請款類別',
        onClick: () => {
          setEditingCategory(null)
          setIsCategoryDialogOpen(true)
        },
      },
      company_expense: {
        label: '新增支出項目',
        onClick: () => {
          setEditingCategory(null)
          setIsCategoryDialogOpen(true)
        },
      },
      company_income: {
        label: '新增收入項目',
        onClick: () => {
          setEditingCategory(null)
          setIsCategoryDialogOpen(true)
        },
      },
      bank: {
        label: '新增銀行帳戶',
        onClick: () => {
          setEditingBank(null)
          setIsBankDialogOpen(true)
        },
      },
      bonus: {
        label: '新增獎金規則',
        onClick: () => {
          alert('獎金設定功能即將推出', 'info')
        },
      },
    }
    const config = buttonConfig[activeSection]
    if (!config) return undefined
    return { label: config.label, icon: Plus, onClick: config.onClick }
  }

  if (permLoading) return null // ModuleGuard 已在外層顯示 loading
  if (!can(CAPABILITIES.FINANCE_READ_SETTINGS)) return <UnauthorizedPage />

  return (
    <ContentPageLayout
      title={t('financeSettings')}
      icon={Settings}
      tabs={tabs}
      activeTab={activeSection}
      onTabChange={value => setActiveSection(value as ActiveSection)}
      primaryAction={renderAddButton()}
    >
      <div>
        {(activeSection === 'receipt' || activeSection === 'payment') && (
          <PaymentMethodsSection
            type={activeSection}
            paymentMethods={paymentMethods}
            chartOfAccounts={chartOfAccounts}
            workspaceId={workspaceId}
            reload={loadData}
            setPaymentMethods={setPaymentMethods}
            isDialogOpen={isMethodDialogOpen}
            setIsDialogOpen={setIsMethodDialogOpen}
            editingMethod={editingMethod}
            setEditingMethod={setEditingMethod}
          />
        )}

        {(activeSection === 'category' ||
          activeSection === 'company_expense' ||
          activeSection === 'company_income') && (
          <CategoriesSection
            variant={activeSection}
            expenseCategories={expenseCategories}
            chartOfAccounts={chartOfAccounts}
            workspaceId={workspaceId}
            reload={loadData}
            setExpenseCategories={setExpenseCategories}
            isDialogOpen={isCategoryDialogOpen}
            setIsDialogOpen={setIsCategoryDialogOpen}
            editingCategory={editingCategory}
            setEditingCategory={setEditingCategory}
          />
        )}

        {activeSection === 'bank' && (
          <BankAccountsSection
            bankAccounts={bankAccounts}
            workspaceId={workspaceId}
            reload={loadData}
            isDialogOpen={isBankDialogOpen}
            setIsDialogOpen={setIsBankDialogOpen}
            editingBank={editingBank}
            setEditingBank={setEditingBank}
          />
        )}

        {activeSection === 'bonus' && <BonusSection />}
      </div>
    </ContentPageLayout>
  )
}
