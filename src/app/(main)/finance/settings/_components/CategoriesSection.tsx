// 請款類別 / 公司支出 / 公司收入 section
// 三個 section 共用 list 渲染（差別只在 type filter）
// 2026-05-21 William 拍板：UI 統一跟收款 / 付款方式一致 — 拖曳 + Switch、砍 sort_order input

'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { FormDialog } from '@/components/dialog'
import { Label } from '@/components/ui/label'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { alert, confirm } from '@/lib/ui/alert-dialog'
import { logger } from '@/lib/utils/logger'
import { COMMON_MESSAGES } from '@/constants/messages'
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
import { SortableCategoryRow } from './SortableCategoryRow'
import { apiMutate } from '@/lib/swr/api-mutate'
import { useWorkspaceFeatures } from '@/lib/permissions/hooks'

type CategoryType = 'expense' | 'company_expense' | 'company_income'

interface CategoriesSectionProps {
  /** 'category' = 團體請款類別、其他 = 公司支出 / 收入 */
  variant: 'category' | 'company_expense' | 'company_income'
  expenseCategories: ExpenseCategory[]
  chartOfAccounts: ChartOfAccount[]
  workspaceId: string | undefined
  reload: () => Promise<void>
  setExpenseCategories: React.Dispatch<React.SetStateAction<ExpenseCategory[]>>
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
  setExpenseCategories,
  isDialogOpen,
  setIsDialogOpen,
  editingCategory,
  setEditingCategory,
}: CategoriesSectionProps) {
  const t = useTranslations('finance')
  // 沒開通會計功能就隱藏借/貸方科目欄
  const { isFeatureEnabled } = useWorkspaceFeatures()
  const hasAccounting = isFeatureEnabled('accounting')
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

  // ===== 拖曳排序 =====
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = list.findIndex(c => c.id === active.id)
    const newIndex = list.findIndex(c => c.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(list, oldIndex, newIndex)

    // Optimistic update：local state 先換順序
    const reorderedIds = new Set(reordered.map(c => c.id))
    setExpenseCategories(prev => {
      const others = prev.filter(c => !reorderedIds.has(c.id))
      return [...others, ...reordered.map((c, idx) => ({ ...c, sort_order: idx + 1 }))]
    })

    try {
      await Promise.all(
        reordered.map((c, idx) =>
          apiMutate('/api/finance/expense-categories', {
            method: 'PUT',
            body: { id: c.id, sort_order: idx + 1 },
          })
        )
      )
    } catch (error) {
      logger.error('排序更新失敗:', error)
      await alert(COMMON_MESSAGES.UPDATE_FAILED, 'error')
      await reload()
    }
  }

  // 切換啟用 / 停用
  const handleToggleActive = async (category: ExpenseCategory) => {
    if (rowLoading[category.id]) return
    const newStatus = !category.is_active
    const action = newStatus ? '啟用' : '停用'
    const confirmed = await confirm(`確定要${action}「${category.name}」嗎？`, {
      title: `${action}類別`,
      type: 'warning',
    })
    if (!confirmed) return

    setLoading(category.id, true)
    try {
      const res = await apiMutate('/api/finance/expense-categories', {
        method: 'PUT',
        body: { id: category.id, is_active: newStatus },
        invalidate: ['/api/finance/expense-categories'],
      })
      if (!res.ok) {
        await alert(`${action}失敗`, 'error')
        return
      }
      await reload()
      await alert(`${action}成功`, 'success')
    } finally {
      setLoading(category.id, false)
    }
  }

  // 儲存（新增 / 編輯）
  const handleSaveCategory = async (category: Partial<ExpenseCategory>) => {
    const categoryType: CategoryType = dialogCategoryType

    const res = await apiMutate('/api/finance/expense-categories', {
      method: editingCategory?.id ? 'PUT' : 'POST',
      body: {
        ...category,
        id: editingCategory?.id,
        workspace_id: workspaceId,
        type: editingCategory?.id ? undefined : categoryType,
      },
      invalidate: ['/api/finance/expense-categories'],
    })
    if (!res.ok) {
      await alert(t('saveFailed'), 'error')
      return
    }
    await reload()
    setIsDialogOpen(false)
    setEditingCategory(null)
    await alert(t('saveSuccess'), 'success')
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
      const res = await apiMutate(`/api/finance/expense-categories?id=${category.id}`, {
        method: 'DELETE',
        invalidate: ['/api/finance/expense-categories'],
      })
      if (!res.ok) {
        await alert(t('deleteFailed'), 'error')
        return
      }
      await reload()
      await alert(t('deleteSuccess'), 'success')
    } finally {
      setLoading(category.id, false)
    }
  }

  const emptyText =
    variant === 'category'
      ? t('emptyCategories')
      : variant === 'company_expense'
        ? t('emptyCompanyExpense')
        : t('emptyCompanyIncome')

  return (
    <>
      <div className="space-y-4">
        <Card className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>{PAGE_LABELS.COL_NAME}</TableHead>
                  {hasAccounting && <TableHead>{PAGE_LABELS.COL_DEBIT_ACCOUNT}</TableHead>}
                  {hasAccounting && <TableHead>{PAGE_LABELS.COL_CREDIT_ACCOUNT}</TableHead>}
                  <TableHead className="w-[80px]">{PAGE_LABELS.COL_STATUS}</TableHead>
                  <TableHead className="w-[100px] text-right">{PAGE_LABELS.COL_ACTION}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={hasAccounting ? 6 : 4} className="text-center py-8 text-morandi-muted">
                      {emptyText}
                    </TableCell>
                  </TableRow>
                ) : (
                  <SortableContext
                    items={list.map(c => c.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {list.map(category => (
                      <SortableCategoryRow
                        key={category.id}
                        category={category}
                        showAccounting={hasAccounting}
                        loading={!!rowLoading[category.id]}
                        onEdit={() => {
                          setEditingCategory(category)
                          setIsDialogOpen(true)
                        }}
                        onToggle={() => handleToggleActive(category)}
                        onDelete={() => handleDeleteCategory(category)}
                      />
                    ))}
                  </SortableContext>
                )}
              </TableBody>
            </Table>
          </DndContext>
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

// 請款類別編輯對話框（砍 sort_order input、排序走列表拖曳）
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
  const { isFeatureEnabled } = useWorkspaceFeatures()
  const hasAccounting = isFeatureEnabled('accounting')
  const [name, setName] = useState('')
  const [debitAccountId, setDebitAccountId] = useState<string>('')
  const [creditAccountId, setCreditAccountId] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 根據類型決定科目篩選
  // 費用/公司支出: 借方=費用(5), 貸方=負債(2)
  // 公司收入: 借方=資產(1), 貸方=收入(4)
  const debitAccounts =
    categoryType === 'company_income'
      ? chartOfAccounts.filter(a => a.code.startsWith('1'))
      : chartOfAccounts.filter(a => a.code.startsWith('5'))
  const creditAccounts =
    categoryType === 'company_income'
      ? chartOfAccounts.filter(a => a.code.startsWith('4'))
      : chartOfAccounts.filter(a => a.code.startsWith('2'))

  useEffect(() => {
    if (open) {
      setName(category?.name || '')
      setDebitAccountId(category?.debit_account_id || '')
      setCreditAccountId(category?.credit_account_id || '')
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
        {hasAccounting && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('debitAccountExpense')}</Label>
              <select
                value={debitAccountId}
                onChange={e => setDebitAccountId(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="">{PAGE_LABELS.PLEASE_SELECT}</option>
                {debitAccounts.map(account => (
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
                {creditAccounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.code} {account.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        <p className="text-xs text-morandi-muted">
          {t('categoryHint')}
        </p>
      </div>
    </FormDialog>
  )
}
