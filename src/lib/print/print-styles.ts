/**
 * Shared print styles for printable components
 */

const _PRINT_STYLES = `
  @media print {
    *, *::before, *::after {
      box-sizing: border-box !important;
    }

    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: white !important;
      width: 100% !important;
      overflow: hidden !important;
    }

    /* A4 頁面設定 - 增加右側 margin 防止出血 */
    @page {
      size: A4;
      margin: 10mm 12mm 10mm 10mm; /* 上 右 下 左 - 右側多留 2mm */
    }

    /* 防止表格行被切斷 */
    table tr {
      page-break-inside: avoid;
    }

    /* 使用 table 的 thead/tfoot 來實作固定頁首頁尾 */
    /* 強制覆蓋 hidden class，確保列印時表格顯示 */
    table.print-wrapper,
    table.print-wrapper.hidden {
      display: table !important;
      visibility: visible !important;
      width: 100% !important;
      max-width: 100% !important;
      border-collapse: collapse;
      table-layout: fixed !important;
    }

    table.print-wrapper thead {
      display: table-header-group;
    }

    table.print-wrapper tfoot {
      display: table-footer-group;
    }

    table.print-wrapper tbody {
      display: table-row-group;
    }

    /* 防止表格內容被切斷 */
    .avoid-break {
      page-break-inside: avoid;
    }

    body {
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    /* 確保表格不超出列印區域 */
    table {
      max-width: 100% !important;
      width: 100% !important;
      table-layout: fixed !important;
    }

    td, th {
      word-break: break-word;
      overflow-wrap: break-word;
      overflow: hidden !important;
    }

    /* 防止任何元素超出頁面 - 快速報價單 & 團體報價單 */
    #printable-quote,
    #printable-quotation {
      width: 100% !important;
      max-width: 100% !important;
      overflow: hidden !important;
      padding: 0 !important;
    }

    /* 確保內容區塊不超出 */
    #printable-quote > table.print-wrapper > tbody > tr > td,
    #printable-quotation > table.print-wrapper > tbody > tr > td {
      width: 100% !important;
      max-width: 100% !important;
      overflow: hidden !important;
    }

    /* 內層表格確保不超出 */
    #printable-quote table:not(.print-wrapper),
    #printable-quotation table:not(.print-wrapper) {
      width: 100% !important;
      max-width: 100% !important;
      table-layout: fixed !important;
    }

    /* 確保 print:hidden 的元素在列印時隱藏 */
    .print\\:hidden {
      display: none !important;
    }

    /* 確保所有列印內容可見 */
    #printable-quote *,
    #printable-quotation * {
      visibility: visible !important;
      color-adjust: exact !important;
      -webkit-print-color-adjust: exact !important;
    }
  }
`

export const MORANDI_COLORS = {
  gold: '#B8A99A',
  brown: '#3a3633',
  lightBrown: '#FAF7F2',
  gray: '#4B5563',
  lightGray: '#9CA3AF',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
}

export const TABLE_STYLES = {
  borderCollapse: 'separate' as const,
  borderSpacing: 0,
  borderRadius: '8px',
  overflow: 'hidden',
  border: `1px solid ${MORANDI_COLORS.border}`,
}
