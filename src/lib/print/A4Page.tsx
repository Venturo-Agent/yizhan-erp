'use client'
/**
 * A4Page — 共用「A4 紙張框」（抽象層、William 2026-05-28 拍板）
 *
 * 為什麼存在：出納單/報價單/行程預覽各自處理 A4，報價單還漏了螢幕沒呈現 A4 的 bug。
 * 抽成一套共用標準（以出納單列印樣式為基準、20mm 邊距）：
 * - 螢幕：固定 210mm × 297mm 白底紙張 + 陰影 + 置中 → 所見即所得（看到的就是 A4 紙）
 * - 列印：@page A4、內容貼合紙張、去陰影/邊距由 @page 控制
 *
 * 用法：把要印的內容包進 <A4Page>...</A4Page>。多頁內容自動分頁（瀏覽器列印）。
 */
import React, { ReactNode } from 'react'

const A4_PAGE_CSS = `
  .a4-page {
    width: 210mm;
    min-height: 297mm;
    padding: 20mm 18mm;
    margin: 0 auto;
    background: #ffffff;
    box-shadow: 0 1px 10px rgba(0, 0, 0, 0.12);
    box-sizing: border-box;
  }
  @media print {
    .a4-page {
      width: auto;
      min-height: 0;
      padding: 0;
      margin: 0;
      box-shadow: none;
    }
    @page {
      size: A4;
      margin: 20mm 18mm;
    }
  }
`

interface A4PageProps {
  children: ReactNode
  /** 額外 class（譬如字型、文字顏色，由內容自訂） */
  className?: string
}

export function A4Page({ children, className = '' }: A4PageProps) {
  return (
    <>
      <style>{A4_PAGE_CSS}</style>
      <div className={`a4-page ${className}`}>{children}</div>
    </>
  )
}
