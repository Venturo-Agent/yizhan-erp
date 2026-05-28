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
        <div>
          <p className="font-semibold">排序固定：</p>
          <p>**未付款在上**（舊的優先處理）、已付款在下（新的歷史在前）。</p>
        </div>
        <div>
          <p className="font-semibold">銀行帳戶欄：</p>
          <p>顯示「玉山 3 筆 / 台新 2 筆」這樣的群組摘要、一張出納單可跨多家銀行。</p>
        </div>
        <div>
          <p className="font-semibold">每一列 4 顆操作鈕：</p>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>
              <strong>預覽</strong> — 看列印單（出去匯款時拿這張）
            </li>
            <li>
              <strong>編輯</strong> — 只有未付款才能改
            </li>
            <li>
              <strong>出帳</strong> — 確認真的匯出去了、按下去鎖死
            </li>
            <li>
              <strong>刪除</strong> — 只有未付款才能刪
            </li>
          </ul>
        </div>
      </div>
    ),
    selector: '[data-tutorial="disbursement-table"]',
    side: 'top',
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
