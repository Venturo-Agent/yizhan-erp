// 請款類別 / 公司支出 / 公司收入 section
// 三個 section 共用 list 渲染（差別只在 type filter + 是否顯示 sort_order 欄位）
// 含 CategoryDialog + 所有 mutation handler

'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { FormDialog } from '@/components/dialog'
import { Label } from '@/components/ui/label'
import { Pencil, Trash2 } from 'lucide-react'
import { alert, confirm } from '@/lib/ui/alert-dialog'
import { useTranslations } from 'next-intl'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from './shared-table'
import { PAGE_LABELS, type ExpenseCategory, type ChartOfAccount } from './types'

type CategoryType = 'expense' | 'company_expense' | 'company_income'

interface CategoriesSectionProps {
  /** 'category' = 團體請款類別、其他 = 公司支出 / 收入 */
  variant: 'category' | 'company_expense' | 'company_income'
  expenseCategories: ExpenseCategory[]
  chartOfAccounts: ChartOfAccount[]
  workspaceId: string | undefined
  reload: () => Promise<void>
  isDialogOpen: boolean
  setIsDialogOpen: (open: boolean) => void
  editingCategory: ExpenseCategory | null
  setEditingCategory: (c: ExpenseCategory | null) => void
}

export function CategoriesSection({
  variant,
  expenseCategories,
  chartOfAccounts,
  workspaceId,
  reload,
  isDialogOpen,
  setIsDialogOpen,
  editingCategory,
  setEditingCategory,
}: CategoriesSectionProps) {
  const t = useTranslations('finance')
  const [rowLoading, setRowLoading] = useState<Record<string, boolean>>({})
  const setLoading = (id: string, v: boolean) =>
    setRowLoading(prev => ({ ...prev, [id]: v }))

  // 依 variant 篩 list + 設定 dialog 用 categoryType
  const list =
    variant === 'category'
      ? expenseCategories.filter(c => c.type === 'expense' || c.type === 'both')
      : variant === 'company_expense'
        ? expenseCategories.filter(c => c.type === 'company_expense')
        : expenseCategories.filter(c => c.type === 'company_income')

  const dialogCategoryType: CategoryType =
    variant === 'company_expense'
      ? 'company_expense'
      : variant === 'company_income'
        ? 'company_income'
        : 'expense'

  // 儲存
  const handleSaveCategory = async (category: Partial<ExpenseCategory>) => {
    // 決定 category type（編輯時不改）
    const categoryType: CategoryType = dialogCategoryType

    try {
      const res = await fetch('/api/finance/expense-categories', {
        method: editingCategory?.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...category,
          id: editingCategory?.id,
          workspace_id: workspaceId,
          type: editingCategory?.id ? undefined : categoryType, // 新增時設定 type、編輯時不改
        }),
      })
      if (!res.ok) throw new Error(t('saveFailed'))
      await reload()
      setIsDialogOpen(false)
      setEditingCategory(null)
      await alert(t('saveSuccess'), 'success')
    } catch {
      await alert(t('saveFailed'), 'error')
    }
  }

  // 刪除
  const handleDeleteCategory = async (category: ExpenseCategory) => {
    if (rowLoading[category.id]) return
    if (category.is_system) {
      await alert(t('systemDefaultCannotDelete'), 'warning')
      return
    }

    const confirmed = await confirm(t('deleteCategoryConfirm', { name: category.name }), {
      title: t('deleteCategoryTitle'),
      type: 'warning',
    })
    if (!confirmed) return

    setLoading(category.id, true)
    try {
      const res = await fetch(`/api/finance/expense-categories?id=${category.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error(t('deleteFailed'))
      await reload()
      await alert(t('deleteSuccess'), 'success')
    } catch {
      await alert(t('deleteFailed'), 'error')
    } finally {
      setLoading(category.id, false)
    }
  }

  // 顯示文字
  const emptyText =
    variant === 'category'
      ? t('emptyCategories')
      : variant === 'company_expense'
        ? t('emptyCompanyExpense')
        : t('emptyCompanyIncome')

  // 「請款類別」不顯示 sort_order 欄、其他兩個顯示
  const showSortColumn = variant !== 'category'
  const colSpan = showSortColumn ? 6 : 5

  return (
    <>
      <div className="space-y-4">
        <Card className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                {showSortColumn && (
                  <TableHead className="w-[60px]">{PAGE_LABELS.COL_SORT}</TableHead>
                )}
                <TableHead>{PAGE_LABELS.COL_NAME}</TableHead>
                <TableHead>{PAGE_LABELS.COL_DEBIT_ACCOUNT}</TableHead>
                <TableHead>{PAGE_LABELS.COL_CREDIT_ACCOUNT}</TableHead>
                <TableHead className="w-[80px]">{PAGE_LABELS.COL_STATUS}</TableHead>
                <TableHead className="w-[100px] text-right">
                  {PAGE_LABELS.COL_ACTION}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colSpan} className="text-center py-8 text-morandi-muted">
                    {emptyText}
                  </TableCell>
                </TableRow>
              ) : (
                list.map(category => (
                  <TableRow key={category.id}>
                    {showSortColumn && (
                      <TableCell className="text-morandi-muted">{category.sort_order}</TableCell>
                    )}
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell>
                      {category.debit_account ? (
                        <span className="text-sm">
                          {category.debit_account.code} {category.debit_account.name}
                        </span>
                      ) : (
                        <span className="text-morandi-muted text-sm">{PAGE_LABELS.NOT_SET}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {category.credit_account ? (
                        <span className="text-sm">
                          {category.credit_account.code} {category.credit_account.name}
                        </span>
                      ) : (
                        <span className="text-morandi-muted text-sm">{PAGE_LABELS.NOT_SET}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={category.is_active ? 'default' : 'secondary'}>
                        {category.is_active ? t('statusActive') : t('statusInactive')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingCategory(category)
                            setIsDialogOpen(true)
                          }}
                          disabled={!!rowLoading[category.id]}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {!category.is_system && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteCategory(category)}
                            className="text-status-danger hover:text-status-danger/80"
                            disabled={!!rowLoading[category.id]}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      <CategoryDialog
        open={isDialogOpen}
        onOpenChange={(open: boolean) => {
          setIsDialogOpen(open)
          if (!open) setEditingCategory(null)
        }}
        category={editingCategory}
        onSave={handleSaveCategory}
        chartOfAccounts={chartOfAccounts}
        categoryType={dialogCategoryType}
      />
    </>
  )
}

// 請款類別編輯對話框
function CategoryDialog({
  open,
  onOpenChange,
  category,
  onSave,
  chartOfAccounts,
  categoryType = 'expense',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: ExpenseCategory | null
  onSave: (category: Partial<ExpenseCategory>) => Promise<void>
  chartOfAccounts: ChartOfAccount[]
  categoryType?: CategoryType
}) {
  const t = useTranslations('finance')
  const [name, setName] = useState('')
  const [debitAccountId, setDebitAccountId] = useState<string>('')
  const [creditAccountId, setCreditAccountId] = useState<string>('')
  const [sortOrder, setSortOrder] = useState(100)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 根據類型決定科目篩選
  // 費用/公司支出: 借方=費用(5), 貸方=負債(2)
  // 公司收入: 借方=資產(1), 貸方=收入(4)
  const debitAccounts =
    categoryType === 'company_income'
      ? chartOfAccounts.filter(a => a.code.startsWith('1')) // 資產類
      : chartOfAccounts.filter(a => a.code.startsWith('5')) // 費用類
  const creditAccounts =
    categoryType === 'company_income'
      ? chartOfAccounts.filter(a => a.code.startsWith('4')) // 收入類
      : chartOfAccounts.filter(a => a.code.startsWith('2')) // 負債類

  // 舊變數保留向後相容
  const expenseAccounts = debitAccounts
  const liabilityAccounts = creditAccounts

  useEffect(() => {
    if (open) {
      setName(category?.name || '')
      setDebitAccountId(category?.debit_account_id || '')
      setCreditAccountId(category?.credit_account_id || '')
      setSortOrder(category?.sort_order || 100)
    }
  }, [open, category])

  const handleSubmit = async () => {
    if (!name) {
      await alert(t('pleaseFillCategoryName'), 'warning')
      return
    }
    setIsSubmitting(true)
    try {
      await onSave({
        name,
        debit_account_id: debitAccountId || null,
        credit_account_id: creditAccountId || null,
        sort_order: sortOrder,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={(() => {
        const mode = category ? 'Edit' : 'Create'
        const kind = categoryType === 'company_expense' ? 'CompanyExpense' : categoryType === 'company_income' ? 'CompanyIncome' : 'Expense'
        return t(`categoryDialogTitle${mode}${kind}` as Parameters<typeof t>[0])
      })()}
      onSubmit={handleSubmit}
      submitLabel={isSubmitting ? t('saving') : t('saveLabel')}
      loading={isSubmitting}
      submitDisabled={!name}
      maxWidth="md"
    >
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>{t('fieldNameRequired')}</Label>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={PAGE_LABELS.CATEGORY_NAME_PLACEHOLDER}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('debitAccountExpense')}</Label>
            <select
              value={debitAccountId}
              onChange={e => setDebitAccountId(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="">{PAGE_LABELS.PLEASE_SELECT}</option>
              {expenseAccounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.code} {account.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>{t('creditAccountLiability')}</Label>
            <select
              value={creditAccountId}
              onChange={e => setCreditAccountId(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="">{PAGE_LABELS.PLEASE_SELECT}</option>
              {liabilityAccounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.code} {account.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-xs text-morandi-muted">
          {t('categoryHint')}
        </p>
        <div className="space-y-2">
          <Label>{PAGE_LABELS.SORT}</Label>
          <Input
            type="number"
            value={sortOrder}
            onChange={e => {
              // bug fix: 清空 input 時 Number('') = 0、保留至少 0
              const v = e.target.value
              setSortOrder(v === '' ? 0 : Number(v))
            }}
            placeholder="100"
            className="w-24"
          />
        </div>
      </div>
    </FormDialog>
  )
}
