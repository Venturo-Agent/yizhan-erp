'use client'
/**
 * OnePageView
 * 2026-05-16 拆分自 CreateDisbursementWizardDialog.tsx
 *
 * 新增模式：「勾選品項 → 點 header 帳戶按鈕吸入」。
 * 上方 chips（已暫存批次 + 手續費 input + 退回 ✕）、下方品項列表（勾選 + 對方銀行代墊高亮）。
 * 已被吸入的品項從列表消失、退回 chips 才回來。
 */

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trash2 } from 'lucide-react'
import { EnhancedTable, type TableColumn } from '@/components/ui/enhanced-table'
import type { UnbilledItem, StagedBatch } from './disbursement-wizard-types'

interface OnePageViewProps {
  availableItems: UnbilledItem[]
  stagedBatches: StagedBatch[]
  pickedItemIds: string[]
  onChangePicked: (ids: string[]) => void
  onRemoveStaged: (id: string) => void
  onUpdateStagedFee: (batchId: string, fee: number) => void
}

export function OnePageView({
  availableItems,
  stagedBatches,
  pickedItemIds,
  onChangePicked,
  onRemoveStaged,
  onUpdateStagedFee,
}: OnePageViewProps) {
  const columns: TableColumn[] = [
    {
      key: 'request_code',
      label: '請款單號',
      render: (_, row) => {
        const it = row as unknown as UnbilledItem
        return <span className="text-morandi-primary">{it.request_code ?? '-'}</span>
      },
    },
    {
      key: 'tour_name',
      label: '團名',
      render: (_, row) => {
        const it = row as unknown as UnbilledItem
        return it.tour_name ?? '公司'
      },
    },
    {
      key: 'description',
      label: '品項',
      render: (_, row) => {
        const it = row as unknown as UnbilledItem
        return it.description ?? '-'
      },
    },
    {
      key: 'payer_label',
      label: '付款對象',
      render: (_, row) => {
        const it = row as unknown as UnbilledItem
        return it.payer_label
      },
    },
    {
      key: 'payer_bank',
      label: '對方銀行',
      render: (_, row) => {
        const it = row as unknown as UnbilledItem
        if (it.advanced_by) {
          return (
            <span className="text-morandi-gold">
              {it.advanced_by_name ?? '代墊人'}（員工代墊）
            </span>
          )
        }
        return <span className="text-sm">{it.payer_bank_name ?? '未填'}</span>
      },
    },
    {
      key: 'subtotal',
      label: '金額',
      align: 'right',
      render: (_, row) => {
        const it = row as unknown as UnbilledItem
        return <span className="font-medium">{it.subtotal.toLocaleString()}</span>
      },
    },
  ]

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
                <Label className="text-xs whitespace-nowrap">手續費</Label>
                <Input
                  type="number"
                  value={b.total_fee}
                  onChange={e => onUpdateStagedFee(b.batch_id, Number(e.target.value) || 0)}
                  min={0}
                  className="h-6 w-20 text-xs"
                />
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
        <EnhancedTable
          columns={columns}
          data={availableItems as unknown as Record<string, unknown>[]}
          emptyMessage="沒有待出帳品項"
          selection={{
            selected: pickedItemIds,
            onChange: ids => onChangePicked(ids),
          }}
          onRowClick={row => {
            const it = row as unknown as UnbilledItem
            onChangePicked(
              pickedItemIds.includes(it.id)
                ? pickedItemIds.filter(x => x !== it.id)
                : [...pickedItemIds, it.id],
            )
          }}
        />
      </div>
    </div>
  )
}
