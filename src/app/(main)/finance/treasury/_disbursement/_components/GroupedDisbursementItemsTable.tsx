'use client'
/**
 * GroupedDisbursementItemsTable
 * 2026-05-21 William 拍板：出納單新增 wizard 改「按團 accordion」呈現。
 * 2026-05-21 第二版：改用 table 結構（fixed column header + group row 跨欄）、
 *           視覺接近原 flat table、保留 accordion 功能。
 * 2026-05-27 William 拍板：分組單位由「團」改為「請款單」。
 *           同一團開多張請款單時、各自獨立摺疊、不再黏成一團。
 *           超支警示仍保留、但改用「整團」收支換算（見下方註解）。
 *
 * 設計（方案 2 第二版）：
 * - 固定 column header（請款單號 / 品項 / 付款對象 / 對方銀行 / 金額）
 * - group row 一整列（colspan）顯示請款單 checkbox + chevron + 團名 + 計數 + 總額
 *   （單號不放標題、展開後品項列的「請款單號」欄已有；2026-05-27 William 拍板）
 * - 展開時 item rows 在同一張表、欄位對齊 group header
 * - 預設全部請款單摺疊、上方提供「展開全部 / 收合全部」
 */

import { useMemo, useState } from 'react'
import { ChevronRight, ChevronDown, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import type { UnbilledItem } from './disbursement-wizard-types'

interface Group {
  key: string // 請款單 id（request_id）
  label: string // 請款單號（request_code）
  tourId: string | null // 所屬團、給超支警示查 income / alreadyPaid map 用
  tourName: string | null // 所屬團名、超支警示標示用
  requestDate: string | null // 請款日期（ISO YYYY-MM-DD）、分組排序用、近的優先
  items: UnbilledItem[]
  totalAmount: number
}

interface GroupedDisbursementItemsTableProps {
  items: UnbilledItem[]
  pickedItemIds: string[]
  /** 每團已收款 map（tour_id → 累計 receipt actual_amount）超支警示用 */
  incomeByTourId?: Map<string, number>
  /** 每團累計已付支出 map（過去出納單已付的部分） */
  alreadyPaidByTourId?: Map<string, number>
  onChangePicked: (ids: string[]) => void
}

export function GroupedDisbursementItemsTable({
  items,
  pickedItemIds,
  incomeByTourId,
  alreadyPaidByTourId,
  onChangePicked,
}: GroupedDisbursementItemsTableProps) {
  // 2026-05-27 William 拍板：分組單位由「團」改為「請款單」。
  // request_id 必有值（非 nullable）、分組 key 不再需要 NO_TOUR_KEY fallback。
  // tourId / tourName 帶在 group 上、供超支警示查 income / alreadyPaid map 用。
  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, Group>()
    for (const it of items) {
      const key = it.request_id
      let g = map.get(key)
      if (!g) {
        g = {
          key,
          label: it.request_code || '未編號請款單',
          tourId: it.tour_id,
          tourName: it.tour_name,
          requestDate: it.request_date,
          items: [],
          totalAmount: 0,
        }
        map.set(key, g)
      }
      g.items.push(it)
      g.totalAmount += it.subtotal
      // 同張請款單品項應共用同個請款日期、保險起見取最新（max）
      if (it.request_date && (!g.requestDate || it.request_date > g.requestDate)) {
        g.requestDate = it.request_date
      }
    }
    // 2026-05-27 William 拍板：分組（請款單）按請款日期排序、由舊到新（最早的排最上面）。
    // ISO 日期字串（YYYY-MM-DD）可直接比大小；無日期的排最後。
    return Array.from(map.values()).sort((a, b) => {
      if (a.requestDate === b.requestDate) return 0
      if (!a.requestDate) return 1
      if (!b.requestDate) return -1
      return a.requestDate.localeCompare(b.requestDate)
    })
  }, [items])

  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const pickedSet = useMemo(() => new Set(pickedItemIds), [pickedItemIds])

  // 2026-05-27 超支警示改算法：累計支出要用「整團」已勾金額（跨該團所有請款單 group 加總）、
  // 不是單一 group。否則同團拆多張請款單後、每張只算自己的勾選額 = 漏算 = 超支判斷失真。
  const pickedAmountByTourId = useMemo(() => {
    const m = new Map<string, number>()
    for (const it of items) {
      if (pickedSet.has(it.id) && it.tour_id) {
        m.set(it.tour_id, (m.get(it.tour_id) ?? 0) + it.subtotal)
      }
    }
    return m
  }, [items, pickedSet])

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
          共 {groups.length} 張請款單、{items.length} 筆品項
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
            {/* sticky thead：對齊 EnhancedTable 驗證過的寫法 — bg 掛在 thead（實心底）+ 整列 tr（gold）、
                不是只掛在各 th。否則 sticky 那塊本身沒底、捲動時底下列會穿幫上來、表頭像「跑掉」。
                2026-05-27 William 抓出：捲動時表頭不在最上層、改吃 EnhancedTable pattern。 */}
            <thead className="sticky top-0 z-20 bg-card border-b border-border [&_tr]:bg-morandi-gold-header">
              <tr>
                <th className="px-3 py-2.5"></th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-morandi-primary">
                  請款日期
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
                // 超支警示用「整團」已勾金額（跨該團所有請款單 group）、不是本 group 的勾選額
                const pickedAmount = g.tourId ? (pickedAmountByTourId.get(g.tourId) ?? 0) : 0
                const income =
                  g.tourId && incomeByTourId ? (incomeByTourId.get(g.tourId) ?? 0) : null
                const alreadyPaid =
                  g.tourId && alreadyPaidByTourId ? (alreadyPaidByTourId.get(g.tourId) ?? 0) : 0
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
                    alreadyPaid={alreadyPaid}
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
  alreadyPaid: number
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
  alreadyPaid,
  pickedSet,
  stripedBg,
  onToggleExpanded,
  onToggleGroupAll,
  onToggleItem,
}: GroupRowsProps) {
  // 累計支出 = 整團過去已付 + 整團本次勾選；只在超支才顯示警告（William 拍板）
  // 2026-05-27 改：分組改按請款單後、income/alreadyPaid/pickedAmount 皆已是「整團」層級數字
  // 譬喻：預算內不 noise、超預算才提醒
  const totalSpend = alreadyPaid + pickedAmount
  const isOverspend = income !== null && totalSpend > income && totalSpend > 0

  // 整團的請款日期區間（摺疊批勾時露出、讓使用者一眼看出這團是否有日期不一致的單要剔出）
  // ISO 日期字串（YYYY-MM-DD）可直接字串比大小取 min/max
  const reqDates = group.items.map(i => i.request_date).filter((d): d is string => !!d)
  const minReqDate = reqDates.length ? reqDates.reduce((a, b) => (a < b ? a : b)) : null
  const maxReqDate = reqDates.length ? reqDates.reduce((a, b) => (a > b ? a : b)) : null
  const reqDateRange = minReqDate
    ? minReqDate === maxReqDate
      ? minReqDate
      : `${minReqDate} ~ ${maxReqDate}`
    : null
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
        {/* 團名對齊「請款日期」column 起點（含 chevron）*/}
        {/* 2026-05-27 William 拍板：摺疊列粗體顯示「團名」、不是請款單號。
            理由：展開後每筆品項的「請款單號」欄已有單號、標題再放單號是重複。
            tourName 為空時 fallback：有 tour_id 但沒團名→「未命名團」、無 tour_id（公司請款）→「公司請款」 */}
        <td colSpan={2} className="px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-morandi-secondary">
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </span>
            <span className="font-semibold text-morandi-primary truncate">
              {group.tourName || (group.tourId ? '未命名團' : '公司請款')}
            </span>
          </div>
        </td>
        {/* N/N 筆對齊「請款人」column */}
        <td className="px-3 py-2.5">
          <span className="text-xs text-morandi-secondary whitespace-nowrap">
            {selectedCount}/{group.items.length} 筆
          </span>
        </td>
        {/* 該團請款日期區間對齊「品項」column（摺疊批勾時露出、讓使用者看出有日期不一致要剔出的單）*/}
        <td className="px-3 py-2.5">
          {!isExpanded && reqDateRange && (
            <span className="text-xs text-morandi-secondary whitespace-nowrap">
              請款 {reqDateRange}
            </span>
          )}
        </td>
        {/* 超支警示在「付款對象 + 對方銀行」2 欄合併區（只在超支才顯示）*/}
        <td colSpan={2} className="px-3 py-2.5">
          {isOverspend && (
            <span className="text-xs inline-flex items-center gap-1 px-2 py-0.5 rounded bg-status-danger/10 text-status-danger font-medium">
              <AlertTriangle size={12} />
              團：{group.tourName || '未命名團'}・已收 NT$ {(income ?? 0).toLocaleString()} /
              累計支出 NT$ {totalSpend.toLocaleString()}
              {alreadyPaid > 0 &&
                pickedAmount > 0 &&
                ` (已付 ${alreadyPaid.toLocaleString()}＋本次 ${pickedAmount.toLocaleString()})`}
              ・超支 NT$ {(totalSpend - (income ?? 0)).toLocaleString()}
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
              <td className="px-3 py-2 text-morandi-secondary">{it.request_code || '-'}</td>
              <td className="px-3 py-2 text-morandi-secondary truncate">
                {it.requester_name || '-'}
              </td>
              <td className="px-3 py-2 truncate">{it.description || '-'}</td>
              <td className="px-3 py-2 truncate text-morandi-primary">{it.payer_label}</td>
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
