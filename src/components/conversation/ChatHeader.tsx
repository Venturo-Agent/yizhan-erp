/**
 * 共用對話 Header — /ai AI Hub 跟 /channels 內部頻道一起用
 *
 * 2026-05-23 William 拍板：兩邊 header 高度跟 sidebar 對齊不一致、抽共用
 *
 * 規範：
 *   - 高度統一 `h-[calc(3.75rem-1px)]`、跟 layout sidebar header / 主要頁面 header 對齊
 *   - 左側：頭像（可選）+ 名字（可選編輯）+ badge
 *   - 右側：actions slot（caller 自由塞）
 *   - 走 venturo CIS（border-b border-border / bg-card）
 */

'use client'

import { cn } from '@/lib/utils'

export interface ChatHeaderProps {
  /** 左側 leading slot（頭像 / icon、譬如 channel icon 或 customer avatar）*/
  leading?: React.ReactNode

  /** 標題（必填、譬如 channel 名 / 客戶名）*/
  title: React.ReactNode

  /** 副標題（譬如 channel description）*/
  subtitle?: React.ReactNode

  /** 跟標題同列的 badge slot（譬如 channel 類型徽章）*/
  titleBadge?: React.ReactNode

  /** 右側操作 slot（譬如業務面板開關 / 復盤按鈕 / 成員按鈕）*/
  actions?: React.ReactNode

  /** padding 變體：normal（默認、px-4）/ wide（px-6、Channels 用）*/
  padding?: 'normal' | 'wide'

  /** 額外 className */
  className?: string
}

export function ChatHeader({
  leading,
  title,
  subtitle,
  titleBadge,
  actions,
  padding = 'normal',
  className,
}: ChatHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 h-[calc(3.75rem-1px)] border-b border-morandi-muted/20 bg-card shrink-0',
        padding === 'wide' ? 'px-6' : 'px-4',
        className
      )}
    >
      {leading && <div className="shrink-0 flex items-center">{leading}</div>}

      <div className="flex-1 min-w-0 flex items-center gap-2">
        <div className="min-w-0 flex flex-col">
          <div className="flex items-center gap-1 min-w-0">
            <span className="font-semibold text-sm text-morandi-primary truncate">{title}</span>
            {titleBadge}
          </div>
          {subtitle && <span className="text-xs text-morandi-muted truncate">{subtitle}</span>}
        </div>
      </div>

      {actions && <div className="shrink-0 flex items-center gap-1">{actions}</div>}
    </div>
  )
}
