'use client'

import type { Tour, Step } from 'nextstepjs'

/**
 * 新增出納單 wizard 導覽腳本
 *
 * 觸發：CreateDisbursementWizardDialog open（且非編輯模式）時
 *       dispatch 'venturo:create-disbursement-opened'
 *
 * 1 大步：講解 wizard 5 個流程（選請款單 → 選帳戶 → 暫存 → 預覽 → 儲存）。
 *
 * 為什麼 1 步：wizard 內步驟 step state 動態切（main / select-bank / pick-items /
 * fill-fee / preview-all）、各 step selector 不穩；用 1 卡完整文案、user 自己對照走。
 */

const baseStep = {
  icon: null,
  showControls: true,
  showSkip: true,
  pointerPadding: 6,
  pointerRadius: 8,
}

const CREATE_DISBURSEMENT_TOUR_STEPS: Step[] = [
  {
    ...baseStep,
    title: '新增出納單',
    content: (
      <div className="space-y-2.5">
        <p>把多張請款單「彙整成一張出納單」、一次匯款省手續費 + 對帳清楚。</p>
        <div>
          <p className="font-semibold">操作流程：</p>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>
              <strong>勾選請款明細</strong> — 從未匯款清單挑要付的（可跨團、跨供應商）
            </li>
            <li>
              <strong>選出帳帳戶</strong> — 從哪個銀行匯出去（玉山 / 台新 ...）
            </li>
            <li>
              <strong>暫存 batch</strong> — 同一銀行的請款合成一批、可重複加多批
            </li>
            <li>
              <strong>預覽 & 確認</strong> — 看總金額 / 各銀行小計、沒問題按儲存
            </li>
            <li>
              <strong>儲存</strong> — 出納單建好、狀態「未付款」、之後實際匯了再點「出帳」鎖死
            </li>
          </ul>
        </div>
        <p className="text-xs text-morandi-muted pt-1">
          要看的請款單還沒出現？確認該筆「狀態 = 待匯款」且沒被別張出納單先勾走。
        </p>
      </div>
    ),
    selector: '[data-tutorial="create-disbursement-dialog"]',
    side: 'left-top',
  },
]

export const createDisbursementTour: Tour[] = [
  {
    tour: 'create-disbursement',
    steps: CREATE_DISBURSEMENT_TOUR_STEPS,
  },
]
