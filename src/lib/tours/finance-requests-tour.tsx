'use client'

import type { Tour, Step } from 'nextstepjs'

/**
 * 請款管理頁導覽腳本（/finance/requests）
 *
 * 2 步：
 *   1. 三個 tab 的差別（團體請款 / 公司請款 / 薪資）
 *   2. 新增請款（dialog 內會選類別）
 *
 * 對應藍圖 C7「公司收支教學」請款側。
 * 顯示哪些 tab 依 capability、教學文案兼顧三類。
 */

const baseStep = {
  icon: null,
  showControls: true,
  showSkip: true,
  pointerPadding: 6,
  pointerRadius: 8,
}

const FINANCE_REQUESTS_TOUR_STEPS: Step[] = [
  {
    ...baseStep,
    title: '請款管理',
    content: (
      <div className="space-y-2.5">
        <p>所有要付出去的錢都從這裡開單、依「跟團綁定 vs 公司獨立 vs 薪資」分三種：</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>團體請款</strong> — 綁定某個團、譬如付給領隊 / 飯店 / 餐廳的錢
          </li>
          <li>
            <strong>公司請款</strong> — 沒綁團、譬如辦公室租金、文具、廣告
          </li>
          <li>
            <strong>薪資</strong> — 員工薪水、權限獨立（一般人看不到）
          </li>
        </ul>
        <p className="text-xs text-morandi-muted pt-1">
          請款單建好後、會匯總到「出納」做批次匯款（一次匯出多筆、省手續費）。
        </p>
      </div>
    ),
    selector: '[data-tutorial="requests-header"]',
    side: 'bottom-right',
  },
  {
    ...baseStep,
    title: '新增請款',
    content: (
      <div className="space-y-2.5">
        <p>點「新增請款」會跳精靈、第一步選類別：</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>團體請款</strong> — 接著選團、付款給的供應商、明細項目
          </li>
          <li>
            <strong>公司請款</strong> — 直接填會計科目（租金 / 文具 / 雜支）
          </li>
        </ul>
        <p className="text-xs text-morandi-muted pt-1">
          建好後狀態「待匯款」、進「出納管理」做批次匯款、付完狀態鎖死。
        </p>
      </div>
    ),
    selector: '[data-tutorial="requests-header"]',
    side: 'bottom-right',
  },
]

export const financeRequestsTour: Tour[] = [
  {
    tour: 'finance-requests',
    steps: FINANCE_REQUESTS_TOUR_STEPS,
  },
]
