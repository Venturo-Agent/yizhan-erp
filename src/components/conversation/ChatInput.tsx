/**
 * 共用訊息輸入框 — /ai AI Hub 跟 /channels 內部頻道一起用
 *
 * 2026-05-23 William 拍板：兩邊輸入框視覺 / 互動該一致
 *
 * 互動規範（統一）：
 *   - Enter 送出（單行）/ Shift+Enter 換行
 *   - sending 時 disabled、按鈕轉圈
 *   - 空字串 trim 後不送出
 *   - 送出後 auto-clear（caller 控制）
 *
 * 樣式統一：
 *   - border-t border-border、px-4 py-3、bg-card
 *   - textarea 走 design token（不用 Tailwind 預設色）
 */

'use client'

import { useState, type KeyboardEvent } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface ChatInputProps {
  /** 送出 callback、回 Promise/void、caller 自己處理 clear */
  onSend: (text: string) => Promise<void> | void

  /** placeholder 文案 */
  placeholder?: string

  /** disabled（譬如 sending、bot_paused 等狀態）*/
  disabled?: boolean

  /** sending 中（按鈕轉圈）*/
  sending?: boolean

  /** 額外 className 包外層 */
  className?: string

  /** 受控 value（caller 想自己管 input state 時用、不傳則 internal state）*/
  value?: string

  /** 受控 onChange */
  onChange?: (value: string) => void

  /** 最大 row（textarea auto-grow 上限）、預設 4 */
  maxRows?: number
}

export function ChatInput({
  onSend,
  placeholder = '輸入訊息…',
  disabled = false,
  sending = false,
  className,
  value: controlledValue,
  onChange: controlledOnChange,
  maxRows: _maxRows = 4,
}: ChatInputProps) {
  const [internalValue, setInternalValue] = useState('')
  const isControlled = controlledValue !== undefined
  const value = isControlled ? controlledValue : internalValue
  const setValue = (v: string) => {
    if (isControlled) controlledOnChange?.(v)
    else setInternalValue(v)
  }

  const canSend = !disabled && !sending && value.trim().length > 0

  const handleSend = async () => {
    if (!canSend) return
    const text = value.trim()
    try {
      await onSend(text)
      setValue('')
    } catch {
      // caller 應自己 toast、這裡不擋 input
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  return (
    <div
      className={cn(
        'border-t border-border px-4 py-3 bg-card flex items-end gap-2',
        className
      )}
    >
      <textarea
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || sending}
        rows={1}
        className="flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-morandi-gold disabled:opacity-50"
      />
      <Button
        type="button"
        size="sm"
        onClick={handleSend}
        disabled={!canSend}
        className="shrink-0"
      >
        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
      </Button>
    </div>
  )
}
