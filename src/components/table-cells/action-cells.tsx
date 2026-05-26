'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

// ========== 操作欄按鈕樣式 SSOT（全站列表操作欄共用、黃金標準＝訂單管理）==========

/**
 * 操作欄按鈕「外型骨架」共用常數。
 * 黃金標準來源：訂單管理 simple-order-table.tsx 的操作欄。
 *
 * 用途：ActionCell 內部用、訂單頁這種「ActionCell 不支援的特殊互動」也直接引用、
 * 確保兩邊視覺 100% 一致（高度 / padding / 字級 / 圖示間距）。
 *
 * 顏色（語意色）另外接：預設灰 → 走 ACTION_BUTTON_DEFAULT_TONE；
 * 訂單頁的特殊語意色（收款綠 / 請款紅 / 開票金 / 展開 active）則自行接、不在此常數內。
 */
export const ACTION_BUTTON_BASE =
  'inline-flex items-center justify-center rounded transition-colors text-xs font-medium h-7 px-1.5 gap-0.5'

/** 操作欄按鈕「預設語意色」：莫蘭迪次要灰 → hover 主色 + 金色淺底（訂單黃金標準的編輯 / 展開按鈕同款）。 */
export const ACTION_BUTTON_DEFAULT_TONE =
  'text-morandi-secondary hover:text-morandi-primary hover:bg-morandi-gold-light'

// ========== 類型定義 ==========

interface ActionButton {
  /**
   * 按鈕圖示。
   * 2026-05 改為 optional：少數頁面只放文字、不放圖示（不傳就只渲染 label）。
   * 現有 caller 都有傳、行為不變。
   */
  icon?: LucideIcon
  label: string
  onClick: () => void
  /**
   * 語意色。
   * 2026-05 新增 'custom'：搭配 customColor / className 用、給 ActionCell 標準語意色接不住的特殊色。
   */
  variant?: 'default' | 'danger' | 'success' | 'warning' | 'custom'
  disabled?: boolean
  /**
   * 2026-05 新增（optional）：按鈕層級 className 注入。
   * 給自訂色 / 自訂寬度等情況用、會 append 在標準 class 之後（可覆寫）。
   */
  className?: string
  /**
   * 2026-05 新增（optional）：條件隱藏此按鈕。
   * default false。true 時整顆按鈕不渲染（等同 caller 自己用三元 filter）。
   */
  hidden?: boolean
  /**
   * 2026-05 新增（optional）：搭配 variant='custom' 的自訂顏色 class。
   * 例：'text-status-info hover:bg-status-info-bg'。會接在骨架後、className 前。
   */
  customColor?: string
}

interface ActionCellProps {
  actions: ActionButton[]
  className?: string
  /** 只顯示圖示、不顯示文字（報價單等空間極度有限的情況用） */
  iconOnly?: boolean
  /**
   * 2026-05 新增（optional）：逃生艙。
   * 給極特殊頁面完全自訂單顆按鈕的渲染（後續等級 4 收編會用）。
   * 回傳 null / undefined 時退回 ActionCell 標準渲染。
   */
  renderCustomButton?: (action: ActionButton, index: number) => React.ReactNode
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
export function ActionCell({
  actions,
  className,
  iconOnly = false,
  renderCustomButton,
}: ActionCellProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {actions.map((action, index) => {
        // 條件隱藏：hidden=true 整顆不渲染
        if (action.hidden) {
          return null
        }

        // 逃生艙：caller 提供 renderCustomButton 且回傳非空 → 用它的渲染
        if (renderCustomButton) {
          const custom = renderCustomButton(action, index)
          if (custom !== null && custom !== undefined) {
            return <React.Fragment key={index}>{custom}</React.Fragment>
          }
        }

        const IconComponent = action.icon
        const buttonClass = cn(
          // 外型骨架走共用常數（黃金標準＝訂單管理操作欄）
          ACTION_BUTTON_BASE,
          // 危險動作走 design token 紅色（刪除等警示、符合 UI 紅線）
          action.variant === 'danger' && 'text-status-danger hover:bg-status-danger-bg',
          action.variant === 'warning' && 'text-status-warning hover:bg-status-warning-bg',
          action.variant === 'success' && 'text-status-success hover:bg-status-success-bg',
          // custom：標準語意色接不住、走 caller 給的 customColor
          action.variant === 'custom' && action.customColor,
          // 預設色對齊訂單：莫蘭迪次要灰 → hover 主色 + 金色淺底
          (!action.variant || action.variant === 'default') && ACTION_BUTTON_DEFAULT_TONE,
          action.disabled && 'opacity-50 cursor-not-allowed',
          // 按鈕層級 className 注入（最後 append、可覆寫前面）
          action.className
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
            {IconComponent && <IconComponent size="0.95em" />}
            {!iconOnly && <span>{action.label}</span>}
          </button>
        )
      })}
    </div>
  )
}
