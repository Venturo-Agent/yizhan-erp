'use client'

import React from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

// ========== 類型定義 ==========

interface AvatarCellProps {
  name: string
  imageUrl?: string | null
  subtitle?: string
  className?: string
}

interface LinkCellProps {
  href: string
  text: string
  external?: boolean
  className?: string
}

// ========== 組件 ==========

/**
 * TextCell - 文字單元格
 *
 * 簡單的文字顯示，支援截斷和 tooltip
 *
 * @example
 * ```tsx
 * <TextCell text={tour.description} maxLength={50} />
 * ```
 */
export function TextCell({
  text,
  maxLength,
  className,
}: {
  text: string
  maxLength?: number
  className?: string
}) {
  const displayText =
    maxLength && text.length > maxLength ? `${text.substring(0, maxLength)}...` : text

  return (
    <span
      className={cn('text-sm text-morandi-primary', className)}
      title={maxLength && text.length > maxLength ? text : undefined}
    >
      {displayText}
    </span>
  )
}

/**
 * NumberCell - 數字單元格
 *
 * 統一的數字顯示，支援格式化
 *
 * @example
 * ```tsx
 * <NumberCell value={tour.max_participants} suffix="人" />
 * ```
 */
export function NumberCell({
  value,
  prefix,
  suffix,
  className,
}: {
  value: number
  prefix?: string
  suffix?: string
  className?: string
}) {
  return (
    <span className={cn('text-sm font-medium text-morandi-primary', className)}>
      {prefix}
      {value.toLocaleString()}
      {suffix}
    </span>
  )
}

/**
 * AvatarCell - 頭像+名稱單元格
 *
 * 顯示用戶頭像和名稱，支援副標題
 *
 * @example
 * ```tsx
 * <AvatarCell name="張三" subtitle="業務部" />
 * <AvatarCell name="李四" imageUrl="/avatars/li.jpg" />
 * ```
 */
export function AvatarCell({ name, imageUrl, subtitle, className }: AvatarCellProps) {
  // 取名字第一個字作為頭像文字
  const initial = name?.charAt(0) || '?'

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-morandi-gold/20 flex items-center justify-center">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name || ''}
            width={32}
            height={32}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <span className="text-sm font-medium text-morandi-gold">{initial}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-morandi-primary truncate">{name}</div>
        {subtitle && <div className="text-xs text-morandi-secondary truncate">{subtitle}</div>}
      </div>
    </div>
  )
}

/**
 * LinkCell - 連結單元格
 *
 * 可點擊的連結，支援內部和外部連結
 *
 * @example
 * ```tsx
 * <LinkCell href="/tours/123" text="查看詳情" />
 * <LinkCell href="https://example.com" text="外部連結" external />
 * ```
 */
export function LinkCell({ href, text, external = false, className }: LinkCellProps) {
  const linkClass = cn(
    'text-sm text-morandi-gold hover:text-morandi-gold-dark hover:underline transition-colors',
    className
  )

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
        {text} ↗
      </a>
    )
  }

  return (
    <a href={href} className={linkClass}>
      {text}
    </a>
  )
}
