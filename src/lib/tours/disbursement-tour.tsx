'use client'

import type { Tour, Step } from 'nextstepjs'

/**
 * 出納管理頁導覽腳本（/finance/treasury/disbursement）
 *
 * 3 步（藍圖原 4 點「新增 → 選帳戶儲存 → 預覽列印 → 出帳不可改」、
 *      第 2 點「選帳戶」在 wizard dialog 內、tour 框不到、合進步 1 文案）：
 *   1. 整頁總覽 + 新增按鈕（含 wizard 流程說明）
 *   2. 列表結構（銀行群組摘要、4 個操作按鈕）
 *   3. 出帳不可改（會計準則紅線）
 */

const baseStep = {
  icon: null,
  showControls: true,
  showSkip: true,
  pointerPadding: 6,
  pointerRadius: 8,
}

const DISBURSEMENT_TOUR_STEPS: Step[] = [
  {
    ...baseStep,
    title: '出納管理',
    content: (
      <div className="space-y-2.5">
        <p>出納單把多張請款單**一次匯款**處理、省手續費也好對帳。</p>
        <div>
          <p className="font-semibold">點「新增出納單」會跳出精靈：</p>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>勾要付的請款單</li>
            <li>每筆指定「從哪個出帳帳戶」匯</li>
            <li>儲存後生成出納單（狀態：未付款）</li>
          </ul>
        </div>
      </div>
    ),
    selector: '[data-tutorial="disbursement-header"]',
    side: 'bottom-right',
  },
  {
    ...baseStep,
    title: '列表怎麼看',
    content: (
      <div className="space-y-2.5">
        <p>建好出納單後、每筆會這樣呈現（目前沒資料 = 空表）：</p>
        <div>
          <p className="font-semibold">欄位：</p>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>
              <strong>單號 / 日期 / 請款單數 / 總金額 / 狀態</strong>
            </li>
            <li>
              <strong>銀行帳戶</strong> — 顯示「玉山 3 筆 / 台新 2 筆」群組摘要、跨銀行可彙整
            </li>
          </ul>
        </div>
        <div>
          <p className="font-semibold">排序固定：</p>
          <p>未付款在上（舊優先處理）、已付款在下（新歷史在前）、不可自訂。</p>
        </div>
        <div>
          <p className="font-semibold">每筆右側 4 顆操作鈕：</p>
          <p>預覽 / 編輯 / 出帳 / 刪除（編輯、出帳、刪除只有「未付款」才能用）。</p>
        </div>
      </div>
    ),
    // 框「表頭那一排」：EnhancedTable 的 thead 有 data-enhanced-table-header-row 屬性、
    // 不論有沒有資料表頭永遠在、視覺穩定不會「跑到最下面」
    selector: '[data-tutorial="disbursement-table"] [data-enhanced-table-header-row]',
    side: 'bottom',
  },
  {
    ...baseStep,
    title: '出帳完成、不可改',
    content: (
      <div className="space-y-2.5">
        <p>按下「出帳」= 告訴系統「這筆錢真的匯出去了」。一旦確認：</p>
        <ul className="list-disc pl-5 space-y-0.5">
          <li>狀態變「已付款」、不能再編輯、不能刪</li>
          <li>連動的請款單也跟著鎖死</li>
          <li>自動產生會計傳票（公司帳本同步）</li>
        </ul>
        <p className="text-xs text-morandi-muted pt-1">
          這是會計準則：付出去的錢就過去了、要修正只能開新單抵銷、不能回頭塗改。發現錯了、跟團控 /
          會計討論「沖正」方式。
        </p>
      </div>
    ),
    selector: '[data-tutorial="disbursement-header"]',
    side: 'bottom-right',
  },
]

export const disbursementTour: Tour[] = [
  {
    tour: 'disbursement',
    steps: DISBURSEMENT_TOUR_STEPS,
  },
]
