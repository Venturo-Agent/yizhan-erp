// 拖曳排序的 payment_method row（從 PaymentMethodsSection 抽出）

import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Pencil, Trash2, GripVertical, Copy } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTranslations } from 'next-intl'
import { type PaymentMethod } from './types'
import { PROVIDER_LABELS, isGatewayProvider } from '@/constants/payment-provider'

// 不用刻的 TableRow（要傳 ref/style 給 useSortable）、直接 <tr>
export function SortableMethodRow({
  method,
  loading,
  onEdit,
  onToggle,
  onDelete,
  onCopy,
}: {
  method: PaymentMethod
  loading: boolean
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
  onCopy: () => void
}) {
  const t = useTranslations('finance')
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: method.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : !method.is_active ? 0.5 : 1,
  }
  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="group border-b border-border/50 last:border-b-0 hover:bg-morandi-container/20 transition-colors"
    >
      {/* 拖曳把手（hover 時顯示） */}
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
      <td className="px-4 py-3 text-sm font-medium">{method.name}</td>
      {/* 金流商（B 方案 provider）*/}
      <td className="px-4 py-3 text-sm">
        {isGatewayProvider(method.provider) ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[0.7rem] font-medium bg-morandi-gold/15 text-morandi-gold">
            {PROVIDER_LABELS[method.provider] ?? method.provider}
          </span>
        ) : (
          <span className="text-morandi-muted text-xs">{PROVIDER_LABELS.manual}</span>
        )}
      </td>
      {/* 說明 */}
      <td className="px-4 py-3 text-sm text-morandi-muted">{method.description || '-'}</td>
      {/* 付款提示 */}
      <td className="px-4 py-3 text-sm text-morandi-muted">{method.placeholder || '-'}</td>
      {/* 借方科目 */}
      <td className="px-4 py-3 text-sm text-morandi-muted">
        {method.debit_account
          ? `${method.debit_account.code} ${method.debit_account.name}`
          : '-'}
      </td>
      {/* 貸方科目 */}
      <td className="px-4 py-3 text-sm text-morandi-muted">
        {method.credit_account
          ? `${method.credit_account.code} ${method.credit_account.name}`
          : '-'}
      </td>
      {/* 狀態（純 Switch、不再加「啟用/停用」中文撐高） */}
      <td className="px-4 py-3 text-sm w-[60px]">
        <Switch checked={method.is_active} onCheckedChange={onToggle} disabled={loading} />
      </td>
      {/* 操作（複製 / 編輯 / 刪除、寬度拉寬避免 wrap） */}
      <td className="px-4 py-3 text-sm w-[140px] text-right">
        <div className="flex justify-end gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={onCopy}
            title={t('tooltipCopyCustom')}
            disabled={loading}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
            title={t('tooltipEdit')}
            disabled={loading}
          >
            <Pencil className="h-4 w-4" />
          </Button>
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
        </div>
      </td>
    </tr>
  )
}
