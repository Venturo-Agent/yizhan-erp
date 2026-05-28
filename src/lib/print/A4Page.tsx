'use client'
/**
 * A4Page — 共用「A4 紙張框」+ 多頁列印重複表頭/表尾（抽象層、William 2026-05-28 拍板）
 *
 * 為什麼存在：出納單/報價單/行程預覽各自處理 A4，且列印超頁時第二頁沒表頭。
 * 抽成一套共用標準（以出納單列印樣式為基準、20mm 邊距）：
 * - 螢幕：固定 210mm × 297mm 白底紙張 + 陰影 + 置中 → 所見即所得
 * - 列印：@page A4、內容貼合紙張、去陰影
 * - **列印多頁時 printHeader / printFooter 自動每頁重複**（用 HTML table 的 thead/tfoot 機制、瀏覽器原生支援）
 *
 * 用法：
 *   <A4Page>...</A4Page>                              // 單頁、無重複表頭
 *   <A4Page printHeader={<Header/>}>...</A4Page>      // 多頁列印每頁自動重複 Header
 *   <A4Page printHeader={...} printFooter={...}>...</A4Page>
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
  .a4-page-table {
    width: 100%;
    border-collapse: collapse;
  }
  .a4-page-table > thead > tr > td,
  .a4-page-table > tbody > tr > td,
  .a4-page-table > tfoot > tr > td {
    padding: 0;
    vertical-align: top;
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
    /* 多頁列印時、thead/tfoot 每頁重複（瀏覽器原生支援） */
    .a4-page-thead { display: table-header-group; }
    .a4-page-tfoot { display: table-footer-group; }
  }
`

interface A4PageProps {
  children: ReactNode
  /** 列印多頁時每頁重複的表頭（用 table thead 機制；螢幕也顯示一次在最上方） */
  printHeader?: ReactNode
  /** 列印多頁時每頁重複的表尾 */
  printFooter?: ReactNode
  /** 額外 class（譬如字型、文字顏色，由內容自訂） */
  className?: string
}

export function A4Page({ children, printHeader, printFooter, className = '' }: A4PageProps) {
  const hasHeaderFooter = !!(printHeader || printFooter)
  return (
    <>
      <style>{A4_PAGE_CSS}</style>
      <div className={`a4-page ${className}`}>
        {hasHeaderFooter ? (
          <table className="a4-page-table">
            {printHeader && (
              <thead className="a4-page-thead">
                <tr>
                  <td>{printHeader}</td>
                </tr>
              </thead>
            )}
            <tbody>
              <tr>
                <td>{children}</td>
              </tr>
            </tbody>
            {printFooter && (
              <tfoot className="a4-page-tfoot">
                <tr>
                  <td>{printFooter}</td>
                </tr>
              </tfoot>
            )}
          </table>
        ) : (
          children
        )}
      </div>
    </>
  )
}
