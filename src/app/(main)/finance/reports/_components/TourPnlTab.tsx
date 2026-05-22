'use client'

/**
 * 旅遊團損益表（整合「損益表」+「未結案」、2026-05-22 William 拍板）
 *
 * 8 欄：團號 / 團名 / 總收入 / 總支出(含行政) / 利潤 / 稅金 / 業務獎金 / 公司盈餘
 *
 * Stage 1 MVP：直接用 tours 表的 total_revenue / total_cost / profit（DB trigger 算）
 * + 簡易 tax 算法（profit × 5% default 或從 tour_bonus_settings 撈 tax_rate）
 * + 已結算（closing_date 有值）→ bonus 從 tour_bonus_settings 算
 * + 未結算 → bonus / company_profit 顯示「—」
 *
 * Stage 2 (followup)：完整 calculateFullProfit batch、跟 ProfitTab 對齊
 */

import { useEffect, useState } from 'react'
import { ContentContainer } from '@/components/layout/content-container'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { formatMoney } from '@/lib/utils/format-currency'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import { ACTIVE_TOUR_STATUSES } from '@/lib/constants/tour-status'

interface PnlRow {
  tour_id: string
  tour_code: string
  tour_name: string
  status: string
  is_closed: boolean
  revenue: number
  cost: number
  profit: number
  tax: number | null
  bonus: number | null
  company_profit: number | null
}

interface TourRow {
  id: string
  code: string | null
  name: string
  status: string | null
  closing_date: string | null
  total_revenue: number | null
  total_cost: number | null
  profit: number | null
  current_participants: number | null
}

const DEFAULT_TAX_RATE = 0.05  // 預設 5%、若 tour_bonus_settings 有設則覆寫

export function TourPnlTab() {
  const [rows, setRows] = useState<PnlRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const workspaceId = useAuthStore(s => s.user?.workspace_id)

  useEffect(() => {
    if (!workspaceId) return
    let cancelled = false

    const fetchPnl = async () => {
      setLoading(true)
      setError(null)
      try {
        // 1. 撈正式團（排除 template/proposal — 那是工作台暫存、不入損益）
        const { data: tours, error: toursErr } = await supabase
          .from('tours')
          .select(
            'id, code, name, status, closing_date, total_revenue, total_cost, profit, current_participants'
          )
          .eq('workspace_id', workspaceId)
          .neq('archived', true)
          .in('status', ACTIVE_TOUR_STATUSES)
          .order('departure_date', { ascending: false })
          .limit(500)

        if (toursErr) throw new Error(toursErr.message)
        if (!tours || tours.length === 0) {
          if (!cancelled) {
            setRows([])
            setLoading(false)
          }
          return
        }

        // 2. 撈 tour_bonus_settings（拿 tax_rate / bonus settings）
        const tourIds = tours.map(t => t.id)
        const { data: settings } = await supabase
          .from('tour_bonus_settings')
          .select('*')
          .in('tour_id', tourIds)

        // group settings by tour_id
        const settingsByTour = new Map<string, Array<Record<string, unknown>>>()
        for (const s of settings || []) {
          const tid = (s as { tour_id: string }).tour_id
          if (!settingsByTour.has(tid)) settingsByTour.set(tid, [])
          settingsByTour.get(tid)!.push(s as Record<string, unknown>)
        }

        // 3. 對每 tour 算 8 欄
        const result: PnlRow[] = (tours as TourRow[]).map(tour => {
          const isClosed = !!tour.closing_date
          const revenue = Number(tour.total_revenue) || 0
          const cost = Number(tour.total_cost) || 0
          const profit = Number(tour.profit) || revenue - cost

          // tax_rate：從 tour_bonus_settings 撈 setting_type='profit_tax' 的 value、否則用預設
          const ts = settingsByTour.get(tour.id) || []
          const taxSetting = ts.find(
            s =>
              (s as { setting_type?: string }).setting_type === 'profit_tax' ||
              (s as { setting_type?: string }).setting_type === 'PROFIT_TAX' ||
              (s as { setting_type?: string }).setting_type === 'tax'
          )
          const taxRate = taxSetting
            ? Number((taxSetting as { value?: number }).value) / 100 || DEFAULT_TAX_RATE
            : DEFAULT_TAX_RATE
          const tax = profit > 0 ? Math.ceil(profit * taxRate) : 0

          // 業務獎金（all team_bonus + employee_bonus）：未結算顯示 null
          let bonus: number | null = null
          let companyProfit: number | null = null

          if (isClosed) {
            // 從 settings 加總所有 bonus（排除 tax + administrative）
            const bonusSum = ts.reduce((sum, s) => {
              const t = (s as { setting_type?: string }).setting_type || ''
              if (t === 'profit_tax' || t === 'administrative_expenses' || t === 'PROFIT_TAX' || t === 'ADMINISTRATIVE_EXPENSES') {
                return sum
              }
              const v = Number((s as { value?: number }).value) || 0
              const ctype = (s as { calculation_type?: string }).calculation_type || ''
              // 簡化：FIXED_AMOUNT 直接加、PERCENTAGE 用 profit-tax 後 × %
              if (ctype === 'FIXED_AMOUNT' || ctype === 'fixed_amount') return sum + v
              if (ctype === 'PERCENTAGE' || ctype === 'percentage') {
                const netAfterTax = profit - tax
                return sum + Math.floor(netAfterTax * (v / 100))
              }
              return sum + v
            }, 0)
            bonus = bonusSum
            companyProfit = profit - tax - bonusSum
          }

          return {
            tour_id: tour.id,
            tour_code: tour.code || tour.id.slice(0, 8),
            tour_name: tour.name,
            status: tour.status || '',
            is_closed: isClosed,
            revenue,
            cost,
            profit,
            tax,
            bonus,
            company_profit: companyProfit,
          }
        })

        if (!cancelled) {
          setRows(result)
          setLoading(false)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : '載入失敗')
          setLoading(false)
        }
      }
    }

    fetchPnl()
    return () => {
      cancelled = true
    }
  }, [workspaceId])

  if (loading) {
    return (
      <ContentContainer>
        <div className="flex items-center justify-center min-h-[300px] text-morandi-secondary">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          載入損益表中...
        </div>
      </ContentContainer>
    )
  }

  if (error) {
    return (
      <ContentContainer>
        <div className="flex items-center justify-center min-h-[300px] text-red-600">
          錯誤：{error}
        </div>
      </ContentContainer>
    )
  }

  if (rows.length === 0) {
    return (
      <ContentContainer>
        <div className="flex items-center justify-center min-h-[300px] text-morandi-secondary">
          目前無團體可顯示
        </div>
      </ContentContainer>
    )
  }

  // 合計
  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0)
  const totalCost = rows.reduce((s, r) => s + r.cost, 0)
  const totalProfit = rows.reduce((s, r) => s + r.profit, 0)
  const totalTax = rows.reduce((s, r) => s + (r.tax || 0), 0)
  const totalBonus = rows.reduce((s, r) => s + (r.bonus || 0), 0)
  const totalCompanyProfit = rows.reduce((s, r) => s + (r.company_profit || 0), 0)

  return (
    <ContentContainer>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <colgroup>
            <col className="w-[8rem]" />
            <col />
            <col className="w-[8rem]" />
            <col className="w-[8rem]" />
            <col className="w-[8rem]" />
            <col className="w-[7rem]" />
            <col className="w-[7rem]" />
            <col className="w-[8rem]" />
            <col className="w-[5rem]" />
          </colgroup>
          <thead>
            <tr className="border-b border-border bg-morandi-container/30">
              <th className="text-left py-2 px-3 font-semibold">團號</th>
              <th className="text-left py-2 px-3 font-semibold">團名</th>
              <th className="text-right py-2 px-3 font-semibold">總收入</th>
              <th className="text-right py-2 px-3 font-semibold">總支出</th>
              <th className="text-right py-2 px-3 font-semibold">利潤</th>
              <th className="text-right py-2 px-3 font-semibold">稅金</th>
              <th className="text-right py-2 px-3 font-semibold">業務獎金</th>
              <th className="text-right py-2 px-3 font-semibold">公司盈餘</th>
              <th className="text-center py-2 px-3 font-semibold">狀態</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.tour_id} className="border-b border-border/40 hover:bg-morandi-container/20">
                <td className="py-2 px-3 font-mono text-xs">{row.tour_code}</td>
                <td className="py-2 px-3 truncate">{row.tour_name}</td>
                <td className="py-2 px-3 text-right tabular-nums">{formatMoney(row.revenue)}</td>
                <td className="py-2 px-3 text-right tabular-nums">{formatMoney(row.cost)}</td>
                <td
                  className={`py-2 px-3 text-right tabular-nums font-medium ${
                    row.profit >= 0 ? 'text-morandi-green' : 'text-morandi-red'
                  }`}
                >
                  {formatMoney(row.profit)}
                </td>
                <td className="py-2 px-3 text-right tabular-nums text-morandi-secondary">
                  {row.tax !== null ? formatMoney(row.tax) : '—'}
                </td>
                <td className="py-2 px-3 text-right tabular-nums text-morandi-secondary">
                  {row.bonus !== null ? formatMoney(row.bonus) : '—'}
                </td>
                <td
                  className={`py-2 px-3 text-right tabular-nums font-semibold ${
                    row.company_profit !== null
                      ? row.company_profit >= 0
                        ? 'text-morandi-green'
                        : 'text-morandi-red'
                      : 'text-morandi-muted'
                  }`}
                >
                  {row.company_profit !== null ? formatMoney(row.company_profit) : '—'}
                </td>
                <td className="py-2 px-3 text-center">
                  {row.is_closed ? (
                    <Badge variant="outline" className="text-morandi-green border-morandi-green/40">
                      已結算
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-morandi-muted">
                      未結算
                    </Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-morandi-container/40 font-semibold">
              <td colSpan={2} className="py-2 px-3">合計（{rows.length} 團）</td>
              <td className="py-2 px-3 text-right tabular-nums">{formatMoney(totalRevenue)}</td>
              <td className="py-2 px-3 text-right tabular-nums">{formatMoney(totalCost)}</td>
              <td className="py-2 px-3 text-right tabular-nums">{formatMoney(totalProfit)}</td>
              <td className="py-2 px-3 text-right tabular-nums">{formatMoney(totalTax)}</td>
              <td className="py-2 px-3 text-right tabular-nums">{formatMoney(totalBonus)}</td>
              <td className="py-2 px-3 text-right tabular-nums">{formatMoney(totalCompanyProfit)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-4 text-xs text-morandi-muted px-3">
        ※ 稅金 = 利潤 × tax_rate（已結算用 tour 設定、未結算用預設 5%）
        ※ 業務獎金 + 公司盈餘 = 僅已結算團顯示、未結算顯示「—」
        ※ 總支出已含行政費用、不另列
      </div>
    </ContentContainer>
  )
}
