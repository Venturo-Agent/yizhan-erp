'use client'

import type { Tour, Step } from 'nextstepjs'

/**
 * 收款管理頁導覽腳本（/finance/payments）
 *
 * 2 步：
 *   1. 三個 tab 的差別（全部 / 團體收款 / 公司收款）
 *   2. 新增收款（dialog 內會選團體 / 公司）
 *
 * 對應藍圖 C7「公司收支教學」收款側。
 * 顯示哪些 tab 依 capability、教學文案兼顧團體 + 公司。
 */

const baseStep = {
  icon: null,
  showControls: true,
  showSkip: true,
  pointerPadding: 6,
  pointerRadius: 8,
  disableInteraction: true,
}

const FINANCE_PAYMENTS_TOUR_STEPS: Step[] = [
  {
    ...baseStep,
    title: '收款管理',
    content: (
      <div className="space-y-2.5">
        <p>所有客戶 / 公司進帳都記在這裡、依「跟團綁定 vs 公司獨立」分兩種：</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>團體收款</strong> — 綁定某個訂單 / 旅遊團、客戶報名繳的錢
          </li>
          <li>
            <strong>公司收款</strong> — 沒綁團、譬如退稅、利息、佣金、廠商回扣
          </li>
        </ul>
        <p className="text-xs text-morandi-muted pt-1">
          可切「只看未付」過濾、配合月底對帳查還沒收的錢。
        </p>
      </div>
    ),
    selector: '[data-tutorial="payments-header"]',
    side: 'bottom-right',
  },
  {
    ...baseStep,
    title: '新增收款',
    content: (
      <div className="space-y-2.5">
        <p>點「新增收款」會跳精靈、第一步就讓你選：</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>團體收款</strong> — 接著選團 / 訂單、款項自動關聯到該團
          </li>
          <li>
            <strong>公司收款</strong> — 直接填會計科目（退稅 / 利息 / 佣金）
          </li>
        </ul>
        <p className="text-xs text-morandi-muted pt-1">
          建好後狀態為「待確認」、會計核帳確認金額後變「已確認」。
        </p>
      </div>
    ),
    selector: '[data-tutorial="payments-header"]',
    side: 'bottom-right',
  },
]

export const financePaymentsTour: Tour[] = [
  {
    tour: 'finance-payments',
    steps: FINANCE_PAYMENTS_TOUR_STEPS,
  },
]
