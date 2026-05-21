'use client'
/**
 * GroupedDisbursementItemsTable
 * 2026-05-21 William 拍板：出納單新增 wizard 改用「按團 Accordion」呈現未付品項。
 *
 * 設計（方案 2）：
 * - 預設全部團摺疊、上方提供「展開全部 / 收合全部」按鈕
 * - 整團勾選 = 自動勾選底下所有品項
 * - 半勾選用 Checkbox indeterminate 顯示
 * - 找問題單據時點該團展開、取消有問題那筆即可
 *
 * 取代原本 EnhancedTable 的 flat 列表（StepMain 用）
 */

import { useMemo, useState } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { StatusBadge } from '@/components/ui/status-badge'
import type { UnbilledItem } from './disbursement-wizard-types'

interface Group {
  key: string
  label: string
  items: UnbilledItem[]
  totalAmount: number
}

interface GroupedDisbursementItemsTableProps {
  items: UnbilledItem[]
  pickedItemIds: string[]
  onChangePicked: (ids: string[]) => void
}

const NO_TOUR_KEY = '__no_tour__'

export function GroupedDisbursementItemsTable({
  items,
  pickedItemIds,
  onChangePicked,
}: GroupedDisbursementItemsTableProps) {
  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, Group>()
    for (const it of items) {
      const key = it.tour_id || NO_TOUR_KEY
      let g = map.get(key)
      if (!g) {
        g = {
          key,
          label: it.tour_name || (key === NO_TOUR_KEY ? '公司請款' : '未命名團'),
          items: [],
          totalAmount: 0,
        }
        map.set(key, g)
      }
      g.items.push(it)
      g.totalAmount += it.subtotal
    }
    return Array.from(map.values())
  }, [items])

  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const pickedSet = useMemo(() => new Set(pickedItemIds), [pickedItemIds])

  const groupSelectedCount = (g: Group) =>
    g.items.reduce((n, i) => (pickedSet.has(i.id) ? n + 1 : n), 0)

  const groupState = (g: Group): 'all' | 'partial' | 'none' => {
    const sel = groupSelectedCount(g)
    if (sel === 0) return 'none'
    if (sel === g.items.length) return 'all'
    return 'partial'
  }

  const toggleExpanded = (key: string) =>
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const expandAll = () => setExpanded(new Set(groups.map(g => g.key)))
  const collapseAll = () => setExpanded(new Set())

  const toggleGroupAll = (g: Group, checked: boolean) => {
    const groupIds = new Set(g.items.map(i => i.id))
    if (checked) {
      const next = [...pickedItemIds]
      for (const id of groupIds) if (!pickedSet.has(id)) next.push(id)
      onChangePicked(next)
    } else {
      onChangePicked(pickedItemIds.filter(id => !groupIds.has(id)))
    }
  }

  const toggleItem = (id: string) => {
    if (pickedSet.has(id)) {
      onChangePicked(pickedItemIds.filter(x => x !== id))
    } else {
      onChangePicked([...pickedItemIds, id])
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-morandi-secondary text-sm">
        沒有待出帳品項
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center gap-2 px-1 flex-shrink-0">
        <Button variant="ghost" size="sm" onClick={expandAll} className="h-7 text-xs">
          展開全部
        </Button>
        <Button variant="ghost" size="sm" onClick={collapseAll} className="h-7 text-xs">
          收合全部
        </Button>
        <span className="ml-auto text-xs text-morandi-secondary">
          共 {groups.length} 團、{items.length} 筆品項
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1">
        {groups.map(g => {
          const isExpanded = expanded.has(g.key)
          const state = groupState(g)
          const selectedCount = groupSelectedCount(g)
          return (
            <div key={g.key} className="border border-morandi-border rounded bg-card">
              <div
                role="button"
                tabIndex={0}
                className="flex items-center gap-2 px-2 py-2 hover:bg-morandi-container/30 cursor-pointer select-none"
                onClick={() => toggleExpanded(g.key)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    toggleExpanded(g.key)
                  }
                }}
              >
                <span onClick={e => e.stopPropagation()}>
                  <Checkbox
                    checked={state === 'all'}
                    indeterminate={state === 'partial'}
                    onCheckedChange={checked => toggleGroupAll(g, checked === true)}
                  />
                </span>
                <span className="text-morandi-secondary">
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </span>
                <div className="flex-1 min-w-0 flex items-center gap-3">
                  <span className="font-medium text-morandi-primary truncate">{g.label}</span>
                  <span className="text-xs text-morandi-secondary whitespace-nowrap">
                    {selectedCount}/{g.items.length} 筆
                  </span>
                </div>
                <div className="text-right font-semibold text-morandi-gold whitespace-nowrap">
                  NT$ {g.totalAmount.toLocaleString()}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-morandi-border bg-morandi-container/10">
                  {g.items.map(it => {
                    const checked = pickedSet.has(it.id)
                    return (
                      <div
                        key={it.id}
                        role="button"
                        tabIndex={0}
                        className="flex items-center gap-2 pl-10 pr-2 py-1.5 text-sm hover:bg-morandi-container/40 cursor-pointer border-b border-morandi-border/30 last:border-0"
                        onClick={() => toggleItem(it.id)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            toggleItem(it.id)
                          }
                        }}
                      >
                        <span onClick={e => e.stopPropagation()}>
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleItem(it.id)}
                          />
                        </span>
                        <span className="text-morandi-secondary w-32 truncate">
                          {it.request_code || '-'}
                        </span>
                        <span className="flex-1 truncate">{it.description || '-'}</span>
                        <span
                          className={`w-40 truncate ${
                            it.advanced_by ? 'text-morandi-gold' : 'text-morandi-primary'
                          }`}
                        >
                          {it.payer_label}
                        </span>
                        <span className="text-xs text-morandi-secondary w-32 truncate">
                          {it.payer_bank_name || '未填'}
                        </span>
                        <StatusBadge tone="warning" label="未付款" />
                        <span className="font-medium w-28 text-right">
                          {it.subtotal.toLocaleString()}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
