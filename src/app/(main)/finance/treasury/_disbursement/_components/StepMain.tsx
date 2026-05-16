'use client'
/**
 * StepMain
 * 2026-05-16 拆分自 CreateDisbursementWizardDialog.tsx
 *
 * 編輯模式主視圖：上方暫存批次 chips、下方請款品項列表（勾選）。
 * 帳戶選擇透過 header 帳戶按鈕處理，不在這層處理。
 */

import { Trash2 } from 'lucide-react'
import { EnhancedTable, type TableColumn } from '@/components/ui/enhanced-table'
import { StatusBadge } from '@/components/ui/status-badge'
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
      label: '品項描述',
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
        // 代墊：顯示「{員工姓名}（代墊）」、金色強調區分供應商
        if (it.advanced_by) {
          return <span className="text-morandi-gold">{it.payer_label}</span>
        }
        return it.payer_label
      },
    },
    {
      key: 'payer_bank',
      label: '對方銀行',
      render: (_, row) => {
        const it = row as unknown as UnbilledItem
        return <span className="text-sm">{it.payer_bank_name ?? '未填'}</span>
      },
    },
    {
      key: 'status',
      label: '狀態',
      render: () => <StatusBadge tone="warning" label="未付款" />,
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
