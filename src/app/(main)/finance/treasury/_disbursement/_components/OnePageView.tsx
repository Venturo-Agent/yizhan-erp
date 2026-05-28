'use client'
/**
 * OnePageView
 * 2026-05-16 拆分自 CreateDisbursementWizardDialog.tsx
 * 2026-05-21 列表改用 GroupedDisbursementItemsTable（按團 accordion）
 *
 * 新增模式：「勾選品項 → 點 header 帳戶按鈕吸入」。
 * 上方 chips（已暫存批次 + 手續費 input + 退回 ✕）、下方品項列表（按團分組）。
 * 已被吸入的品項從列表消失、退回 chips 才回來。
 *
 * 註：跟 StepMain 結構幾乎一樣、只差「手續費 input」prop。
 * 將來可合併成單一元件（用 onUpdateStagedFee?: 可選 prop 區分）— 2026-05-21 William 拍板待重構。
 */

import { Trash2 } from 'lucide-react'
import { GroupedDisbursementItemsTable } from './GroupedDisbursementItemsTable'
import type { UnbilledItem, StagedBatch } from './disbursement-wizard-types'

interface OnePageViewProps {
  availableItems: UnbilledItem[]
  stagedBatches: StagedBatch[]
  pickedItemIds: string[]
  /** 每團已收款 map（tour_id → 累計 receipt actual_amount）— 警示超支用 */
  incomeByTourId?: Map<string, number>
  /** 每團累計已付支出 map（tour_id → sum payment_requests.amount where status='paid'） */
  alreadyPaidByTourId?: Map<string, number>
  onChangePicked: (ids: string[]) => void
  onRemoveStaged: (id: string) => void
  /** 點請款單列 → 開唯讀檢視（傳 request_id） */
  onViewRequest?: (requestId: string) => void
}

export function OnePageView({
  availableItems,
  stagedBatches,
  pickedItemIds,
  incomeByTourId,
  alreadyPaidByTourId,
  onChangePicked,
  onRemoveStaged,
  onViewRequest,
}: OnePageViewProps) {
  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
      {stagedBatches.length > 0 && (
        <div className="flex-shrink-0 flex flex-wrap items-center gap-2 px-2">
          <span className="text-xs text-morandi-secondary">已分配批次：</span>
          {stagedBatches.map(b => {
            const totalAmount = b.items.reduce((s, i) => s + i.subtotal, 0)
            return (
              <div
                key={b.batch_id}
                className="inline-flex items-center gap-2 px-2 py-1 border border-morandi-border rounded bg-morandi-gold/10 text-xs"
              >
                <span className="font-medium text-morandi-primary">分配到 {b.from_bank_label}</span>
                <span className="text-morandi-secondary">：{totalAmount.toLocaleString()}</span>
                {/* 2026-05-27 William 拍板：wizard 批次不顯示手續費（易誤解同行/跨行）。
                    手續費於存檔時按 SSOT 計算、列印預覽「跨行手續費」行才顯示。 */}
                <button
                  type="button"
                  className="p-0.5 text-morandi-secondary hover:text-status-danger"
                  onClick={() => onRemoveStaged(b.batch_id)}
                  title="退回這批"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div className="flex-1 min-h-0">
        <GroupedDisbursementItemsTable
          items={availableItems}
          pickedItemIds={pickedItemIds}
          incomeByTourId={incomeByTourId}
          alreadyPaidByTourId={alreadyPaidByTourId}
          onChangePicked={onChangePicked}
          onViewRequest={onViewRequest}
        />
      </div>
    </div>
  )
}
