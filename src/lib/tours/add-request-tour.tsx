'use client'

import type { Tour, Step } from 'nextstepjs'

/**
 * 新增請款 dialog 導覽腳本
 *
 * 觸發：AddRequestDialog open 時 dispatch 'venturo:add-request-opened'
 *
 * 1 大步：講解請款流程。
 *
 * 為什麼 1 步：跟 add-receipt 同邏輯、dialog 已複雜、用 1 卡完整文案。
 */

const baseStep = {
  icon: null,
  showControls: true,
  showSkip: true,
  pointerPadding: 6,
  pointerRadius: 8,
}

const ADD_REQUEST_TOUR_STEPS: Step[] = [
  {
    ...baseStep,
    title: '新增請款',
    content: (
      <div className="space-y-2.5">
        <p>請款 = 要付給供應商 / 員工的錢。從訂單「請款」按鈕進、團跟訂單自動帶好。</p>
        <div>
          <p className="font-semibold">輸入順序：</p>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>
              <strong>選團 / 選訂單</strong> — 從訂單進來通常已帶好
            </li>
            <li>
              <strong>類別</strong>（tab）— 團體 / 公司 / 薪資
            </li>
            <li>
              <strong>供應商</strong> — 找不到時請新增（不要打錯名字、之後對帳很煩）
            </li>
            <li>
              <strong>明細</strong> — 服務項目 / 日期 / 單價 / 數量（小計自動算）
            </li>
            <li>
              <strong>代墊人</strong>（如果是員工先墊的）— 之後出納退錢給他
            </li>
          </ul>
        </div>
        <div>
          <p className="font-semibold">儲存後流程：</p>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>狀態「待匯款」、進「出納管理」彙整</li>
            <li>會計勾選多筆建立出納單、批次匯款</li>
            <li>實際匯出去後在出納點「出帳」、整鏈鎖死</li>
          </ul>
        </div>
        <p className="text-xs text-morandi-muted pt-1">
          請款一旦進出納批次、就不能刪 / 不能改、要改要走「沖正」交易。
        </p>
      </div>
    ),
    // 框 DialogHeader（小區、上方）、card 出現在 header 下方
    // 不框整個 DialogContent（95vw / 90vh、card 會跑到中下面、視覺感「太低」）
    selector: '[data-tutorial="add-request-header"]',
    side: 'bottom',
  },
]

export const addRequestTour: Tour[] = [
  {
    tour: 'add-request',
    steps: ADD_REQUEST_TOUR_STEPS,
  },
]
