// 拖曳排序的 expense_category row（仿 SortableMethodRow pattern）
// 2026-05-21 William 拍板：類別 UI 統一拖曳 + Switch、跟收款 / 付款方式一致

import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Pencil, Trash2, GripVertical } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTranslations } from 'next-intl'
import { PAGE_LABELS, type ExpenseCategory } from './types'

export function SortableCategoryRow({
  category,
  loading,
  onEdit,
  onToggle,
  onDelete,
  showAccounting,
}: {
  category: ExpenseCategory
  loading: boolean
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
  showAccounting: boolean
}) {
  const t = useTranslations('finance')
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : !category.is_active ? 0.5 : 1,
  }
  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="group border-b border-border/50 last:border-b-0 hover:bg-morandi-container/20 transition-colors"
    >
      {/* 拖曳把手 */}
      <td className="w-[40px] px-2 py-3 text-center">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity p-1 inline-flex"
          aria-label={t('tooltipDragSort')}
        >
          <GripVertical className="h-4 w-4 text-morandi-secondary" />
        </button>
      </td>
      {/* 名稱 */}
      <td className="px-4 py-3 text-sm font-medium">{category.name}</td>
      {/* 借/貸方科目 — 僅開通會計功能顯示 */}
      {showAccounting && (
        <td className="px-4 py-3 text-sm text-morandi-muted">
          {category.debit_account
            ? `${category.debit_account.code} ${category.debit_account.name}`
            : PAGE_LABELS.NOT_SET}
        </td>
      )}
      {showAccounting && (
        <td className="px-4 py-3 text-sm text-morandi-muted">
          {category.credit_account
            ? `${category.credit_account.code} ${category.credit_account.name}`
            : PAGE_LABELS.NOT_SET}
        </td>
      )}
      {/* 狀態 — Switch、不撐高 */}
      <td className="px-4 py-3 text-sm w-[60px]">
        <Switch checked={category.is_active} onCheckedChange={onToggle} disabled={loading} />
      </td>
      {/* 操作 */}
      <td className="px-4 py-3 text-sm w-[100px] text-right">
        <div className="flex justify-end gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
            title={t('tooltipEdit')}
            disabled={loading}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {!category.is_system && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="text-status-danger hover:text-status-danger/80"
              title={t('tooltipDelete')}
              disabled={loading}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </td>
    </tr>
  )
}
