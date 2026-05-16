/**
 * <EmptyValue /> — 空值顯示 SSOT
 *
 * 全站空值統一顯示為莫蘭迪灰的 em-dash (—)、不再各頁手刻 `|| '-'`。
 *
 * 用法：
 *   <EmptyValue />                  → JSX，預設用法
 *   getEmptyValueText()             → 純字串（給 cell value / aria-label / title）
 *
 * 為什麼分 jsx / text 兩種：
 *   - JSX 上下文：`{name || <EmptyValue />}` 或 `{value ? formatted : <EmptyValue />}`
 *   - 字串上下文：`title={'總額：' + (n || '—')}` 不能塞 JSX、用純字串
 *
 * 注意：這個 SSOT 用 em-dash (—) U+2014、不是 hyphen-minus (-)、視覺更柔和。
 */
import * as React from 'react'
import { cn } from '@/lib/utils'

export const EMPTY_VALUE_CHAR = '—'

interface EmptyValueProps {
  /**
   * 'jsx'（預設）→ render 成 `<span class="text-morandi-muted">—</span>`
   * 'text'        → render 成純字串 '—'（適合放在 string template）
   */
  as?: 'jsx' | 'text'
  className?: string
}

export function EmptyValue({ as = 'jsx', className }: EmptyValueProps) {
  if (as === 'text') {
    return <>{EMPTY_VALUE_CHAR}</>
  }
  return (
    <span className={cn('text-morandi-muted', className)} aria-label="無資料">
      {EMPTY_VALUE_CHAR}
    </span>
  )
}

/** 純字串版本：給 cell value / 字串拼接場景。 */
export function getEmptyValueText(): string {
  return EMPTY_VALUE_CHAR
}
