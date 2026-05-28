'use client'

import type { Tour, Step } from 'nextstepjs'

/**
 * 團詳情 > 訂單 tab 導覽腳本（/tours/[code]?tab=orders）
 *
 * 1 步：總覽介紹一團多訂單概念 + 每列 6 個 action 用途。
 *
 * 觸發條件：
 *   - pathname 符合 /tours/<code> pattern（非 /tours 列表、非 display-editor 子頁）
 *   - 預設 activeTab='orders'（page.tsx 預設）、所以一進來就有錨點
 *
 * 為什麼只 1 步：6 個 action 列出在同一張卡比較好讀、不分頁切來切去。
 */

const baseStep = {
  icon: null,
  showControls: true,
  showSkip: true,
  pointerPadding: 6,
  pointerRadius: 8,
}

const TOUR_ORDERS_TOUR_STEPS: Step[] = [
  {
    ...baseStep,
    title: '訂單分頁',
    content: (
      <div className="space-y-2.5">
        <p>
          一個團可以有<strong>多筆訂單</strong>、每筆訂單代表一組客人（譬如「王先生一家 3 大 1
          小」、「李小姐情侶」、「公司團報」）。
        </p>
        <div>
          <p className="font-semibold">每列右側 6 顆操作鈕：</p>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>
              <strong>編輯</strong> — 改聯絡人 / 報價 / 加備註
            </li>
            <li>
              <strong>成員</strong> — 管這組客人的護照 / PNR / 出生年月日
            </li>
            <li>
              <strong>收款</strong>（綠）— 跟這筆訂單收錢
            </li>
            <li>
              <strong>請款</strong>（紅）— 為這筆訂單代付供應商
            </li>
            <li>
              <strong>開發票</strong>（金）— 給這組客人開發票
            </li>
            <li>
              <strong>刪除</strong>（紅）— 整筆訂單刪除（要看權限）
            </li>
          </ul>
        </div>
        <p className="text-xs text-morandi-muted pt-1">
          新增訂單從 /tours 列表的「報名」按鈕進、不在這頁。
        </p>
      </div>
    ),
    selector: '[data-tutorial="tour-orders-content"]',
    side: 'top',
  },
]

export const tourOrdersTour: Tour[] = [
  {
    tour: 'tour-orders',
    steps: TOUR_ORDERS_TOUR_STEPS,
  },
]
