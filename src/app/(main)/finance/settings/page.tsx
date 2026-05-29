'use client'

// 財務設定 page。本檔只當 router + data loader、實際 section 渲染交給 _components/。
//
// state ownership：
//   - data（paymentMethods / bankAccounts / chartOfAccounts / expenseCategories）+ loadData：留 page.tsx
//   - activeSection / dialog open + editing 物件：留 page.tsx（給 primaryAction「新增」按鈕用）
//   - mutation handler：搬進對應 section（每個 section 用 reload() 還回來）

import { useState, type Dispatch, type SetStateAction } from 'react'
import useSWR from 'swr'
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
  // 2026-05-22 預設停留銀行帳戶 tab（順序首位）
  const [activeSection, setActiveSection] = useState<ActiveSection>('bank')

  // 編輯對話框
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null)
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null)
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null)
  const [isMethodDialogOpen, setIsMethodDialogOpen] = useState(false)
  const [isBankDialogOpen, setIsBankDialogOpen] = useState(false)
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)

  const workspaceId = useAuthStore(state => state.user?.workspace_id)

  // 2026-05-29：原本 useEffect 手動 fetch、每次進頁都重抓 + 空白閃爍（違反紅線 F）。
  // 改 SWR：走全域 config（localStorage 持久化 + 5 分鐘 dedupe）、快取命中直接顯示、背景 revalidate。
  // key 帶 workspaceId 隔離（紅線 G）。API 失敗回 {error}、用 Array.isArray type guard 防崩。
  const jsonArray = async <T,>(url: string): Promise<T[]> => {
    const res = await fetch(url)
    const data = await res.json()
    return Array.isArray(data) ? (data as T[]) : []
  }

  const { data: paymentMethods = [], mutate: mutatePaymentMethods } = useSWR<PaymentMethod[]>(
    workspaceId ? `finance-payment-methods-${workspaceId}` : null,
    () => jsonArray<PaymentMethod>('/api/finance/payment-methods?include_inactive=true')
  )
  const { data: bankAccounts = [], mutate: mutateBankAccounts } = useSWR<BankAccount[]>(
    workspaceId ? `finance-bank-accounts-${workspaceId}` : null,
    () => jsonArray<BankAccount>('/api/bank-accounts')
  )
  const { data: chartOfAccounts = [] } = useSWR<ChartOfAccount[]>(
    workspaceId ? `finance-accounting-subjects-${workspaceId}` : null,
    () => jsonArray<ChartOfAccount>('/api/finance/accounting-subjects')
  )
  const { data: expenseCategories = [], mutate: mutateExpenseCategories } = useSWR<
    ExpenseCategory[]
  >(workspaceId ? `finance-expense-categories-${workspaceId}` : null, () =>
    jsonArray<ExpenseCategory>('/api/finance/expense-categories')
  )

  // section 仍用 setXxx 做樂觀更新、reload() 還原：adapter 寫進 SWR cache（不立即 revalidate）
  const setPaymentMethods: Dispatch<SetStateAction<PaymentMethod[]>> = action => {
    void mutatePaymentMethods(
      prev =>
        typeof action === 'function'
          ? (action as (p: PaymentMethod[]) => PaymentMethod[])(prev ?? [])
          : action,
      { revalidate: false }
    )
  }
  const setExpenseCategories: Dispatch<SetStateAction<ExpenseCategory[]>> = action => {
    void mutateExpenseCategories(
      prev =>
        typeof action === 'function'
          ? (action as (p: ExpenseCategory[]) => ExpenseCategory[])(prev ?? [])
          : action,
      { revalidate: false }
    )
  }

  // 2026-05-22 William 拍板：tab 順序 — 銀行帳戶 → 收款 → 付款 → 類別 → 收支項目 → 獎金
  const tabs = [
    { value: 'bank', label: '銀行帳戶', icon: Building2 },
    { value: 'receipt', label: '收款方式', icon: CreditCard },
    { value: 'payment', label: '付款方式', icon: Banknote },
    { value: 'category', label: '團體請款類別', icon: Tag },
    { value: 'company', label: '公司收支項目', icon: TrendingUp },
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
      company: {
        label: '新增收支項目',
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
            reload={async () => {
              await mutatePaymentMethods()
            }}
            setPaymentMethods={setPaymentMethods}
            isDialogOpen={isMethodDialogOpen}
            setIsDialogOpen={setIsMethodDialogOpen}
            editingMethod={editingMethod}
            setEditingMethod={setEditingMethod}
          />
        )}

        {(activeSection === 'category' || activeSection === 'company') && (
          <CategoriesSection
            variant={activeSection}
            expenseCategories={expenseCategories}
            chartOfAccounts={chartOfAccounts}
            workspaceId={workspaceId}
            reload={async () => {
              await mutateExpenseCategories()
            }}
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
            reload={async () => {
              await mutateBankAccounts()
            }}
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
