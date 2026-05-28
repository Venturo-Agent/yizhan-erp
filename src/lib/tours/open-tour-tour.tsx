'use client'

import type { Tour, Step } from 'nextstepjs'

/**
 * 開團表單導覽（TourFormShell create + 正式團模式）
 *
 * 進入路徑：旅遊團頁 → 新增專案 → 開團 → dialog 打開 → 自動跑此導覽
 * 由 TourFormShell 內 useEffect 偵測 isOpen + mode + !isProposalOrTemplate 觸發。
 *
 * 提案 / 模板模式跑 open-proposal（窄版、沒右欄訂單）。
 */

const baseStep = {
  icon: null,
  showControls: true,
  showSkip: true,
  pointerPadding: 4,
  pointerRadius: 8,
  disableInteraction: true,
}

const OPEN_TOUR_STEPS: Step[] = [
  {
    ...baseStep,
    title: '旅遊團資訊',
    content: (
      <div className="space-y-1.5">
        <p>左邊填團的基本資料：</p>
        <ul className="list-disc pl-5 space-y-0.5">
          <li>團名稱、團類型、品牌</li>
          <li>團控（負責分房、分車的人）</li>
          <li>國家、機場、出發 / 回程日期</li>
        </ul>
        <p className="text-xs text-morandi-muted pt-1">接下來逐項介紹幾個重點欄位。</p>
      </div>
    ),
    selector: '[data-tutorial="open-tour-info"]',
    side: 'right',
  },
  {
    ...baseStep,
    title: '旅遊團類型',
    content: (
      <div className="space-y-1.5">
        <p>先選旅遊團類型（旅遊團 / 機票 / 機+酒 / 訂房 / 簽證 / 網卡…）。</p>
        <p className="text-xs text-morandi-muted">這個選擇會用來統計公司未來的營運方向，不能漏。</p>
      </div>
    ),
    selector: '[data-tutorial="open-tour-type"]',
    side: 'right',
  },
  {
    ...baseStep,
    title: '目的地（國家 + 機場）',
    content: (
      <div className="space-y-1.5">
        <p>
          先選 <strong>國家</strong>、再選 <strong>機場代號</strong>。
        </p>
        <p className="text-xs text-morandi-muted">機場列表會依國家自動過濾、避免選錯。</p>
      </div>
    ),
    selector: '[data-tutorial="open-tour-destination"]',
    side: 'right',
  },
  {
    ...baseStep,
    title: '新增旅遊團訂單',
    content: (
      <div className="space-y-1.5">
        <p>如果開團當下已有第一個客人，可以順手在這建第一筆訂單。</p>
        <p>沒有也可以留空，之後再進團裡加。</p>
      </div>
    ),
    selector: '[data-tutorial="open-tour-order"]',
    side: 'left',
  },
  {
    ...baseStep,
    title: '建立旅遊團',
    content: (
      <div className="space-y-1.5">
        <p>填好之後按這顆「建立旅遊團」、就會開新團。</p>
        <p className="text-xs text-morandi-muted">
          完成後可以再試試「新增專案 → 提案」、看看提案的填法。
        </p>
      </div>
    ),
    selector: '[data-tutorial="open-tour-submit"]',
    side: 'top',
  },
]

export const openTourTour: Tour[] = [
  {
    tour: 'open-tour',
    steps: OPEN_TOUR_STEPS,
  },
]
