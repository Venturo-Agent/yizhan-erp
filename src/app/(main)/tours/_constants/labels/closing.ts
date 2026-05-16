// 結團、獎金、利潤相關 UI 標籤

export const TOUR_CLOSING_LABELS = {
  SALES_BONUS: '業務獎金',
  OP_BONUS: 'OP獎金',
  SALES_BONUS_DESC: (tourCode: string, percent: number) =>
    `${tourCode} 結案獎金 - 業務 ${percent}%`,
  OP_BONUS_DESC: (tourCode: string, percent: number) => `${tourCode} 結案獎金 - OP ${percent}%`,
  CLOSING_SUCCESS: '結案完成，獎金請款單已產生',
  CLOSING_FAILED: '結案失敗',
  REPORT_GENERATED: '報表已生成',
  REPORT_FAILED: '生成報表失敗',
}

export const BONUS_SETTINGS_DIALOG_LABELS = {
  獎金設定_dash: '獎金設定 —',
  團人數: '團人數：',
  人: '人',
  收款試算: '收款試算：',
  付款試算: '付款試算：',
  淨利試算: '淨利試算：',
  金額試算說明:
    '※「金額」欄為試算值、依當前收 / 付款資料即時計算。 行政費用為手填寫總額（金額 = 單價）。 OP / 業務 / 團隊：選「%」依淨利計算、選「元」直接帶單價；淨利為負時 % 模式不發放。',
} as const

export const PROFIT_TAB_INLINE_LABELS = {
  獎金明細_前綴: '獎金明細 (',
  已生成: '已生成',
  結團時自動生成: '結團時自動生成',
  公司盈餘公式: '（利潤(已扣稅) − 所有獎金）',
} as const

export const TOUR_CLOSING_SECTIONS_LABELS = {
  編輯獎金設定: '編輯獎金設定',
  重新開啟: '重新開啟',
} as const
