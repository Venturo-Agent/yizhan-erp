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

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trash2 } from 'lucide-react'
import { GroupedDisbursementItemsTable } from './GroupedDisbursementItemsTable'
import type { UnbilledItem, StagedBatch } from './disbursement-wizard-types'

interface OnePageViewProps {
  availableItems: UnbilledItem[]
  stagedBatches: StagedBatch[]
  pickedItemIds: string[]
  onChangePicked: (ids: string[]) => void
  onRemoveStaged: (id: string) => void
  /** 編輯模式不傳（編輯時手續費在 header 改、不在 chips 內）*/
  onUpdateStagedFee?: (batchId: string, fee: number) => void
}

export function OnePageView({
  availableItems,
  stagedBatches,
  pickedItemIds,
  onChangePicked,
  onRemoveStaged,
  onUpdateStagedFee,
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
                <span className="font-medium text-morandi-primary">{b.from_bank_label}</span>
                <span className="text-morandi-secondary">
                  {b.items.length} 筆 / {totalAmount.toLocaleString()}
                </span>
                {onUpdateStagedFee ? (
                  <>
                    <Label className="text-xs whitespace-nowrap">手續費</Label>
                    <Input
                      type="number"
                      value={b.total_fee}
                      onChange={e => onUpdateStagedFee(b.batch_id, Number(e.target.value) || 0)}
                      min={0}
                      className="h-6 w-20 text-xs"
                    />
                  </>
                ) : b.total_fee > 0 ? (
                  <span className="text-morandi-secondary">手續費 {b.total_fee.toLocaleString()}</span>
                ) : null}
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
          onChangePicked={onChangePicked}
        />
      </div>
    </div>
  )
}
