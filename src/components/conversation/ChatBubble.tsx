/**
 * 共用訊息泡泡 — 給 /ai AI Hub 跟 /channels 內部頻道一起用
 *
 * 2026-05-23 William 拍板：兩邊底層 schema 分開但 UI 該共用、避免散刻不一致
 *
 * 規範：
 *   - direction = 'inbound' 在左、'outbound' 在右、'system' 居中
 *   - 都走 venturo CIS（morandi-* / status-* design token）
 *   - 圓角統一 rounded-2xl + 對應角 rounded-{tl,tr}-sm（單尖角朝頭像方向）
 *   - 不認業務、不做圖片 lightbox / 撤回 / reaction（caller 自己包外層）
 *
 * Variant：'compact' / 'comfortable'（不同密度、AI Hub 偏緊湊、Channels 偏舒適）
 */

'use client'

import { cn } from '@/lib/utils'

export type ChatBubbleDirection = 'inbound' | 'outbound' | 'system'

export interface ChatBubbleProps {
  /** 訊息方向 */
  direction: ChatBubbleDirection

  /** 發送者顯示名（inbound 才會顯示在泡泡上方）*/
  senderName?: string | null

  /** 發送者頭像 URL（inbound 才會顯示）*/
  senderAvatarUrl?: string | null

  /** 訊息內容（純文字、image 用 imageContent slot）*/
  body?: string | null

  /** 時間戳（格式化好的字串、譬如 "下午 3:17"）*/
  timestamp?: string | null

  /** 已撤回（顯示「本訊息已撤回」灰色）*/
  isRevoked?: boolean

  /** 樂觀更新中（半透明）*/
  isOptimistic?: boolean

  /** 來源 sender 類型（決定 outbound 顏色：'ai_agent' 用金、'agent'/'self' 用主色） */
  senderType?: 'self' | 'agent' | 'ai_agent' | 'contact' | 'system' | null

  /** 圖片內容 slot（caller 自己塞 <img>、含 lightbox 等業務邏輯）*/
  imageContent?: React.ReactNode

  /** 附加 slot（footer 名字 + 時間下方、譬如 reactions）*/
  footerSlot?: React.ReactNode

  /** 密度：compact（AI Hub 默認）/ comfortable（Channels 默認）*/
  variant?: 'compact' | 'comfortable'

  /** 額外 className（覆蓋外層）*/
  className?: string
}

export function ChatBubble({
  direction,
  senderName,
  senderAvatarUrl,
  body,
  timestamp,
  isRevoked = false,
  isOptimistic = false,
  senderType,
  imageContent,
  footerSlot,
  variant = 'compact',
  className,
}: ChatBubbleProps) {
  // system 訊息：居中、italic、小字
  if (direction === 'system') {
    return (
      <div className={cn('flex justify-center my-2', className)}>
        <span className="text-xs italic text-morandi-muted px-3 py-1 bg-morandi-container/30 rounded-full">
          {body}
        </span>
      </div>
    )
  }

  const isInbound = direction === 'inbound'
  const avatarInitial = (senderName ?? '?').slice(0, 1)
  const showAvatar = isInbound && (senderAvatarUrl || senderName)

  // 泡泡背景色：inbound 客戶 → container；outbound → 看 senderType
  // - ai_agent → 金色（AI 標識）
  // - 其他 outbound（self / agent） → 主色深色
  const bubbleBg = isInbound
    ? 'bg-morandi-container/60 rounded-tl-sm'
    : senderType === 'ai_agent'
      ? 'bg-morandi-gold/20 text-morandi-primary rounded-tr-sm'
      : 'bg-morandi-primary text-white rounded-tr-sm'

  const padding = variant === 'compact' ? 'px-3 py-2' : 'px-3.5 py-2.5'

  return (
    <div
      className={cn(
        'flex gap-2',
        isInbound ? 'justify-start' : 'justify-end',
        isOptimistic && 'opacity-60',
        className
      )}
    >
      {showAvatar && (
        <div className="shrink-0 w-8 h-8 rounded-full bg-morandi-gold/20 overflow-hidden flex items-center justify-center text-xs font-medium text-morandi-gold">
          {senderAvatarUrl ? (
            <img
              src={senderAvatarUrl}
              alt={senderName ?? ''}
              className="w-full h-full object-cover"
            />
          ) : (
            <span>{avatarInitial}</span>
          )}
        </div>
      )}
      <div className="max-w-[75%]">
        {/* inbound 上方顯示 sender 名 */}
        {senderName && isInbound && (
          <p className="text-[0.65rem] text-morandi-secondary font-medium mb-0.5 px-1">
            {senderName}
          </p>
        )}

        {/* 訊息本體 */}
        {isRevoked ? (
          <div className={cn('overflow-hidden w-fit', isInbound ? '' : 'ml-auto', padding, 'rounded-2xl bg-morandi-container/30 italic text-morandi-muted text-sm')}>
            本訊息已撤回
          </div>
        ) : imageContent ? (
          <div className={cn('overflow-hidden w-fit rounded-2xl', isInbound ? '' : 'ml-auto')}>
            {imageContent}
          </div>
        ) : (
          <div
            className={cn(
              'overflow-hidden w-fit rounded-2xl',
              isInbound ? '' : 'ml-auto',
              padding,
              bubbleBg
            )}
          >
            <p className="text-sm whitespace-pre-wrap break-words">{body || '(無內容)'}</p>
          </div>
        )}

        {/* footer 名字 + 時間 */}
        {(timestamp || senderName) && (
          <p
            className={cn(
              'text-[0.588rem] text-morandi-muted mt-0.5',
              isInbound ? 'text-left' : 'text-right'
            )}
          >
            {!isInbound && senderName ? `${senderName} ・ ` : ''}
            {timestamp ?? ''}
          </p>
        )}

        {footerSlot}
      </div>
    </div>
  )
}
