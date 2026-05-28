'use client'

import type { Tour, Step } from 'nextstepjs'

/**
 * 提案 / 模板表單導覽（TourFormShell create + isProposalOrTemplate 模式）
 *
 * 進入路徑：旅遊團頁 → 新增專案 → 提案（或開模板）→ dialog 打開 → 自動跑此導覽
 * 由 TourFormShell 內 useEffect 偵測 isOpen + mode='create' + isProposalOrTemplate 觸發。
 *
 * 提案 / 模板共用 dialog（窄版、無右欄訂單）、共用此導覽。
 * 錨點重用開團導覽的（open-tour-info / open-tour-submit）——同一個 TourFormShell。
 */

const baseStep = {
  icon: null,
  showControls: true,
  showSkip: true,
  pointerPadding: 4,
  pointerRadius: 8,
}

const OPEN_PROPOSAL_STEPS: Step[] = [
  {
    ...baseStep,
    title: '提案 / 模板表單',
    content: (
      <div className="space-y-1.5">
        <p>
          <strong>提案</strong>：時間還沒確定、先記下來的構想。
        </p>
        <p>
          <strong>模板</strong>：之後可以重複套用的範本。
        </p>
        <p>只需要填基本資料——名稱、團類型、目的地。日期等確定再轉成正式團。</p>
      </div>
    ),
    selector: '[data-tutorial="open-tour-info"]',
    side: 'right',
  },
  {
    ...baseStep,
    title: '建立',
    content: '填完按下方的建立按鈕就好。',
    selector: '[data-tutorial="open-tour-submit"]',
    side: 'top',
  },
]

export const openProposalTour: Tour[] = [
  {
    tour: 'open-proposal',
    steps: OPEN_PROPOSAL_STEPS,
  },
]
