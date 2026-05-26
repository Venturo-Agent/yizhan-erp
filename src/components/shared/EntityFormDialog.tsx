'use client'
/**
 * EntityFormDialog — 實體表單對話框（新增 / 編輯 + 可選刪除）
 *
 * 在 FormDialog 基礎上加入：
 * - `entity` prop：有值 = 編輯模式（標題顯示「編輯 X」），null/undefined = 新增模式
 * - `onDelete` prop：有值且在編輯模式下，標題列右側顯示刪除按鈕
 *
 * 業務場景：
 * - 新增 / 編輯同一張表單、只差在 entity 是否有值
 * - 需要在 Header 附近放刪除按鈕（不佔 footer 空間）
 *
 * 使用範例：
 * ```tsx
 * <EntityFormDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="付款方式"
 *   entity={selectedMethod}         // null = 新增、有值 = 編輯
 *   onSubmit={handleSave}
 *   onDelete={handleDelete}         // 可選，只有編輯模式才顯示
 *   isSubmitting={saving}
 *   level={1}
 * >
 *   <Input ... />
 * </EntityFormDialog>
 * ```
 */

import { ReactNode, useState } from 'react'
import { FormDialog } from '@/components/dialog/form-dialog'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { type DialogLevel } from '@/components/ui/dialog'

const LABELS = {
  DELETE: '刪除',
  DELETING: '刪除中...',
  ADD_PREFIX: '新增',
  EDIT_PREFIX: '編輯',
} as const

interface EntityFormDialogProps<T extends { id?: string }> {
  /** 對話框開啟狀態 */
  open: boolean
  /** 對話框狀態變更回調 */
  onOpenChange: (open: boolean) => void
  /**
   * 實體名稱（用於組合標題）
   * 新增模式顯示「新增 {title}」、編輯模式顯示「編輯 {title}」
   * 如需完全自訂標題，傳入 ReactNode 即可直接用
   */
  title: string | ReactNode
  /** 當前編輯的實體（null/undefined = 新增模式，有值 = 編輯模式） */
  entity?: T | null
  /** 提交（新增 / 儲存）處理函數 */
  onSubmit: () => Promise<void>
  /**
   * 刪除處理函數（可選）
   * 僅在編輯模式（entity 有值）時顯示刪除按鈕
   */
  onDelete?: (id: string) => Promise<void>
  /** 提交中狀態（防連點） */
  isSubmitting?: boolean
  /** 表單內容 */
  children: ReactNode
  /** Dialog 層級（z-index 系統，預設：1） */
  level?: DialogLevel
  /** 最大寬度（預設：2xl） */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl'
  /** 是否禁用提交按鈕 */
  submitDisabled?: boolean
  /** 自定義提交按鈕文字 */
  submitLabel?: string
  /** 自定義取消按鈕文字 */
  cancelLabel?: string
  /** 自定義內容樣式類名 */
  contentClassName?: string
  /** 對話框副標題 */
  subtitle?: string
}

export function EntityFormDialog<T extends { id?: string }>({
  open,
  onOpenChange,
  title,
  entity,
  onSubmit,
  onDelete,
  isSubmitting = false,
  children,
  level = 1,
  maxWidth = '2xl',
  submitDisabled,
  submitLabel,
  cancelLabel,
  contentClassName,
  subtitle,
}: EntityFormDialogProps<T>) {
  const isEditMode = !!entity
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!entity?.id || !onDelete) return
    setIsDeleting(true)
    try {
      await onDelete(entity.id)
    } finally {
      setIsDeleting(false)
    }
  }

  // 組合標題：字串時自動加「新增」/「編輯」前綴；ReactNode 直接用
  const dialogTitle =
    typeof title === 'string' ? (
      <div className="flex items-center gap-3">
        <span>{isEditMode ? `${LABELS.EDIT_PREFIX}${title}` : `${LABELS.ADD_PREFIX}${title}`}</span>
        {isEditMode && onDelete && (
          <Button
            type="button"
            variant="soft-gold"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting || isSubmitting}
            className="h-7 text-xs gap-1.5 text-status-danger border-status-danger/50 hover:bg-status-danger/10"
          >
            {isDeleting ? <Spinner size="sm" /> : <Trash2 size={14} />}
            {isDeleting ? LABELS.DELETING : LABELS.DELETE}
          </Button>
        )}
      </div>
    ) : (
      title
    )

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={dialogTitle}
      subtitle={subtitle}
      onSubmit={onSubmit}
      loading={isSubmitting}
      submitDisabled={submitDisabled}
      submitLabel={submitLabel}
      cancelLabel={cancelLabel}
      maxWidth={maxWidth}
      contentClassName={contentClassName}
      level={level}
    >
      {children}
    </FormDialog>
  )
}
