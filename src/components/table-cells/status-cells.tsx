'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import {
  getStatusColor,
  getStatusLabel,
  getStatusBgColor,
  getStatusIcon,
} from '@/lib/status-config'

// ========== 類型定義 ==========

type StatusType =
  | 'payment'
  | 'disbursement'
  | 'todo'
  | 'invoice'
  | 'tour'
  | 'order'
  | 'voucher'
  | 'esim'
  | 'receipt'
  | 'quote'
  | 'tour_request'

interface StatusCellProps {
  type: StatusType
  status: string
  variant?: 'badge' | 'text'
  showIcon?: boolean
  className?: string
}

interface BadgeCellProps {
  text: string
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  className?: string
}

// ========== 組件 ==========

/**
 * StatusCell - 狀態徽章單元格
 *
 * 統一的狀態顯示組件，使用 status-config 配置
 *
 * @example
 * ```tsx
 * <StatusCell type="tour" status={tour.status} />
 * <StatusCell type="payment" status={payment.status} variant="text" />
 * ```
 */
export function StatusCell({
  type,
  status,
  variant = 'badge',
  showIcon = false,
  className,
}: StatusCellProps) {
  const color = getStatusColor(type, status)
  const label = getStatusLabel(type, status)
  const IconComponent = getStatusIcon(type, status)

  if (variant === 'badge') {
    const bgColor = getStatusBgColor(type, status)
    // 統一樣式跟 StatusBadge 一致（soft pill，無 border、無 shadow、font-medium）
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
          bgColor,
          color,
          className
        )}
      >
        {showIcon && IconComponent && <IconComponent className="w-3 h-3 mr-1" />}
        {label}
      </span>
    )
  }

  // variant === 'text'
  return (
    <span className={cn('text-sm font-medium', color, className)}>
      {showIcon && IconComponent && <IconComponent className="w-3 h-3 mr-1 inline" />}
      {label}
    </span>
  )
}

/**
 * BadgeCell - 徽章單元格
 *
 * 簡單的徽章顯示，與 StatusCell 不同，不依賴 status-config
 *
 * @example
 * ```tsx
 * <BadgeCell text="熱門" variant="warning" />
 * <BadgeCell text="新品" variant="success" />
 * ```
 */
export function BadgeCell({ text, variant = 'default', className }: BadgeCellProps) {
  const variantClass = cn(
    'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
    variant === 'default' && 'bg-morandi-container text-morandi-primary',
    variant === 'success' && 'bg-status-success/10 text-status-success',
    variant === 'warning' && 'bg-morandi-gold/10 text-morandi-gold',
    variant === 'danger' && 'bg-status-danger/10 text-status-danger',
    variant === 'info' && 'bg-status-info-bg text-status-info',
    className
  )

  return <span className={variantClass}>{text}</span>
}
