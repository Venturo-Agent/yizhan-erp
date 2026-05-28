'use client'

import type { Tour, Step } from 'nextstepjs'

/**
 * 新增收款 dialog 導覽腳本
 *
 * 觸發：AddReceiptDialog open 時 dispatch 'venturo:add-receipt-opened'
 *
 * 1 大步：講解收款 5 元素（選團 / 選訂單 / 方式日期 / 明細 / 備註）+ 確認流程。
 *
 * 為什麼 1 步：dialog 已經很複雜（3 tab + 表格 + 動態 columns）、tour 框 5 個小區
 * 容易誤觸 disabled state；用 1 卡完整文案、讓 user 自己對照 UI 找。
 */

const baseStep = {
  icon: null,
  showControls: true,
  showSkip: true,
  pointerPadding: 6,
  pointerRadius: 8,
}

const ADD_RECEIPT_TOUR_STEPS: Step[] = [
  {
    ...baseStep,
    title: '新增收款',
    content: (
      <div className="space-y-2.5">
        <p>從訂單「收款」按鈕進來、團跟訂單會自動帶好、直接填明細即可。</p>
        <div>
          <p className="font-semibold">輸入順序（從上到下）：</p>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>
              <strong>選團 / 選訂單</strong> — 從快速按鈕進通常已帶好
            </li>
            <li>
              <strong>收款方式 + 日期</strong> — 現金 / 匯款 / 刷卡 / 支票（4 種）
            </li>
            <li>
              <strong>明細表格</strong> — 一張收款單可拆多筆項目（譬如「團費 50000 + 加價 3000」）
            </li>
            <li>
              <strong>備註</strong> — 每筆項目可獨立加註
            </li>
          </ul>
        </div>
        <div>
          <p className="font-semibold">三個 tab 切換：</p>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>
              <strong>團體收款</strong> — 一團一單
            </li>
            <li>
              <strong>批量收款</strong> — 一張單收多團
            </li>
            <li>
              <strong>公司收款</strong> — 無關團、會計科目分類
            </li>
          </ul>
        </div>
        <p className="text-xs text-morandi-muted pt-1">
          儲存後狀態「待確認」、會計核帳金額後變「已確認」、確認後不可改、要改要走「沖正」。
        </p>
      </div>
    ),
    selector: '[data-tutorial="add-receipt-dialog"]',
    side: 'left-top',
  },
]

export const addReceiptTour: Tour[] = [
  {
    tour: 'add-receipt',
    steps: ADD_RECEIPT_TOUR_STEPS,
  },
]
