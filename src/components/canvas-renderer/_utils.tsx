/**
 * Canvas組件共用 utils
 *
 * 為什麼集中：
 * - accent 標記解析 Cover / Sidenav / Feature Hero 都會用到
 * - 集中在這、子組件 import 同一個 function、不會有「Cover 解析但 Sidenav 沒解析」這種 bug（5/17 William 抓到）
 */

import * as React from 'react'
import { YONGCHENG_COLORS } from './tokens'

/**
 * 把 title 中 [accent]xxx[/accent] 標記轉成紅銅 span。
 *
 * 譬喻：HTML 原文用 `<span style="color:var(--copper)">`、現在改用標記、
 * 編輯器友好（business 不寫 HTML、只塞 [accent]...[/accent] 即可）
 *
 * 沒有標記就整段同色純文字、不會炸。
 */
export function renderAccentTitle(text: string): React.ReactNode {
  if (!text.includes('[accent]')) {
    return text
  }
  const parts: Array<React.ReactNode> = []
  let cursor = 0
  let key = 0
  while (cursor < text.length) {
    const open = text.indexOf('[accent]', cursor)
    if (open === -1) {
      parts.push(text.slice(cursor))
      break
    }
    parts.push(text.slice(cursor, open))
    const close = text.indexOf('[/accent]', open)
    if (close === -1) {
      // 標記沒收尾、剩下當純文字、不要把標記原文吐出來
      parts.push(text.slice(open + '[accent]'.length))
      break
    }
    const inner = text.slice(open + '[accent]'.length, close)
    parts.push(
      <span key={`acc-${key++}`} style={{ color: YONGCHENG_COLORS.copper }}>
        {inner}
      </span>
    )
    cursor = close + '[/accent]'.length
  }
  // 如果 cursor 還沒走到結尾、補上剩餘字串（防 while 條件提早結束）
  if (cursor < text.length) {
    parts.push(text.slice(cursor))
  }
  return <>{parts}</>
}

/**
 * 純文字版（去除 accent 標記、不解析、只回傳乾淨字串）
 *
 * 用途：頁面 <title> meta / aria-label / 純文字 alt
 */
export function stripAccentMarks(text: string): string {
  return text.replace(/\[accent\]/g, '').replace(/\[\/accent\]/g, '')
}
