'use client'

import type { Tour, Step } from 'nextstepjs'

/**
 * 旅遊團頁導覽腳本
 *
 * 精簡 2 步介紹整頁工具列：
 * - tours-header：整個工具列（搜尋 + 5 個 tab）
 * - tour-add-button：「新增專案」下拉（開團 / 提案 / 開模板）
 */

const baseStep = {
  icon: null,
  showControls: true,
  showSkip: true,
  pointerPadding: 6,
  pointerRadius: 8,
  disableInteraction: true,
}

const TOURS_TOUR_STEPS: Step[] = [
  {
    ...baseStep,
    title: '旅遊團管理',
    content: (
      <div className="space-y-2.5">
        <div>
          <p className="font-semibold">搜尋旅遊團：</p>
          <p>可依團號、名稱、地點查找。</p>
        </div>
        <div>
          <p className="font-semibold">5 個分頁：</p>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>進行中 — 還在跑的團</li>
            <li>未結案 — 已回團但還沒結帳</li>
            <li>已結案 — 全結帳完了</li>
            <li>提案 — 時間還沒確定的</li>
            <li>模板 — 重複用的範本</li>
          </ul>
        </div>
        <div>
          <p className="font-semibold">新增專案：</p>
          <p>新增旅遊團 / 提案 / 模板的入口。</p>
        </div>
      </div>
    ),
    selector: '[data-tutorial="tours-header"]',
    side: 'bottom',
  },
  {
    ...baseStep,
    title: '新增專案',
    content: (
      <div className="space-y-1.5">
        <p>點這顆按鈕、會跳出三個選項：</p>
        <ul className="list-disc pl-5 space-y-0.5">
          <li>
            <strong>開團</strong> — 建立正式團
          </li>
          <li>
            <strong>提案</strong> — 時間還沒確定、先記下來的構想
          </li>
          <li>
            <strong>開模板</strong> — 之後可以重複套用的範本
          </li>
        </ul>
        <p className="text-xs text-morandi-muted pt-1">按下方「完成」、會直接帶你進入開團教學。</p>
      </div>
    ),
    selector: '[data-tutorial="tour-add-button"]',
    side: 'bottom-right',
  },
]

export const toursTour: Tour[] = [
  {
    tour: 'tours',
    steps: TOURS_TOUR_STEPS,
  },
]
