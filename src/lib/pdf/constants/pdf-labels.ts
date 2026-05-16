/**
 * PDF 生成用標籤常量
 * 所有 PDF 中的中文文字集中管理
 */

// ============================================================
// 出納單 PDF 標籤
// ============================================================
export const DISBURSEMENT_PDF_LABELS = {
  TITLE: '出納單',
  DISBURSEMENT_DATE: '出帳日期：',
  PREPARED_BY: '製表人：',
  COL_PAYEE: '付款對象',
  COL_REQUEST_NO: '請款編號',
  COL_DESCRIPTION: '項目說明',
  COL_AMOUNT: '金額',
  COL_SUBTOTAL: '小計',
  TOTAL: '總計 TOTAL',
  UNSPECIFIED_SUPPLIER: '未指定供應商',
  COMPANY_SLOGAN: '─ 如果可以，讓我們一起探索世界的每個角落 ─',
  PAGE_NUMBER: (current: number, total: number) => `第 ${current} 頁 / 共 ${total} 頁`,
}

// ============================================================
// 結帳明細 PDF 標籤
// ============================================================
export const CLOSING_REPORT_PDF_LABELS = {
  // 標題
  REPORT_TITLE: '結帳明細報表',
  TOUR_CLOSING_REPORT: 'Tour Closing Report',

  // 團資訊
  TOUR_CODE: '團號',
  TOUR_NAME: '團名',
  DEPARTURE_DATE: '出發日期',
  RETURN_DATE: '回程日期',
  MEMBER_COUNT: '團員人數',
  PREPARED_BY: '製表人',
  PRINT_DATE: '列印日期',

  // 頁面 1: 收支明細
  SECTION_INCOME: '收入明細',
  SECTION_EXPENSE: '支出明細',
  COL_RECEIPT_NO: '收款單號',
  COL_DATE: '日期',
  COL_AMOUNT: '金額',
  COL_PAYMENT_METHOD: '收款方式',
  COL_REQUEST_NO: '請款單號',
  COL_SUPPLIER: '供應商',
  COL_CATEGORY: '類別',
  INCOME_SUBTOTAL: '收入小計',
  EXPENSE_SUBTOTAL: '支出小計',
  NO_INCOME_RECORDS: '無收入紀錄',
  NO_EXPENSE_RECORDS: '無支出紀錄',

  // 頁面 2: 利潤計算
  SECTION_PROFIT: '利潤計算',
  RECEIPT_TOTAL: '收款總額（進項）',
  EXPENSE_TOTAL: '付款總額（銷項）',
  ADMIN_COST: (perPerson: number, count: number) =>
    perPerson > 0 ? `行政費用（$${perPerson}/人 × ${count}人）` : '行政費用',
  PROFIT_BEFORE_TAX: '營收（未扣稅）',
  PROFIT_TAX: (rate: number) => (rate > 0 ? `營收稅額（${rate}%）` : '營收稅額'),
  NET_PROFIT: '淨利',
  OP_BONUS: 'OP 獎金',
  SALE_BONUS: '業務獎金',
  TEAM_BONUS: '團隊獎金',
  COMPANY_PROFIT: '公司盈餘',
  PERCENT_LABEL: (pct: number) => `(${pct}%)`,
  FIXED_LABEL: (amount: number) => `($${amount.toLocaleString()})`,
  EMPLOYEE_SUFFIX: (name: string) => ` — ${name}`,
  NO_BONUS: '淨利為負，無獎金分配',

  // 頁尾
  PAGE_NUMBER: (current: number, total: number) => `第 ${current} 頁 / 共 ${total} 頁`,
  GENERATED_AT: (dateStr: string) => `列印日期：${dateStr}`,
}
