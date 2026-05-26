'use client'

import * as React from 'react'
import { AlertTriangle, CheckSquare, Info, X, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type AlertVariant = 'default' | 'success' | 'warning' | 'danger' | 'info'

export interface AlertProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  variant?: AlertVariant
  title?: React.ReactNode
  description?: React.ReactNode
  /** 自訂 icon、不傳就走 variant 預設、null 顯式關掉 */
  icon?: React.ReactNode | null
  /** 有的話右上角顯示 X、按了呼叫此 callback */
  onClose?: () => void
}

const A11Y_LABELS = {
  CLOSE: '關閉訊息',
} as const

const variantClass: Record<AlertVariant, string> = {
  default: 'bg-surface-alt text-text border-border',
  success: 'bg-status-success-bg text-status-success border-status-success/30',
  warning: 'bg-status-warning-bg text-status-warning border-status-warning/30',
  danger: 'bg-status-danger-bg text-status-danger border-status-danger/30',
  info: 'bg-status-info-bg text-status-info border-status-info/30',
}

const variantIcon: Record<AlertVariant, React.ComponentType<{ className?: string }> | null> = {
  default: null,
  success: CheckSquare,
  warning: AlertTriangle,
  danger: XCircle,
  info: Info,
}

/**
 * Alert — 全站訊息框 SSOT、跟 NOTIFICATION_FINAL_DESIGN.md 方向 A 對齊。
 *
 * 用法：
 *   <Alert variant="warning" title="團費未確認" description="請完成定價..." />
 *   <Alert variant="danger" description={<>錯誤：<b>{msg}</b></>} onClose={...} />
 *   <Alert variant="info" icon={null}>純文字</Alert>
 *
 * 視覺：淡底 + 對應語意色 icon、不要太強烈、跟莫蘭迪極簡風一致。
 */
export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  (
    { variant = 'default', title, description, icon, onClose, className, children, ...props },
    ref
  ) => {
    const DefaultIcon = variantIcon[variant]
    const showIcon = icon !== null && (icon !== undefined || DefaultIcon !== null)
    const renderedIcon =
      icon !== null && icon !== undefined ? (
        icon
      ) : DefaultIcon ? (
        <DefaultIcon className="h-4 w-4 shrink-0" />
      ) : null

    return (
      <div
        ref={ref}
        role={variant === 'danger' || variant === 'warning' ? 'alert' : 'status'}
        className={cn(
          'flex items-start gap-3 rounded-md border px-4 py-3 text-sm',
          variantClass[variant],
          className
        )}
        {...props}
      >
        {showIcon && <span className="mt-0.5">{renderedIcon}</span>}
        <div className="flex-1 min-w-0 space-y-1">
          {title && <div className="font-medium leading-tight">{title}</div>}
          {description && <div className="text-sm leading-relaxed opacity-90">{description}</div>}
          {children}
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={A11Y_LABELS.CLOSE}
            className="shrink-0 rounded p-0.5 opacity-60 hover:opacity-100 hover:bg-black/5 transition"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    )
  }
)
Alert.displayName = 'Alert'
