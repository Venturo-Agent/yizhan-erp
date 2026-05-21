'use client'
/**
 * StepMain
 * 2026-05-16 拆分自 CreateDisbursementWizardDialog.tsx
 * 2026-05-21 表格 UI 改用 GroupedDisbursementItemsTable（按團 accordion）
 *
 * 編輯模式主視圖：上方暫存批次 chips、下方請款品項列表（按團分組、可展開）。
 * 帳戶選擇透過 header 帳戶按鈕處理、不在這層處理。
 */

import { Trash2 } from 'lucide-react'
import { GroupedDisbursementItemsTable } from './GroupedDisbursementItemsTable'
import type { UnbilledItem, StagedBatch } from './disbursement-wizard-types'

interface StepMainProps {
  availableItems: UnbilledItem[]
  stagedBatches: StagedBatch[]
  pickedItemIds: string[]
  onChangePicked: (ids: string[]) => void
  onRemoveStaged: (id: string) => void
}

export function StepMain({
  availableItems,
  stagedBatches,
  pickedItemIds,
  onChangePicked,
  onRemoveStaged,
}: StepMainProps) {
  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3">
      {stagedBatches.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-2">
          <span className="text-xs text-morandi-secondary">已暫存批次：</span>
          {stagedBatches.map(b => {
            const totalAmount = b.items.reduce((s, i) => s + i.subtotal, 0)
            return (
              <div
                key={b.batch_id}
                className="inline-flex items-center gap-1.5 px-2 py-1 border border-morandi-border rounded bg-morandi-gold/10 text-xs"
              >
                <span className="font-medium text-morandi-primary">{b.from_bank_label}</span>
                <span className="text-morandi-secondary">
                  {b.items.length} 筆 / {totalAmount.toLocaleString()}
                  {b.total_fee > 0 ? ` + 手續費 ${b.total_fee.toLocaleString()}` : ''}
                </span>
                <button
                  type="button"
                  className="p-0.5 text-morandi-secondary hover:text-status-danger"
                  onClick={() => onRemoveStaged(b.batch_id)}
                  title="移除這批"
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
