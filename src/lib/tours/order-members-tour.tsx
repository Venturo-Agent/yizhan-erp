'use client'

import type { Tour, Step } from 'nextstepjs'

/**
 * 訂單成員管理 dialog 導覽腳本
 *
 * 觸發：OrderMembersDialog open 時 dispatch 'venturo:order-members-opened'
 *       → TourProvider 監聽、setTimeout 後 startIfEnabled('order-members')
 *
 * 2 步：
 *   1. toolbar 整體介紹（手動新增 / PNR 配對 / 列印 / 設定）
 *   2. PNR 配對重點講解（民航法 24h 內登記）
 *
 * 受眾：團務 / 業務、第一次打開「某訂單的成員」時。
 */

const baseStep = {
  icon: null,
  showControls: true,
  showSkip: true,
  pointerPadding: 6,
  pointerRadius: 8,
}

const ORDER_MEMBERS_TOUR_STEPS: Step[] = [
  {
    ...baseStep,
    title: '成員管理',
    content: (
      <div className="space-y-2.5">
        <p>
          這個訂單裡的<strong>每一位旅客</strong>都在這管：護照 / 出生年月日 / 特殊餐 / 房型分配等。
        </p>
        <div>
          <p className="font-semibold">右上 toolbar 主要按鈕：</p>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>
              <strong>新增</strong>（最右）— 手動加成員、填基本資料
            </li>
            <li>
              <strong>PNR 配對</strong> — 貼航空訂位代碼、自動配對對應旅客
            </li>
            <li>
              <strong>比對顧客</strong> — 把已有護照的旅客比對既有客戶資料庫（防重複建檔）
            </li>
            <li>
              <strong>編輯</strong> — 開「全體編輯模式」、整批改資料
            </li>
            <li>
              <strong>列印 / 設定</strong> — 出名單、控制顯示哪些欄位
            </li>
          </ul>
        </div>
      </div>
    ),
    selector: '[data-tutorial="order-members-toolbar"]',
    side: 'bottom-right',
  },
  {
    ...baseStep,
    title: 'PNR 配對',
    content: (
      <div className="space-y-2.5">
        <p>PNR = 航空訂位代碼（6 碼英數）。出團前 OP 拿到航空訂位、把 PNR 內容貼進來、系統自動：</p>
        <ul className="list-disc pl-5 space-y-0.5">
          <li>把旅客英文姓名跟成員配對</li>
          <li>填入機票號碼 / 開票期限</li>
          <li>同步座位資料（後續可顯示）</li>
        </ul>
        <p className="text-xs text-morandi-muted pt-1">
          民航法規定 24h 內要登記、PNR 配對省手動 key in 的時間、不易出錯。
        </p>
      </div>
    ),
    selector: '[data-tutorial="order-members-pnr"]',
    side: 'bottom-right',
  },
]

export const orderMembersTour: Tour[] = [
  {
    tour: 'order-members',
    steps: ORDER_MEMBERS_TOUR_STEPS,
  },
]
