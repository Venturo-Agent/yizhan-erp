/**
 * 永成款整頁 Layout — Sidenav + Main 兩欄
 *
 * 視覺基準：/Users/william/Downloads/tokyo-sendai-private-2026.html (line 68-149)
 *
 * 為什麼一個 wrapper：
 * - 集中載入 Google Fonts（不在每個 section 重覆）
 * - 套用 CSS 變數 root（子組件用 var(--ink) 取）
 * - 兩欄 grid 對齊規格書 § 4.1（左 260px 固定 / 右 1fr）
 */

import * as React from 'react'

import { YONGCHENG_COLORS, YONGCHENG_CSS_VARS, YONGCHENG_FONTS, YONGCHENG_FONTS_URL } from './tokens'
import type { YongchengCanvas } from './types'
import { YongchengSidenav } from './sections/YongchengSidenav'

interface YongchengLayoutProps {
  canvas: YongchengCanvas
  children?: React.ReactNode
}

/**
 * 永成款共用 CSS 規則（無法用 inline style 表達的 :hover / :focus / 平滑滾動）
 *
 * 為什麼用 <style dangerouslySetInnerHTML>：
 * - inline style 沒法寫 :hover / :focus、Sidenav nav item / smooth scroll 都需要
 * - 改成 styled-components / CSS Modules 違反「維持 inline style」原則
 * - 用 .yc-* 前綴避免跟 ERP 既有樣式撞名
 */
const YONGCHENG_GLOBAL_CSS = `
/* Sidenav nav item hover / active — 對齊仙台 HTML line 122-132 */
.yc-nav-item:hover {
  border-left-color: var(--copper) !important;
}
.yc-nav-item.active {
  border-left-color: var(--copper) !important;
  font-weight: 600;
  background: var(--paper);
}
/* 點 sidenav 滑動到 section、不硬跳 — 仙台 HTML line 44-45 */
html {
  scroll-behavior: smooth;
  scroll-padding-top: 100px;
}
`

export function YongchengLayout({ canvas, children }: YongchengLayoutProps) {
  return (
    <>
      {/* Google Fonts — 三套：Noto Serif TC / Noto Sans TC / Cormorant Garamond */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="stylesheet" href={YONGCHENG_FONTS_URL} />
      <style dangerouslySetInnerHTML={{ __html: YONGCHENG_GLOBAL_CSS }} />

      <div
        style={{
          ...YONGCHENG_CSS_VARS,
          background: YONGCHENG_COLORS.white,
          color: YONGCHENG_COLORS.ink,
          fontFamily: YONGCHENG_FONTS.serif,
          lineHeight: 1.7,
          WebkitFontSmoothing: 'antialiased',
          minHeight: '100vh',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '260px 1fr',
            maxWidth: 1480,
            margin: '0 auto',
          }}
        >
          <YongchengSidenav canvas={canvas} />
          <div style={{ padding: '0 64px', minWidth: 0 }}>{children}</div>
        </div>
      </div>
    </>
  )
}
