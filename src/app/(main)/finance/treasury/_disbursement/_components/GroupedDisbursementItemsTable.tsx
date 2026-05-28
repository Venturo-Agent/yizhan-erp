'use client'
/**
 * GroupedDisbursementItemsTable
 * 2026-05-27 William 拍板：改「平鋪」呈現 —— 一張請款單一列、最前面打勾選取、
 *   點該列彈出「請款單唯讀檢視」(重用 AddRequestDialog readOnly)看明細。
 *   拿掉原本的展開/收合 accordion（一展開行數變、畫面閃跳、亂）。
 * 選取顆粒度 = 整張請款單（勾=選該單所有品項；不再做單品項部分出帳）。
 * 明細（品項/付款對象/對方銀行）改在彈窗看、不 inline 展開。
 *
 * 設計：
 * - 固定 column header（請款日期 / 請款單號 / 團名 / 請款人 / 筆數 / 金額）
 * - 一張請款單一列、點列 → onViewRequest(request_id)
 * - 超支警示：整團收支換算（跨該團所有請款單）、只在超支才顯示
 */

import { useMemo } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import type { UnbilledItem } from './disbursement-wizard-types'

interface Group {
  key: string // 請款單 id（request_id）
  label: string // 請款單號（request_code）
  tourId: string | null // 所屬團、超支警示查 income / alreadyPaid map 用
  tourName: string | null // 所屬團名
  requesterName: string | null // 請款人
  requestDate: string | null // 請款日期（排序用、由舊到新）
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
  /** 每個 item 已分到哪個銀行（itemId → from_bank_label）— 行內 chip + 背景變色用、2026-05-28 加 */
  itemBankLabelMap?: Map<string, string>
  onChangePicked: (ids: string[]) => void
  /** 點某張請款單列 → 開該請款單唯讀檢視（傳 request_id），不傳則點列無動作 */
  onViewRequest?: (requestId: string) => void
}

export function GroupedDisbursementItemsTable({
  items,
  pickedItemIds,
  incomeByTourId,
  alreadyPaidByTourId,
  itemBankLabelMap,
  onChangePicked,
  onViewRequest,
}: GroupedDisbursementItemsTableProps) {
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
          requesterName: it.requester_name,
          requestDate: it.request_date,
          items: [],
          totalAmount: 0,
        }
        map.set(key, g)
      }
      g.items.push(it)
      g.totalAmount += it.subtotal
      // 同張請款單品項共用同個請款日期、保險取最新
      if (it.request_date && (!g.requestDate || it.request_date > g.requestDate)) {
        g.requestDate = it.request_date
      }
    }
    // 按請款日期由舊到新、無日期排最後
    return Array.from(map.values()).sort((a, b) => {
      if (a.requestDate === b.requestDate) return 0
      if (!a.requestDate) return 1
      if (!b.requestDate) return -1
      return a.requestDate.localeCompare(b.requestDate)
    })
  }, [items])

  const pickedSet = useMemo(() => new Set(pickedItemIds), [pickedItemIds])

  // 超支警示：累計支出用「整團」已勾金額（跨該團所有請款單加總）
  const pickedAmountByTourId = useMemo(() => {
    const m = new Map<string, number>()
    for (const it of items) {
      if (pickedSet.has(it.id) && it.tour_id) {
        m.set(it.tour_id, (m.get(it.tour_id) ?? 0) + it.subtotal)
      }
    }
    return m
  }, [items, pickedSet])

  // 整張選取：該請款單所有品項都在 pickedSet = 已選
  const isGroupPicked = (g: Group) => g.items.every(i => pickedSet.has(i.id))

  const toggleGroup = (g: Group, checked: boolean) => {
    const groupIds = new Set(g.items.map(i => i.id))
    if (checked) {
      const next = [...pickedItemIds]
      for (const id of groupIds) if (!pickedSet.has(id)) next.push(id)
      onChangePicked(next)
    } else {
      onChangePicked(pickedItemIds.filter(id => !groupIds.has(id)))
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
        <span className="ml-auto text-xs text-morandi-secondary">
          共 {groups.length} 張請款單、{items.length} 筆品項
        </span>
      </div>

      {/* 外框對齊 EnhancedTable 標準 */}
      <div className="flex-1 min-h-0 border border-border rounded-xl overflow-hidden bg-card shadow-sm flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="w-full border-collapse text-sm table-fixed">
            <colgroup>
              <col className="w-10" />
              <col className="w-28" />
              <col className="w-36" />
              <col />
              <col className="w-28" />
              <col className="w-16" />
              <col className="w-32" />
            </colgroup>
            {/* sticky thead：bg 掛 thead + 整列 tr（實心底、捲動不穿幫）*/}
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
                  團名
                </th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-morandi-primary">
                  請款人
                </th>
                <th className="text-center px-3 py-2.5 text-xs font-medium text-morandi-primary">
                  筆數
                </th>
                <th className="text-right px-3 py-2.5 text-xs font-medium text-morandi-primary">
                  金額
                </th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g, idx) => {
                const picked = isGroupPicked(g)
                // 2026-05-28 William 拍板：整張請款單只要有一個 item 在某 batch、視為「已分配到該銀行」
                // （現流程一張單一次整批分、不會跨銀行）→ 取第一個 item 的 bank label
                const assignedBank = itemBankLabelMap
                  ? (g.items.map(i => itemBankLabelMap.get(i.id)).find(v => !!v) ?? null)
                  : null
                const isAssigned = !!assignedBank
                // 已分配行：輕背景變色（design token 強制、不 Tailwind 預設色）
                // 未分配行：維持原 striped
                const stripedBg = isAssigned
                  ? 'bg-morandi-gold/5'
                  : idx % 2 === 0
                    ? 'bg-morandi-container/20'
                    : 'bg-card'
                // 超支警示用「整團」已勾金額
                const pickedAmount = g.tourId ? (pickedAmountByTourId.get(g.tourId) ?? 0) : 0
                const income =
                  g.tourId && incomeByTourId ? (incomeByTourId.get(g.tourId) ?? 0) : null
                const alreadyPaid =
                  g.tourId && alreadyPaidByTourId ? (alreadyPaidByTourId.get(g.tourId) ?? 0) : 0
                const totalSpend = alreadyPaid + pickedAmount
                const isOverspend = income !== null && totalSpend > income && totalSpend > 0
                return (
                  <tr
                    key={g.key}
                    className={`${stripedBg} hover:bg-morandi-container/40 cursor-pointer border-b border-border/40`}
                    onClick={() => onViewRequest?.(g.key)}
                    title="點擊看請款單明細"
                  >
                    <td className="px-3 py-2.5 align-middle" onClick={e => e.stopPropagation()}>
                      <Checkbox
                        checked={picked}
                        onCheckedChange={checked => toggleGroup(g, checked === true)}
                      />
                    </td>
                    <td className="px-3 py-2.5 text-morandi-secondary whitespace-nowrap">
                      {g.requestDate || '-'}
                    </td>
                    <td className="px-3 py-2.5 text-morandi-secondary truncate">{g.label}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-morandi-primary truncate">
                          {g.tourName || (g.tourId ? '未命名團' : '公司請款')}
                        </span>
                        {isAssigned && (
                          <span className="text-xs inline-flex items-center gap-1 px-2 py-0.5 rounded bg-morandi-gold/10 text-morandi-gold font-medium whitespace-nowrap">
                            已分到：{assignedBank}
                          </span>
                        )}
                        {isOverspend && (
                          <span className="text-xs inline-flex items-center gap-1 px-2 py-0.5 rounded bg-status-danger/10 text-status-danger font-medium whitespace-nowrap">
                            <AlertTriangle size={12} />
                            超支 NT$ {(totalSpend - (income ?? 0)).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-morandi-secondary truncate">
                      {g.requesterName || '-'}
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs text-morandi-secondary">
                      {g.items.length}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-morandi-gold whitespace-nowrap">
                      NT$ {g.totalAmount.toLocaleString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
