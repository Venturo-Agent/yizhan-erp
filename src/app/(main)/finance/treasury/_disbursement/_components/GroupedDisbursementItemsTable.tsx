'use client'
/**
 * GroupedDisbursementItemsTable
 * 2026-05-21 William 拍板：出納單新增 wizard 改「按團 accordion」呈現。
 * 2026-05-21 第二版：改用 table 結構（fixed column header + group row 跨欄）、
 *           視覺接近原 flat table、保留 accordion 功能。
 *
 * 設計（方案 2 第二版）：
 * - 固定 column header（請款單號 / 品項 / 付款對象 / 對方銀行 / 金額）
 * - group row 一整列（colspan）顯示整團 checkbox + chevron + 名稱 + 計數 + 總額
 * - 展開時 item rows 在同一張表、欄位對齊 group header
 * - 預設全部團摺疊、上方提供「展開全部 / 收合全部」
 */

import { useMemo, useState } from 'react'
import { ChevronRight, ChevronDown, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
  /** 每團已收款 map（tour_id → 累計 receipt actual_amount）超支警示用 */
  incomeByTourId?: Map<string, number>
  onChangePicked: (ids: string[]) => void
}

const NO_TOUR_KEY = '__no_tour__'

export function GroupedDisbursementItemsTable({
  items,
  pickedItemIds,
  incomeByTourId,
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

      {/* 外框對齊 EnhancedTable 標準（border border-border rounded-xl + bg-card + shadow-sm）*/}
      <div className="flex-1 min-h-0 border border-border rounded-xl overflow-hidden bg-card shadow-sm flex flex-col">
        <div className="overflow-auto flex-1">
          {/* table-fixed：強制 column width 由 thead width 決定、content 變化不會 push 開 layout */}
          <table className="w-full border-collapse text-sm table-fixed">
            <colgroup>
              <col className="w-10" />
              <col className="w-28" />
              <col className="w-40" />
              <col className="w-28" />
              <col />
              <col className="w-56" />
              <col className="w-48" />
              <col className="w-32" />
            </colgroup>
            <thead className="bg-morandi-gold-header sticky top-0 z-10">
              <tr className="border-b border-border">
                <th className="px-3 py-2.5"></th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-morandi-primary">
                  出帳日期
                </th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-morandi-primary">
                  請款單號
                </th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-morandi-primary">
                  請款人
                </th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-morandi-primary">
                  品項
                </th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-morandi-primary">
                  付款對象
                </th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-morandi-primary">
                  對方銀行
                </th>
                <th className="text-right px-3 py-2.5 text-xs font-medium text-morandi-primary">
                  金額
                </th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g, idx) => {
                const isExpanded = expanded.has(g.key)
                const state = groupState(g)
                const selectedCount = groupSelectedCount(g)
                const stripedBg = idx % 2 === 0 ? 'bg-morandi-container/20' : 'bg-card'
                // 該團已勾選支出 sum
                const pickedAmount = g.items.reduce(
                  (sum, i) => (pickedSet.has(i.id) ? sum + i.subtotal : sum),
                  0
                )
                // 該團已收款（client-side aggregated from receipts）
                const income = g.key !== NO_TOUR_KEY && incomeByTourId
                  ? (incomeByTourId.get(g.key) ?? 0)
                  : null
                return (
                  <GroupRows
                    key={g.key}
                    group={g}
                    isFirstGroup={idx === 0}
                    isExpanded={isExpanded}
                    groupCheckState={state}
                    selectedCount={selectedCount}
                    pickedAmount={pickedAmount}
                    income={income}
                    pickedSet={pickedSet}
                    stripedBg={stripedBg}
                    onToggleExpanded={() => toggleExpanded(g.key)}
                    onToggleGroupAll={checked => toggleGroupAll(g, checked)}
                    onToggleItem={toggleItem}
                  />
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

interface GroupRowsProps {
  group: Group
  isFirstGroup: boolean
  isExpanded: boolean
  groupCheckState: 'all' | 'partial' | 'none'
  selectedCount: number
  pickedAmount: number
  income: number | null
  pickedSet: Set<string>
  stripedBg: string
  onToggleExpanded: () => void
  onToggleGroupAll: (checked: boolean) => void
  onToggleItem: (id: string) => void
}

function GroupRows({
  group,
  isFirstGroup: _isFirstGroup,
  isExpanded,
  groupCheckState,
  selectedCount,
  pickedAmount,
  income,
  pickedSet,
  stripedBg,
  onToggleExpanded,
  onToggleGroupAll,
  onToggleItem,
}: GroupRowsProps) {
  // 超支警示：勾選支出 > 該團已收款
  const isOverspend = income !== null && pickedAmount > 0 && pickedAmount > income
  const showIncomeCompare = income !== null && pickedAmount > 0
  // 整個 group（含 group row + items）用同個 stripedBg、跨 group 穿插
  // group row 跟 items 視覺一塊、跟下一團對比
  return (
    <>
      <tr
        className={`${stripedBg} hover:bg-morandi-container/40 cursor-pointer border-b border-border/40`}
        onClick={onToggleExpanded}
      >
        <td className="px-3 py-2 align-middle" onClick={e => e.stopPropagation()}>
          <Checkbox
            checked={groupCheckState === 'all'}
            indeterminate={groupCheckState === 'partial'}
            onCheckedChange={checked => onToggleGroupAll(checked === true)}
          />
        </td>
        {/* 團名對齊「出帳日期」column 起點（含 chevron）*/}
        <td colSpan={2} className="px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-morandi-secondary">
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </span>
            <span className="font-semibold text-morandi-primary truncate">
              {group.label}
            </span>
          </div>
        </td>
        {/* N/N 筆對齊「請款人」column */}
        <td className="px-3 py-2.5">
          <span className="text-xs text-morandi-secondary whitespace-nowrap">
            {selectedCount}/{group.items.length} 筆
          </span>
        </td>
        {/* 超支警示在「品項 + 付款對象 + 對方銀行」3 欄合併區 */}
        <td colSpan={3} className="px-3 py-2.5">
          {showIncomeCompare && (
            <span
              className={`text-xs inline-flex items-center gap-1 px-2 py-0.5 rounded ${
                isOverspend
                  ? 'bg-status-danger/10 text-status-danger font-medium'
                  : 'text-morandi-secondary'
              }`}
            >
              {isOverspend && <AlertTriangle size={12} />}
              已收 NT$ {(income ?? 0).toLocaleString()} / 已勾 NT$ {pickedAmount.toLocaleString()}
              {isOverspend &&
                ` ・超支 NT$ ${(pickedAmount - (income ?? 0)).toLocaleString()}`}
            </span>
          )}
        </td>
        <td className="px-3 py-2.5 text-right font-semibold text-morandi-gold whitespace-nowrap">
          NT$ {group.totalAmount.toLocaleString()}
        </td>
      </tr>

      {isExpanded &&
        group.items.map(it => {
          const checked = pickedSet.has(it.id)
          return (
            <tr
              key={it.id}
              className={`${stripedBg} hover:bg-morandi-container/40 cursor-pointer border-b border-border/40`}
              onClick={() => onToggleItem(it.id)}
            >
              <td className="px-3 py-2 align-middle" onClick={e => e.stopPropagation()}>
                <Checkbox checked={checked} onCheckedChange={() => onToggleItem(it.id)} />
              </td>
              <td className="px-3 py-2 text-morandi-secondary whitespace-nowrap">
                {it.request_date || '-'}
              </td>
              <td className="px-3 py-2 text-morandi-secondary">
                {it.request_code || '-'}
              </td>
              <td className="px-3 py-2 text-morandi-secondary truncate">
                {it.requester_name || '-'}
              </td>
              <td className="px-3 py-2 truncate">{it.description || '-'}</td>
              <td className="px-3 py-2 truncate text-morandi-primary">
                {it.payer_label}
              </td>
              <td className="px-3 py-2 text-xs text-morandi-secondary truncate">
                {it.advanced_by
                  ? `${it.advanced_by_name ?? '代墊人'}（員工代墊）`
                  : it.payer_bank_name || '未填'}
              </td>
              <td className="px-3 py-2 text-right font-medium whitespace-nowrap">
                {it.subtotal.toLocaleString()}
              </td>
            </tr>
          )
        })}
    </>
  )
}
