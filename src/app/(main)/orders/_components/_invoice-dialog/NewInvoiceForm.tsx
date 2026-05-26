'use client'

// ============================================
// 子元件：新開帳單表單（左側）
// ============================================

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Plane, Wand2 } from 'lucide-react'
import { CalcInput } from '@/components/ui/calc-input'
import type { OrderMember } from '../../_types/order-member.types'

interface NewInvoiceFormProps {
  availableMembers: OrderMember[]
  members: OrderMember[]
  selected: Set<string>
  amounts: Record<string, number | null>
  costs: Record<string, number | null>
  descriptions: Record<string, string>
  setAmounts: React.Dispatch<React.SetStateAction<Record<string, number | null>>>
  setCosts: React.Dispatch<React.SetStateAction<Record<string, number | null>>>
  setDescriptions: React.Dispatch<React.SetStateAction<Record<string, string>>>
  onToggle: (id: string) => void
  onSelectAll: () => void
  onFillRow: (m: OrderMember) => void
  onFillItem: (m: OrderMember, item: 'flight') => Promise<void>
}

export function NewInvoiceForm({
  availableMembers,
  selected,
  amounts,
  costs,
  descriptions,
  setAmounts,
  setCosts,
  setDescriptions,
  onToggle,
  onSelectAll,
  onFillRow,
  onFillItem,
}: NewInvoiceFormProps) {
  return (
    <>
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onSelectAll}>
          {selected.size === availableMembers.length ? '取消全選' : '全選'}
        </Button>
        <span className="text-sm text-morandi-secondary">
          已選 {selected.size} / {availableMembers.length} 人
        </span>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-[28px_120px_1fr_100px_100px_80px_60px] gap-2 px-3 py-2 text-xs font-medium text-morandi-secondary bg-morandi-container border-b border-border">
          <div></div>
          <div>姓名</div>
          <div>說明</div>
          <div className="text-right">成本</div>
          <div className="text-right">售價</div>
          <div className="text-right">利潤</div>
          <div className="text-center">帶入</div>
        </div>

        <div className="divide-y max-h-[50vh] overflow-y-auto">
          {availableMembers.map(member => {
            const cost = costs[member.id] || 0
            const amount = amounts[member.id] || 0
            const profit = amount - cost
            const enabled = selected.has(member.id)
            return (
              <div
                key={member.id}
                className="grid grid-cols-[28px_120px_1fr_100px_100px_80px_60px] gap-2 items-center px-3 py-2 hover:bg-morandi-container"
              >
                <Checkbox checked={enabled} onCheckedChange={() => onToggle(member.id)} />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {member.chinese_name || '(未命名)'}
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="說明"
                  value={descriptions[member.id] || ''}
                  onChange={e =>
                    setDescriptions(prev => ({ ...prev, [member.id]: e.target.value }))
                  }
                  disabled={!enabled}
                  className="input-no-focus w-full h-7 px-1 bg-transparent text-sm border-0 outline-none placeholder:text-morandi-muted disabled:opacity-40"
                />
                <CalcInput
                  value={costs[member.id] ?? null}
                  onChange={v => setCosts(prev => ({ ...prev, [member.id]: v }))}
                  placeholder="0"
                  disabled={!enabled}
                  className="input-no-focus w-full h-7 px-1 bg-transparent text-right text-sm border-0 outline-none placeholder:text-morandi-muted disabled:opacity-40"
                />
                <CalcInput
                  value={amounts[member.id] ?? null}
                  onChange={v => setAmounts(prev => ({ ...prev, [member.id]: v }))}
                  placeholder="0"
                  disabled={!enabled}
                  className="input-no-focus w-full h-7 px-1 bg-transparent text-right text-sm border-0 outline-none placeholder:text-morandi-muted disabled:opacity-40"
                />
                <div
                  className={`text-right text-sm font-medium ${
                    profit >= 0 ? 'text-morandi-income' : 'text-morandi-expense'
                  } ${!enabled ? 'opacity-40' : ''}`}
                >
                  {profit.toLocaleString()}
                </div>
                <div className="flex items-center justify-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-1.5"
                    onClick={() => onFillItem(member, 'flight')}
                    title={`帶入機票（${(member.flight_cost || 0).toLocaleString()}）`}
                  >
                    <Plane size={12} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-1.5"
                    onClick={() => onFillRow(member)}
                    title="一鍵帶入該員所有預設值"
                  >
                    <Wand2 size={12} />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {selected.size > 0 && (
        <div className="grid grid-cols-[28px_120px_1fr_100px_100px_80px_60px] gap-2 px-3 py-3 bg-morandi-gold-light/40 rounded-lg border border-morandi-gold/30">
          <div></div>
          <div className="text-sm font-semibold text-morandi-primary">
            總計（{selected.size} 人）
          </div>
          <div></div>
          <div className="text-right text-sm font-semibold text-morandi-expense">
            {Array.from(selected)
              .reduce((sum, id) => sum + (costs[id] || 0), 0)
              .toLocaleString()}
          </div>
          <div className="text-right text-sm font-semibold text-morandi-income">
            {Array.from(selected)
              .reduce((sum, id) => sum + (amounts[id] || 0), 0)
              .toLocaleString()}
          </div>
          {(() => {
            const totalProfit = Array.from(selected).reduce(
              (sum, id) => sum + ((amounts[id] || 0) - (costs[id] || 0)),
              0
            )
            return (
              <div
                className={`text-right text-sm font-bold ${
                  totalProfit >= 0 ? 'text-morandi-income' : 'text-morandi-expense'
                }`}
              >
                {totalProfit.toLocaleString()}
              </div>
            )
          })()}
          <div></div>
        </div>
      )}

      <div className="text-xs text-morandi-secondary">
        Link 14 天過期、客戶端可勾選代付（包含一家人合付）
      </div>
    </>
  )
}
