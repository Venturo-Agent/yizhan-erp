'use client'

/**
 * ProfitTab — 利潤計算表 + 獎金明細
 *
 * 設計：
 * - 利潤計算表：4 列 × 2 欄（未扣營業稅 / 已扣營業稅）
 *   只放總額（收款 / 付款 / 營收 / 利潤）、不混進扣項或獎金
 * - 獎金明細：把所有扣項 + 員工獎金都列在下方（行政費 / 營收稅額 / OP / 業務 / 團隊）
 *   底部以「公司盈餘」收尾
 * - 利潤計算表跟獎金明細不重複任何項目
 */

import { useMemo } from 'react'
import useSWR from 'swr'
import { useTranslations } from 'next-intl'
import { DollarSign, HandCoins, FileCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Tour } from '@/stores/types'
import {
  useReceipts,
  usePaymentRequests,
  useTourBonusSettings,
  useEmployeeDictionary,
  useMembers,
  useOrdersSlim,
} from '@/data'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { calculateFullProfit, type BonusCalculationOrder } from '../_services/profit-calculation.service'
import {
  BONUS_TYPE_LABELS,
  BONUS_TYPE_BADGE_VARIANTS,
  PROFIT_TABLE_LABELS,
} from '../_constants/bonus-labels'
import { BonusSettingType, BonusCalculationType } from '@/types/bonus.types'
import type { TourBonusSetting } from '@/types/bonus.types'

const COMPONENT_LABELS = {
  TH_ITEM: '項目',
  TH_DESCRIPTION: '說明',
  TH_AMOUNT: '金額',
  TH_PAYMENT_STATUS: '請款狀態',
  PROFIT_TABLE: '利潤計算表',
  COMPANY_PROFIT: '公司盈餘',
} as const

interface ProfitTabProps {
  tour: Tour
}

function formatAmount(amount: number): string {
  return amount.toLocaleString('zh-TW', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

interface TwoColumnRow {
  label: string
  sub?: string
  amount: number
  highlight?: boolean
}

function TwoColumnProfit({
  receiptTotal,
  expenseTotal,
  grossRevenue,
  profitPostTax,
  adminCost,
  adminPerPerson,
  profitTax,
  taxRate,
  opBonusTotal,
  opBonusCount,
  saleBonusTotal,
  saleBonusCount,
  teamBonusTotal,
  teamBonusCount,
  companyProfit,
}: {
  receiptTotal: number
  expenseTotal: number
  grossRevenue: number
  profitPostTax: number
  adminCost: number
  adminPerPerson: number
  profitTax: number
  taxRate: number
  opBonusTotal: number
  opBonusCount: number
  saleBonusTotal: number
  saleBonusCount: number
  teamBonusTotal: number
  teamBonusCount: number
  companyProfit: number
}) {
  const sumSub = (c: number) => (c > 1 ? `${c} 筆合計` : '')
  // 左欄：收款 + 各扣項（行政 + 三類獎金）／ 右欄：付款 + 營收流動 → 公司盈餘
  // 營收稅額放右欄、夾在「營收總額（未扣稅）」跟「利潤總額（已扣稅）」中間、會計上的扣稅階段更直觀
  const left: TwoColumnRow[] = [
    { label: '收款總額', sub: '進項', amount: receiptTotal },
    { label: '行政費用', sub: adminPerPerson > 0 ? `${adminPerPerson} 元/人` : '', amount: adminCost },
    { label: '業務獎金', sub: sumSub(saleBonusCount), amount: saleBonusTotal },
    { label: 'OP 獎金', sub: sumSub(opBonusCount), amount: opBonusTotal },
    { label: '團隊獎金', sub: sumSub(teamBonusCount), amount: teamBonusTotal },
  ]
  const right: TwoColumnRow[] = [
    { label: '付款總額', sub: '銷項', amount: expenseTotal },
    { label: '營收總額', sub: '未扣除營收稅額', amount: grossRevenue },
    { label: '營收稅額', sub: taxRate > 0 ? `${taxRate}%` : '', amount: profitTax },
    { label: '利潤總額', sub: '已扣除營收稅額', amount: profitPostTax },
    { label: '公司盈餘', sub: '', amount: companyProfit, highlight: true },
  ]

  const HeadCell = () => (
    <div className="grid grid-cols-[1fr_auto] gap-4 px-4 py-2 text-xs font-medium text-morandi-secondary border-b border-border">
      <span>{COMPONENT_LABELS.TH_ITEM}</span>
      <span className="text-right min-w-[80px]">{COMPONENT_LABELS.TH_AMOUNT}</span>
    </div>
  )

  const BodyCell = ({ row }: { row: TwoColumnRow }) => (
    <div
      className={cn(
        'grid grid-cols-[1fr_auto] gap-4 px-4 py-2 border-b border-border last:border-b-0 hover:bg-morandi-bg/50',
        row.highlight && 'bg-morandi-container/30'
      )}
    >
      <span
        className={cn(
          'text-sm',
          row.highlight ? 'text-morandi-primary font-semibold' : 'text-morandi-secondary'
        )}
      >
        {row.label}
        {row.sub && (
          <span className="ml-1 text-xs text-morandi-secondary/70">（{row.sub}）</span>
        )}
      </span>
      <span
        className={cn(
          'text-right font-mono tabular-nums min-w-[80px]',
          row.amount < 0 ? 'text-morandi-red font-medium' : 'text-morandi-primary',
          row.highlight && 'font-bold text-morandi-gold'
        )}
      >
        ${formatAmount(row.amount)}
      </span>
    </div>
  )

  return (
    <div className="grid grid-cols-2 divide-x divide-border">
      <div>
        <HeadCell />
        {left.map((r, i) => (
          <BodyCell key={i} row={r} />
        ))}
      </div>
      <div>
        <HeadCell />
        {right.map((r, i) => (
          <BodyCell key={i} row={r} />
        ))}
      </div>
    </div>
  )
}

// 2026-05-15 William 拍板：利潤計算表改成左右兩欄會計對照（TwoColumnProfit）、
// 舊版單表 + 未扣 / 已扣兩欄 SummaryTable / summaryRows / SummaryRow 全部移除。

interface DetailRow {
  type: 'admin' | 'tax' | BonusSettingType
  label: string
  sublabel?: string
  amount: number
  badgeClass?: string
  badgeText?: string
  /** 對應 bonus_setting（OP/SALE/TEAM 才有、admin/tax 是聚合的、沒對應單筆 setting） */
  setting?: TourBonusSetting
  /** 受款人名（員工名 / 「團隊獎金」） */
  payeeName?: string
}

export function ProfitTab({ tour }: ProfitTabProps) {
  const t = useTranslations('tour')
  const { user } = useAuthStore()
  const workspaceId = user?.workspace_id

  const { data: bonusOrderData } = useSWR(
    workspaceId ? `workspace-bonus-order-${workspaceId}` : null,
    async () => {
      const { data } = await supabase
        .from('workspaces')
        .select('bonus_calculation_order')
        .eq('id', workspaceId!)
        .single()
      return (data as { bonus_calculation_order?: string } | null)?.bonus_calculation_order ?? 'independent'
    },
    { revalidateOnFocus: false }
  )
  const calculationOrder = (bonusOrderData ?? 'independent') as BonusCalculationOrder

  // 注意：useList({ filter }) 目前被 createEntityHook silently drop（待 SSOT 修）
  // 暫時 client side filter by tour.id、避免 receipts/orders/PR/bonusSettings 顯示全部
  const { items: allReceipts } = useReceipts({ all: true, filter: { tour_id: tour.id } })
  const { items: allMembers } = useMembers({ all: true })
  const { items: allOrders } = useOrdersSlim({ all: true, filter: { tour_id: tour.id } })
  const { items: allPaymentRequests } = usePaymentRequests({
    all: true,
    filter: { tour_id: tour.id },
  })
  const { items: allBonusSettings } = useTourBonusSettings({
    all: true,
    filter: { tour_id: tour.id },
  })

  const receipts = useMemo(
    () => (allReceipts ?? []).filter(r => r.tour_id === tour.id),
    [allReceipts, tour.id]
  )
  const orders = useMemo(
    () => (allOrders ?? []).filter(o => o.tour_id === tour.id),
    [allOrders, tour.id]
  )
  const paymentRequests = useMemo(
    () => (allPaymentRequests ?? []).filter(pr => pr.tour_id === tour.id),
    [allPaymentRequests, tour.id]
  )
  const bonusSettings = useMemo(
    () => (allBonusSettings ?? []).filter(b => b.tour_id === tour.id),
    [allBonusSettings, tour.id]
  )
  const { get: getEmployee } = useEmployeeDictionary()

  const orderIds = useMemo(
    () => new Set((orders ?? []).map(o => o.id)),
    [orders]
  )

  const memberCount = useMemo(() => {
    if (!allMembers) return 0
    return allMembers.filter(m => m.order_id && orderIds.has(m.order_id)).length
  }, [allMembers, orderIds])

  const employeeDict = useMemo(() => {
    const dict: Record<string, string> = {}
    for (const s of bonusSettings) {
      if (s.employee_id) {
        const emp = getEmployee(s.employee_id)
        dict[s.employee_id] = emp?.display_name || emp?.chinese_name || s.employee_id
      }
    }
    return dict
  }, [bonusSettings, getEmployee])

  // 排除「獎金類請款」(bonus / 獎金 字樣) 不算進付款總額
  const normalExpenses = useMemo(
    () =>
      paymentRequests.filter(pr => {
        const rt = (pr.request_type || '').toLowerCase()
        return !rt.includes('bonus') && !rt.includes('獎金')
      }),
    [paymentRequests]
  )

  const profitResult = useMemo(() => {
    const adaptedReceipts = receipts.map(r => ({
      ...r,
      receipt_number: r.receipt_number ?? '',
      allocation_mode: 'single' as const,
      payment_items: [],
      total_amount: Number(r.receipt_amount) || 0,
      status: r.status === 'confirmed' ? ('received' as const) : ('pending' as const),
      created_by: r.created_by ?? '',
      updated_at: r.updated_at ?? '',
      created_at: r.created_at ?? '',
    }))

    return calculateFullProfit({
      receipts: adaptedReceipts,
      expenses: normalExpenses.map(pr => ({ amount: pr.amount ?? 0 })),
      settings: bonusSettings,
      memberCount,
      employeeDict,
      calculationOrder,
    })
  }, [receipts, normalExpenses, bonusSettings, memberCount, employeeDict, calculationOrder])

  // ===== 利潤計算表（左右兩欄會計對照）=====
  // - left: 收款 / 行政費 / 稅 / 團隊獎金
  // - right: 付款 / 營收 / 利潤 / 公司盈餘
  const grossRevenue = profitResult.receipt_total - profitResult.expense_total
  const profitPreTax = grossRevenue - profitResult.administrative_cost

  // ===== 獎金明細 =====
  // 包含：行政費 + 營收稅額 + 員工獎金 + 團隊獎金
  // 底部：公司盈餘 = 利潤(b) − 所有獎金（calc service 已算好 = company_profit）
  const detailRows: DetailRow[] = []

  if (profitResult.administrative_cost !== 0) {
    detailRows.push({
      type: 'admin',
      label: '行政費用',
      sublabel:
        profitResult.admin_cost_per_person > 0
          ? `${profitResult.admin_cost_per_person} 元/人 × ${profitResult.member_count} 人`
          : '手填寫總額',
      amount: profitResult.administrative_cost,
      badgeClass: 'bg-cat-orange-bg text-cat-orange',
      badgeText: '扣項',
    })
  }
  if (profitResult.profit_tax !== 0) {
    detailRows.push({
      type: 'tax',
      label: '營收稅額',
      sublabel: profitResult.tax_rate > 0 ? `${profitResult.tax_rate}%` : '手填寫總額',
      amount: profitResult.profit_tax,
      badgeClass: 'bg-morandi-red/15 text-morandi-red',
      badgeText: '扣項',
    })
  }

  for (const b of profitResult.employee_bonuses) {
    if (b.amount === 0) continue
    const bonusVal = Number(b.setting.bonus)
    const sublabel =
      b.setting.bonus_type === BonusCalculationType.PERCENT ? `${bonusVal}%` : `$${bonusVal}`
    const employee = b.employee_name ? ` — ${b.employee_name}` : ''
    detailRows.push({
      type: b.setting.type,
      label: `${BONUS_TYPE_LABELS[b.setting.type as BonusSettingType]}${employee}`,
      sublabel,
      amount: b.amount,
      badgeClass: BONUS_TYPE_BADGE_VARIANTS[b.setting.type as BonusSettingType],
      badgeText: '獎金',
      setting: b.setting,
      payeeName:
        b.employee_name || BONUS_TYPE_LABELS[b.setting.type as BonusSettingType],
    })
  }
  for (const b of profitResult.team_bonuses) {
    if (b.amount === 0) continue
    const bonusVal = Number(b.setting.bonus)
    const sublabel =
      b.setting.bonus_type === BonusCalculationType.PERCENT ? `${bonusVal}%` : `$${bonusVal}`
    detailRows.push({
      type: BonusSettingType.TEAM_BONUS,
      label: BONUS_TYPE_LABELS[BonusSettingType.TEAM_BONUS],
      sublabel,
      amount: b.amount,
      badgeClass: BONUS_TYPE_BADGE_VARIANTS[BonusSettingType.TEAM_BONUS],
      badgeText: '獎金',
      setting: b.setting,
      payeeName: BONUS_TYPE_LABELS[BonusSettingType.TEAM_BONUS],
    })
  }

  const netProfit = profitResult.net_profit

  // 已生成請款單 lookup（setting.payment_request_id → request.code）
  // 顯示「已生成 PR-xxx」狀態用、實際生成由「列印並結團」一鍵自動跑
  const requestCodeById = useMemo(() => {
    const map: Record<string, string> = {}
    for (const r of paymentRequests) {
      if (r.id && r.code) map[r.id] = r.code
    }
    return map
  }, [paymentRequests])

  return (
    <div className="space-y-4">
      {/* 利潤計算表 — 左右兩欄會計對照 */}
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <div className="px-4 py-2 bg-morandi-gold/10 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-morandi-gold" />
          <span className="text-sm font-medium text-morandi-gold">
            {COMPONENT_LABELS.PROFIT_TABLE}
          </span>
        </div>
        {(() => {
          const opB = profitResult.employee_bonuses.filter(
            b => b.setting.type === BonusSettingType.OP_BONUS
          )
          const saleB = profitResult.employee_bonuses.filter(
            b => b.setting.type === BonusSettingType.SALE_BONUS
          )
          return (
            <TwoColumnProfit
              receiptTotal={profitResult.receipt_total}
              expenseTotal={profitResult.expense_total}
              grossRevenue={grossRevenue}
              profitPostTax={profitPreTax - profitResult.profit_tax}
              adminCost={profitResult.administrative_cost}
              adminPerPerson={profitResult.admin_cost_per_person}
              profitTax={profitResult.profit_tax}
              taxRate={profitResult.tax_rate}
              opBonusTotal={opB.reduce((s, b) => s + b.amount, 0)}
              opBonusCount={opB.length}
              saleBonusTotal={saleB.reduce((s, b) => s + b.amount, 0)}
              saleBonusCount={saleB.length}
              teamBonusTotal={profitResult.team_bonuses.reduce((s, b) => s + b.amount, 0)}
              teamBonusCount={profitResult.team_bonuses.length}
              companyProfit={profitResult.company_profit}
            />
          )
        })()}
      </div>

      {/* 獎金明細 — 扣項 + 員工獎金 + 公司盈餘 */}
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <div className="px-4 py-2 bg-morandi-secondary/10 flex items-center gap-2">
          <HandCoins className="w-4 h-4 text-morandi-secondary" />
          <span className="text-sm font-medium text-morandi-secondary">
            {t('profitBonusDetailPrefix')}
            {detailRows.length})
          </span>
        </div>
        {netProfit < 0 ? (
          <div className="px-4 py-3 text-status-warning text-sm bg-status-warning-bg/50">
            {PROFIT_TABLE_LABELS.no_bonus}
          </div>
        ) : detailRows.length === 0 ? (
          <div className="px-4 py-12 text-center text-morandi-secondary text-sm">
            <HandCoins size={24} className="mx-auto mb-3 opacity-50" />
            <p>無獎金明細</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-morandi-secondary border-b border-border">
              <tr>
                <th className="text-left px-4 py-2 font-medium w-20"></th>
                <th className="text-left px-4 py-2 font-medium">{COMPONENT_LABELS.TH_ITEM}</th>
                <th className="text-left px-4 py-2 font-medium">
                  {COMPONENT_LABELS.TH_DESCRIPTION}
                </th>
                <th className="text-right px-4 py-2 font-medium w-28">
                  {COMPONENT_LABELS.TH_AMOUNT}
                </th>
                <th className="text-left px-4 py-2 font-medium w-44">
                  {COMPONENT_LABELS.TH_PAYMENT_STATUS}
                </th>
              </tr>
            </thead>
            <tbody>
              {detailRows.map((row, i) => {
                const issuedRequestId = row.setting?.payment_request_id ?? null
                const issuedCode = issuedRequestId ? requestCodeById[issuedRequestId] : null
                return (
                  <tr
                    key={i}
                    className="border-b border-border last:border-b-0 hover:bg-morandi-bg/50"
                  >
                    <td className="px-4 py-2 w-20">
                      {row.badgeText && (
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                            row.badgeClass
                          )}
                        >
                          {row.badgeText}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-morandi-primary">{row.label}</td>
                    <td className="px-4 py-2 text-morandi-secondary text-xs">
                      {row.sublabel || ''}
                    </td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-morandi-primary font-medium">
                      ${formatAmount(row.amount)}
                    </td>
                    <td className="px-4 py-2">
                      {!row.setting ? (
                        <span className="text-xs text-morandi-secondary/60">—</span>
                      ) : issuedRequestId ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-morandi-green">
                          <FileCheck className="h-3.5 w-3.5" />
                          {t('profitBonusIssued')} {issuedCode || `(${issuedRequestId.slice(0, 8)})`}
                        </span>
                      ) : (
                        <span className="text-xs text-morandi-secondary/60">
                          {t('profitBonusAutoGenerate')}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
              <tr className="border-t-2 border-border bg-morandi-container/30">
                <td className="px-4 py-3" colSpan={3}>
                  <span className="text-sm font-semibold text-morandi-primary">
                    {COMPONENT_LABELS.COMPANY_PROFIT}
                  </span>
                  <span className="text-xs text-morandi-secondary ml-2">
                    {t('profitCompanySurplusFormula')}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums font-bold text-base text-morandi-gold">
                  ${formatAmount(profitResult.company_profit)}
                </td>
                <td className="px-4 py-3" />
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
