'use client'

import type { Tour, Step } from 'nextstepjs'

/**
 * 員工列表頁導覽腳本（/hr）
 *
 * 1 步：
 *   1. 指 header「新增員工」按鈕
 *
 * 由 hr-roles tour 完成後、event 'venturo:hr-roles-done' 觸發 router.push('/hr')、
 * 進頁後 TourAutoStart 偵測 pathname 自動跑 hr-employees tour。
 */

const baseStep = {
  icon: null,
  showControls: true,
  showSkip: true,
  pointerPadding: 6,
  pointerRadius: 8,
  disableInteraction: true,
}

const HR_EMPLOYEES_TOUR_STEPS: Step[] = [
  {
    ...baseStep,
    title: '員工列表',
    content: (
      <div className="space-y-2">
        <p>建好職務之後、回到員工列表新增員工。</p>
        <p>新增時掛上對應職務、員工進系統就拿到該職務的所有權限。</p>
        <p className="text-xs text-morandi-muted pt-1">日後員工離職、按列表右側操作鈕辦理。</p>
      </div>
    ),
    selector: '[data-tutorial="hr-header"]',
    side: 'bottom-right',
  },
]

export const hrEmployeesTour: Tour[] = [
  {
    tour: 'hr-employees',
    steps: HR_EMPLOYEES_TOUR_STEPS,
  },
]
