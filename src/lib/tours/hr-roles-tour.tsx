'use client'

import type { Tour, Step } from 'nextstepjs'

/**
 * 職務管理頁導覽腳本（/hr/roles）
 *
 * 3 步：
 *   1. 職務列表（建職務：業務、會計、團控等）
 *   2. 權限表（讀取 vs 寫入是兩件事；點箭頭展開細部分頁）
 *   3. 旅遊團權限（業務 vs 團控的差別、靠細部勾選決定）
 *
 * 跑完 → TourProvider 偵測 onComplete('hr-roles')
 *      → dispatch 'venturo:hr-roles-done' event
 *      → 導向 /hr、由 hr-employees tour 接續。
 */

const baseStep = {
  icon: null,
  showControls: true,
  showSkip: true,
  pointerPadding: 6,
  pointerRadius: 8,
  disableInteraction: true,
}

const HR_ROLES_TOUR_STEPS: Step[] = [
  {
    ...baseStep,
    title: '職務管理',
    content: (
      <div className="space-y-2">
        <p>這裡管理公司的職務（譬如業務、會計、團控）。</p>
        <p>每個職務代表一組能做的事、員工新增時掛上去、就拿到對應權限。</p>
        <p className="text-xs text-morandi-muted pt-1">右上角「新增職務」可以建新的。</p>
      </div>
    ),
    selector: '[data-tutorial="role-list-panel"]',
    side: 'right-top',
  },
  {
    ...baseStep,
    title: '功能權限',
    content: (
      <div className="space-y-2.5">
        <div>
          <p className="font-semibold">兩個獨立開關：</p>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>
              <strong>可讀取</strong> — 看得到、進得來、但不能改
            </li>
            <li>
              <strong>可寫入</strong> — 可以新增 / 修改 / 刪除
            </li>
          </ul>
        </div>
        <div>
          <p className="font-semibold">展開細項：</p>
          <p>點模組名稱左邊的箭頭、可以針對「分頁」獨立給權限（譬如只給「報價」不給「結案」）。</p>
        </div>
        <p className="text-xs text-morandi-muted pt-1">設定完記得按右上「儲存」。</p>
      </div>
    ),
    selector: '[data-tutorial="role-capability-panel"]',
    side: 'left-top',
  },
  {
    ...baseStep,
    title: '旅遊團權限：團控 vs 業務',
    content: (
      <div className="space-y-2.5">
        <p>「旅遊團」這一列展開後、就能調出兩種角色：</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>業務</strong> — 通常只給「訂單 / 團員 / 報價」可寫入、其他可讀取就好
          </li>
          <li>
            <strong>團控</strong> — 全部可寫入（總覽 / 行程 / 結案都要動）
          </li>
        </ul>
        <p className="text-xs text-morandi-muted pt-1">
          可自由微調、不是固定的、依公司分工。沒有「業務」「團控」這兩個內建職務、用權限組合決定。
        </p>
      </div>
    ),
    selector: '[data-tutorial="role-module-tours"]',
    side: 'left-top',
  },
]

export const hrRolesTour: Tour[] = [
  {
    tour: 'hr-roles',
    steps: HR_ROLES_TOUR_STEPS,
  },
]
