'use client'

import type { Tour, Step } from 'nextstepjs'

/**
 * 新增請款 dialog 導覽腳本
 *
 * 觸發：AddRequestDialog open 時 dispatch 'venturo:add-request-opened'
 *
 * 3 步（5/28 William 拍板拆步框對應 UI、原 4 步因 selector 框大塊 wrapper
 * 導致 card 跑到 dialog 外、合 step 2+3、用「新增項目」按鈕當小 anchor）：
 *   1. DialogHeader — 整體說明
 *   2. 新增項目按鈕 — 4 個動作 + 單筆/多筆指引（user 視線下移看明細表）
 *   3. 送出按鈕 — 儲存後流程 + 沖正紅線
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
      <div className="space-y-2">
        <p>請款 = 要付給供應商 / 員工的錢。</p>
        <p>從訂單「請款」按鈕進來、團跟訂單會自動帶好、直接填明細即可。</p>
        <p className="text-xs text-morandi-muted pt-1">
          上方 tab 可切「團體 / 公司 / 薪資」、依權限顯示。
        </p>
      </div>
    ),
    selector: '[data-tutorial="add-request-header"]',
    side: 'bottom',
  },
  {
    ...baseStep,
    title: '填明細：4 個動作 + 一次 key 多筆',
    content: (
      <div className="space-y-2.5">
        <p>下方明細表每一列代表一筆要付的款、從左到右填：</p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>
            <strong>選日期</strong> — 服務 / 消費日期（不是匯款日、那由出納單的「出帳日期」決定）
          </li>
          <li>
            <strong>選付款方式 / 類別 / 供應商</strong>
            <ul className="list-disc pl-5 space-y-0.5 mt-0.5 text-xs">
              <li>付款方式：現金 / 匯款 / 刷卡等</li>
              <li>類別：機票 / 飯店 / 餐廳 / 雜支等（會影響會計科目）</li>
              <li>
                供應商：下拉找不到就<strong>直接打字</strong>、會出現「建立 XXX」、
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
        <div className="pt-1 border-t border-morandi-border/40 mt-2">
          <p className="font-semibold">幾筆？一張單可放多筆：</p>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>
              <strong>單筆</strong>（一張飯店帳）→ 預設那 1 列填完、不用按這顆按鈕
            </li>
            <li>
              <strong>多筆</strong>（同團同天飯店 + 餐廳 + 司機）→ 點「
              <strong>新增項目</strong>」加列、一張單一次 key 完
            </li>
          </ul>
        </div>
      </div>
    ),
    selector: '[data-tutorial="add-request-add-item"]',
    side: 'left',
  },
  {
    ...baseStep,
    title: '送出後流程',
    content: (
      <div className="space-y-2.5">
        <p>按下這顆 → 請款單建立、狀態「待匯款」。後續：</p>
        <ul className="list-disc pl-5 space-y-0.5">
          <li>進「出納管理」彙整、會計挑多筆建出納單、選出帳帳戶</li>
          <li>批次匯款、實際匯出去後在出納點「出帳」</li>
          <li>整條鏈鎖死、不可改、要改要走「沖正」交易</li>
        </ul>
        <p className="text-xs text-morandi-muted pt-1">
          會計準則：付出去的錢就過去了、不能回頭塗改。發現錯了開新單對沖。
        </p>
      </div>
    ),
    selector: '[data-tutorial="add-request-submit"]',
    side: 'left',
  },
]

export const addRequestTour: Tour[] = [
  {
    tour: 'add-request',
    steps: ADD_REQUEST_TOUR_STEPS,
  },
]
