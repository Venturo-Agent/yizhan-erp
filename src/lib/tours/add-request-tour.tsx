'use client'

import type { Tour, Step } from 'nextstepjs'

/**
 * 新增請款 dialog 導覽腳本
 *
 * 觸發：AddRequestDialog open 時 dispatch 'venturo:add-request-opened'
 *
 * 1 大步：講解請款流程 + 4 個動作 + 單筆/多筆處理。
 *
 * 為什麼 1 步：dialog 已複雜（3 tab + 表頭 + 明細表）、tour 框小欄位視覺雜；
 * 用 1 卡完整文案、user 對照 UI 填。
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
        <p>
          請款 = 要付給供應商 / 員工的錢。從訂單「請款」按鈕進、團跟訂單自動帶好。
          下方明細表每一列代表一筆要付的款。
        </p>
        <div>
          <p className="font-semibold">填一筆明細的 4 個動作：</p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>
              <strong>選日期</strong> — 服務 /
              消費日期（不是匯款日期、那由出納單的「出帳日期」決定）
            </li>
            <li>
              <strong>選付款方式 / 類別 / 供應商</strong>
              <ul className="list-disc pl-5 space-y-0.5 mt-0.5 text-xs">
                <li>付款方式：現金 / 匯款 / 刷卡等</li>
                <li>類別：機票 / 飯店 / 餐廳 / 雜支等（會影響會計科目）</li>
                <li>
                  供應商：下拉找不到就<strong>直接打字</strong>、會出現「建立 XXX」選項、
                  點下去自動加進供應商清單（之後對帳一致、別自己打成各種錯字）
                </li>
              </ul>
            </li>
            <li>
              <strong>代墊人</strong>（員工先墊的時候）— 服務說明欄旁邊的小人圖示、
              點下去選哪個員工墊的。沒人代墊就跳過。
            </li>
            <li>
              <strong>填單價跟數量</strong> — 小計自動算（單價 × 數量）
            </li>
          </ol>
        </div>
        <div>
          <p className="font-semibold">幾筆？一張單可放多筆：</p>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>
              <strong>單筆請款</strong>（譬如就一張飯店帳）→ 預設那 1 列填完就好、不用新增
            </li>
            <li>
              <strong>多筆請款</strong>（譬如同團同一天有飯店 + 餐廳 + 司機）→ 點「
              <strong>新增項目</strong>」加列、一張單一次 key 完
            </li>
          </ul>
        </div>
        <div>
          <p className="font-semibold">儲存後流程：</p>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>狀態「待匯款」、進「出納管理」彙整</li>
            <li>會計挑多筆建立出納單、選出帳帳戶、批次匯款</li>
            <li>實際匯出去後在出納點「出帳」、整鏈鎖死、不可改</li>
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
