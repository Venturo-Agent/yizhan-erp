'use client'
/**
 * OnePageView
 * 2026-05-16 拆分自 CreateDisbursementWizardDialog.tsx
 * 2026-05-21 列表改用 GroupedDisbursementItemsTable（按團 accordion）
 * 2026-05-28 William 拍板「最小改造」UX：
 *   - 上方原「已分配批次」chips → 改「出納統計：」、列**所有公司可出帳銀行帳戶**（無論有沒分配）
 *     每帳戶顯示「筆數 / 金額」、沒分到的顯示「0 筆」
 *   - 拿掉每批的退回 ✕ 按鈕（改成從列表取消勾就退出 batch）
 *   - 列表行內顯示「已分到 X 銀行」chip + 輕背景變色（由 GroupedDisbursementItemsTable 透過 itemBankLabelMap 處理）
 */

import { GroupedDisbursementItemsTable } from './GroupedDisbursementItemsTable'
import type { UnbilledItem, StagedBatch, BankAccountOption } from './disbursement-wizard-types'

interface OnePageViewProps {
  availableItems: UnbilledItem[]
  stagedBatches: StagedBatch[]
  /** 公司所有可出帳銀行帳戶（出納統計用） */
  bankAccounts: BankAccountOption[]
  /** 每個 item 屬於哪個 batch（itemId → from_bank_label）— 列表行內 chip 顯示用 */
  itemBankLabelMap: Map<string, string>
  pickedItemIds: string[]
  /** 每團已收款 map（tour_id → 累計 receipt actual_amount）— 警示超支用 */
  incomeByTourId?: Map<string, number>
  /** 每團累計已付支出 map（tour_id → sum payment_requests.amount where status='paid'） */
  alreadyPaidByTourId?: Map<string, number>
  onChangePicked: (ids: string[]) => void
  /**
   * @deprecated 2026-05-28 UX 改造後不再使用退回按鈕；取消勾 = 自動退出 batch
   * caller 仍可傳、但 OnePageView 內部不再 render 退回 ✕
   */
  onRemoveStaged?: (id: string) => void
  /** 點請款單列 → 開唯讀檢視（傳 request_id） */
  onViewRequest?: (requestId: string) => void
}

export function OnePageView({
  availableItems,
  stagedBatches,
  bankAccounts,
  itemBankLabelMap,
  pickedItemIds,
  incomeByTourId,
  alreadyPaidByTourId,
  onChangePicked,
  onViewRequest,
}: OnePageViewProps) {
  // 每帳戶分到的 batch（同帳戶最多一個 batch、購物車合併邏輯保證）
  const batchByBankId = new Map<string, StagedBatch>()
  for (const b of stagedBatches) {
    batchByBankId.set(b.from_bank_account_id, b)
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
      {bankAccounts.length > 0 && (
        <div className="flex-shrink-0 flex flex-wrap items-center gap-2 px-2">
          <span className="text-xs text-morandi-secondary">出納統計：</span>
          {bankAccounts.map(bank => {
            const batch = batchByBankId.get(bank.id)
            const count = batch?.items.length ?? 0
            const totalAmount = batch?.items.reduce((s, i) => s + i.subtotal, 0) ?? 0
            const hasItems = count > 0
            return (
              <div
                key={bank.id}
                className={`inline-flex items-center gap-2 px-2 py-1 border border-morandi-border rounded text-xs ${
                  hasItems
                    ? 'bg-morandi-gold/10 text-morandi-primary'
                    : 'bg-morandi-container/30 text-morandi-secondary'
                }`}
                title={bank.name}
              >
                <span className="font-medium">{bank.name}</span>
                <span className="text-morandi-secondary">
                  {count} 筆 / {totalAmount.toLocaleString()}
                </span>
              </div>
            )
          })}
        </div>
      )}

      <div className="flex-1 min-h-0">
        <GroupedDisbursementItemsTable
          items={availableItems}
          pickedItemIds={pickedItemIds}
          itemBankLabelMap={itemBankLabelMap}
          incomeByTourId={incomeByTourId}
          alreadyPaidByTourId={alreadyPaidByTourId}
          onChangePicked={onChangePicked}
          onViewRequest={onViewRequest}
        />
      </div>
    </div>
  )
}
