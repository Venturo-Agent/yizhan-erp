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
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { alert, confirm } from '@/lib/ui/alert-dialog'
import { logger } from '@/lib/utils/logger'
import { COMMON_MESSAGES } from '@/constants/messages'
import { useTranslations } from 'next-intl'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './shared-table'
import { PAGE_LABELS, type ExpenseCategory, type ChartOfAccount } from './types'
import { SortableCategoryRow } from './SortableCategoryRow'
import { apiMutate } from '@/lib/swr/api-mutate'
import { useWorkspaceFeatures } from '@/lib/permissions/hooks'

type CategoryType = 'expense' | 'company_expense' | 'company_income'

// 借/貸科目「請選擇」哨兵值：Radix Select 不允許 SelectItem value=""，用此值代表「未選」（送出時對應 null）
const ACCOUNT_NONE = '__none__'

interface CategoriesSectionProps {
  /** 'category' = 團體請款類別、'company' = 公司收支項目（支出+收入合併、2026-05-26） */
  variant: 'category' | 'company'
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
  const setLoading = (id: string, v: boolean) => setRowLoading(prev => ({ ...prev, [id]: v }))

  // 依 variant 篩 list
  // company = 支出+收入合併顯示、支出群組在前、群組內依 sort_order
  const list =
    variant === 'category'
      ? expenseCategories.filter(c => c.type === 'expense' || c.type === 'both')
      : expenseCategories
          .filter(c => c.type === 'company_expense' || c.type === 'company_income')
          .sort((a, b) => {
            const rank = (tp: string) => (tp === 'company_income' ? 1 : 0)
            return rank(a.type) - rank(b.type) || (a.sort_order || 0) - (b.sort_order || 0)
          })

  // 彈窗預設類型：team 請款用 expense、公司收支新增預設 company_expense（彈窗內可改選收入）
  const dialogCategoryType: CategoryType = variant === 'company' ? 'company_expense' : 'expense'

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
    // 新增時的 type：公司收支由彈窗回傳（category.type）、團體請款用 dialogCategoryType
    // 編輯時不帶 type（type 建立後不可改）
    const res = await apiMutate('/api/finance/expense-categories', {
      method: editingCategory?.id ? 'PUT' : 'POST',
      body: {
        ...category,
        id: editingCategory?.id,
        workspace_id: workspaceId,
        type: editingCategory?.id ? undefined : (category.type ?? dialogCategoryType),
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

  const emptyText = variant === 'category' ? t('emptyCategories') : PAGE_LABELS.EMPTY_COMPANY

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
                  <TableHead className="w-[280px]">{PAGE_LABELS.COL_NAME}</TableHead>
                  {variant === 'company' && (
                    <TableHead className="w-[90px]">{PAGE_LABELS.COL_TYPE}</TableHead>
                  )}
                  {hasAccounting && (
                    <TableHead className="w-[220px]">{PAGE_LABELS.COL_DEBIT_ACCOUNT}</TableHead>
                  )}
                  {hasAccounting && (
                    <TableHead className="w-[220px]">{PAGE_LABELS.COL_CREDIT_ACCOUNT}</TableHead>
                  )}
                  <TableHead className="w-[80px]">{PAGE_LABELS.COL_STATUS}</TableHead>
                  {/* 彈性留白欄：吸收多餘寬度、名稱欄鎖 280px、操作欄靠右、切 tab 不跳 */}
                  <TableHead />
                  <TableHead className="w-[100px]">{PAGE_LABELS.COL_ACTION}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={(hasAccounting ? 7 : 5) + (variant === 'company' ? 1 : 0)}
                      className="text-center py-8 text-morandi-muted"
                    >
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
                        showType={variant === 'company'}
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
        showTypeChoice={variant === 'company'}
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
  showTypeChoice = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: ExpenseCategory | null
  onSave: (category: Partial<ExpenseCategory>) => Promise<void>
  chartOfAccounts: ChartOfAccount[]
  categoryType?: CategoryType
  /** 公司收支：新增時讓使用者選支出/收入（驅動科目過濾），編輯時類型鎖定 */
  showTypeChoice?: boolean
}) {
  const t = useTranslations('finance')
  const { isFeatureEnabled } = useWorkspaceFeatures()
  const hasAccounting = isFeatureEnabled('accounting')
  const [name, setName] = useState('')
  const [debitAccountId, setDebitAccountId] = useState<string>('')
  const [creditAccountId, setCreditAccountId] = useState<string>('')
  // 公司收支類型選擇（支出/收入）：編輯沿用既有、新增預設支出
  const [typeChoice, setTypeChoice] = useState<CategoryType>('company_expense')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 有效類型：公司收支看使用者選的（typeChoice），其他 variant 用傳入的 categoryType
  const effectiveType: CategoryType = showTypeChoice ? typeChoice : categoryType

  // 根據類型決定科目篩選
  // 費用/公司支出: 借方=費用(5), 貸方=負債(2)
  // 公司收入: 借方=資產(1), 貸方=收入(4)
  const debitAccounts =
    effectiveType === 'company_income'
      ? chartOfAccounts.filter(a => a.code.startsWith('1'))
      : chartOfAccounts.filter(a => a.code.startsWith('5'))
  const creditAccounts =
    effectiveType === 'company_income'
      ? chartOfAccounts.filter(a => a.code.startsWith('4'))
      : chartOfAccounts.filter(a => a.code.startsWith('2'))

  useEffect(() => {
    if (open) {
      setName(category?.name || '')
      setDebitAccountId(category?.debit_account_id || '')
      setCreditAccountId(category?.credit_account_id || '')
      // 編輯沿用既有類型、新增預設支出
      setTypeChoice((category?.type as CategoryType) ?? 'company_expense')
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
        // 公司收支新增時帶上選的類型（支出/收入）；編輯時上層會忽略 type
        ...(showTypeChoice ? { type: effectiveType } : {}),
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
        const kind =
          effectiveType === 'company_expense'
            ? 'CompanyExpense'
            : effectiveType === 'company_income'
              ? 'CompanyIncome'
              : 'Expense'
        return t(`categoryDialogTitle${mode}${kind}` as Parameters<typeof t>[0])
      })()}
      onSubmit={handleSubmit}
      submitLabel={isSubmitting ? t('saving') : t('saveLabel')}
      loading={isSubmitting}
      submitDisabled={!name}
      maxWidth="md"
    >
      <div className="space-y-4 py-4">
        {/* 公司收支：選支出 / 收入（驅動科目過濾）；編輯時鎖定不可改 */}
        {showTypeChoice && (
          <div className="space-y-2">
            <Label>{PAGE_LABELS.COL_TYPE} *</Label>
            {category ? (
              <p className="text-sm text-morandi-secondary">
                {effectiveType === 'company_income'
                  ? PAGE_LABELS.TYPE_INCOME
                  : PAGE_LABELS.TYPE_EXPENSE}
                <span className="ml-2 text-xs text-morandi-muted">
                  {PAGE_LABELS.TYPE_LOCKED_HINT}
                </span>
              </p>
            ) : (
              <Select
                value={typeChoice}
                onValueChange={v => {
                  setTypeChoice(v as CategoryType)
                  // 切換收支 → 借貸科目選項不同、清掉已選避免殘留無效值
                  setDebitAccountId('')
                  setCreditAccountId('')
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="company_expense">{PAGE_LABELS.TYPE_EXPENSE}</SelectItem>
                  <SelectItem value="company_income">{PAGE_LABELS.TYPE_INCOME}</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        )}
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
              <Label>
                {showTypeChoice ? PAGE_LABELS.COL_DEBIT_ACCOUNT : t('debitAccountExpense')}
              </Label>
              <Select
                value={debitAccountId || ACCOUNT_NONE}
                onValueChange={v => setDebitAccountId(v === ACCOUNT_NONE ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={PAGE_LABELS.PLEASE_SELECT} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ACCOUNT_NONE}>{PAGE_LABELS.PLEASE_SELECT}</SelectItem>
                  {debitAccounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.code} {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                {showTypeChoice ? PAGE_LABELS.COL_CREDIT_ACCOUNT : t('creditAccountLiability')}
              </Label>
              <Select
                value={creditAccountId || ACCOUNT_NONE}
                onValueChange={v => setCreditAccountId(v === ACCOUNT_NONE ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={PAGE_LABELS.PLEASE_SELECT} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ACCOUNT_NONE}>{PAGE_LABELS.PLEASE_SELECT}</SelectItem>
                  {creditAccounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.code} {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        <p className="text-xs text-morandi-muted">{t('categoryHint')}</p>
      </div>
    </FormDialog>
  )
}
