'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

// ========== 類型定義 ==========

interface ActionButton {
  icon: LucideIcon
  label: string
  onClick: () => void
  variant?: 'default' | 'danger' | 'success' | 'warning'
  disabled?: boolean
}

interface ActionCellProps {
  actions: ActionButton[]
  className?: string
  /** 只顯示圖示、不顯示文字（報價單等空間極度有限的情況用） */
  iconOnly?: boolean
}

// ========== 組件 ==========

/**
 * ActionCell - 操作按鈕單元格
 *
 * 統一的操作按鈕顯示，自動處理點擊事件傳播
 *
 * @example
 * ```tsx
 * <ActionCell
 *   actions={[
 *     { icon: Edit2, label: '編輯', onClick: () => handleEdit(tour) },
 *     { icon: Trash2, label: '刪除', onClick: () => handleDelete(tour), variant: 'danger' },
 *   ]}
 * />
 * ```
 */
export function ActionCell({ actions, className, iconOnly = false }: ActionCellProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {actions.map((action, index) => {
        const IconComponent = action.icon
        const buttonClass = cn(
          'rounded transition-colors flex items-center gap-1 text-xs font-medium',
          iconOnly ? 'p-1' : 'px-2 py-1',
          action.variant === 'danger' && 'text-morandi-red hover:bg-morandi-red/10',
          action.variant === 'warning' && 'text-status-warning hover:bg-status-warning-bg',
          action.variant === 'success' && 'text-morandi-green hover:bg-morandi-green/10',
          (!action.variant || action.variant === 'default') &&
            'text-morandi-gold hover:bg-morandi-gold/10',
          action.disabled && 'opacity-50 cursor-not-allowed'
        )

        return (
          <button
            key={index}
            onClick={e => {
              e.stopPropagation()
              if (!action.disabled) {
                action.onClick()
              }
            }}
            className={buttonClass}
            title={action.label}
            disabled={action.disabled}
          >
            <IconComponent size="0.875em" />
            {!iconOnly && <span>{action.label}</span>}
          </button>
        )
      })}
    </div>
  )
}
