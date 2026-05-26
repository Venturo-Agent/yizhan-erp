'use client'

import * as React from 'react'
import { User } from 'lucide-react'
import { cn } from '@/lib/utils'

export type AvatarSize = 'sm' | 'md' | 'lg'

export interface AvatarProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** 圖片 URL；null/undefined/空字串都會 fallback */
  src?: string | null
  /** 給 screen reader 的描述、也是 fallback 文字（取首字） */
  alt?: string
  /** 沒圖時顯示的字、預設取 alt 首字、再 fallback 到 User icon */
  fallback?: string
  /** sm=24 / md=32 / lg=48 */
  size?: AvatarSize
  /** 點擊時的處理（譬如打開預覽） */
  onClick?: React.MouseEventHandler<HTMLSpanElement>
}

const sizeClass: Record<AvatarSize, { box: string; text: string; icon: string }> = {
  sm: { box: 'h-6 w-6', text: 'text-[0.625rem]', icon: 'h-3 w-3' },
  md: { box: 'h-8 w-8', text: 'text-xs', icon: 'h-4 w-4' },
  lg: { box: 'h-12 w-12', text: 'text-sm', icon: 'h-5 w-5' },
}

function pickInitial(value: string | undefined | null): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  // 取第一個 grapheme（中文/英文都 ok）
  const first = Array.from(trimmed)[0]
  return first ? first.toUpperCase() : null
}

/**
 * Avatar — 全站頭像 primitive。
 *
 * 用法：
 *   <Avatar src={emp.avatar_url} alt={emp.name} size="md" />
 *   <Avatar fallback="王" />
 *   <Avatar size="lg" />  // 全 fallback、顯示 User icon
 *
 * 沒圖時 fallback 順序：fallback prop → alt 首字 → User icon。
 */
export const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(
  ({ src, alt, fallback, size = 'md', className, onClick, ...props }, ref) => {
    const [errored, setErrored] = React.useState(false)
    React.useEffect(() => {
      setErrored(false)
    }, [src])

    const showImage = Boolean(src) && !errored
    const initial = pickInitial(fallback) ?? pickInitial(alt)
    const sizing = sizeClass[size]

    return (
      <span
        ref={ref}
        onClick={onClick}
        className={cn(
          'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-morandi-container/50 text-morandi-primary select-none',
          sizing.box,
          onClick && 'cursor-pointer',
          className
        )}
        {...props}
      >
        {showImage ? (
          <img
            src={src ?? undefined}
            alt={alt ?? ''}
            className="h-full w-full object-cover"
            onError={() => setErrored(true)}
            draggable={false}
          />
        ) : initial ? (
          <span className={cn('font-medium', sizing.text)} aria-label={alt}>
            {initial}
          </span>
        ) : (
          <User
            className={cn('text-morandi-secondary', sizing.icon)}
            aria-label={alt ?? 'avatar'}
          />
        )}
      </span>
    )
  }
)
Avatar.displayName = 'Avatar'

/** 員工頭像 wrapper、預設 size="md"。 */
export interface EmployeeAvatarProps extends Omit<AvatarProps, 'fallback'> {
  name?: string | null
}
export const EmployeeAvatar = React.forwardRef<HTMLSpanElement, EmployeeAvatarProps>(
  ({ name, alt, ...rest }, ref) => (
    <Avatar ref={ref} alt={alt ?? name ?? ''} fallback={name ?? undefined} {...rest} />
  )
)
EmployeeAvatar.displayName = 'EmployeeAvatar'

/** 客戶頭像 wrapper。 */
export interface CustomerAvatarProps extends Omit<AvatarProps, 'fallback'> {
  name?: string | null
}
export const CustomerAvatar = React.forwardRef<HTMLSpanElement, CustomerAvatarProps>(
  ({ name, alt, ...rest }, ref) => (
    <Avatar ref={ref} alt={alt ?? name ?? ''} fallback={name ?? undefined} {...rest} />
  )
)
CustomerAvatar.displayName = 'CustomerAvatar'
