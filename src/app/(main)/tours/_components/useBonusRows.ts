'use client'

/**
 * useBonusRows — BonusSettingsDialog 的列資料管理 hook
 *
 * 從 BonusSettingsDialog.tsx 拆出，負責：
 * - BonusRow 型別定義
 * - useEffect hydration（開啟 dialog 時載入既有設定）
 * - computeRowAmount（試算每列金額）
 * - updateRow / addRow / removeRow 操作
 */

import { useEffect, useMemo, useState, useCallback } from 'react'
import { BonusSettingType, BonusCalculationType } from '@/types/bonus.types'
import type { TourBonusSetting } from '@/types/bonus.types'
import { calculateFullProfit } from '../_services/profit-calculation.service'

/** dialog 內每列的可編輯資料 */
export interface BonusRow {
  rowKey: string
  id: string | null
  type: BonusSettingType
  bonus: number
  bonus_type: BonusCalculationType
  employee_id: string | null
  description: string
}

let tmpIdCounter = 0
export const newTmpKey = () => `tmp_${++tmpIdCounter}_${Date.now()}`

/** 預設展示順序（也決定 dialog 開啟時補空白列的順序）*/
export const DEFAULT_TYPE_ORDER: BonusSettingType[] = [
  BonusSettingType.ADMINISTRATIVE_EXPENSES,
  BonusSettingType.PROFIT_TAX,
  BonusSettingType.OP_BONUS,
  BonusSettingType.SALE_BONUS,
  BonusSettingType.TEAM_BONUS,
]

/** 排序權重 */
export const TYPE_SORT_WEIGHT: Record<BonusSettingType, number> = DEFAULT_TYPE_ORDER.reduce(
  (acc, t, i) => {
    acc[t] = i
    return acc
  },
  {} as Record<BonusSettingType, number>
)

/** 行政費用列強制 FIXED_AMOUNT */
export const isAdminRow = (type: BonusSettingType) =>
  type === BonusSettingType.ADMINISTRATIVE_EXPENSES

/** 視為「成本 / 扣項」的類型 */
export const isCostRow = (type: BonusSettingType) =>
  type === BonusSettingType.ADMINISTRATIVE_EXPENSES || type === BonusSettingType.PROFIT_TAX

interface Receipt {
  receipt_amount: number | string | null | undefined
  actual_amount: number | string | null | undefined
}

interface Expense {
  amount: number
}

interface UseBonusRowsParams {
  open: boolean
  existingSettings: TourBonusSetting[]
  defaults: Pick<
    TourBonusSetting,
    'type' | 'bonus' | 'bonus_type' | 'employee_id' | 'description'
  >[]
  receipts: Receipt[]
  expenses: Expense[]
  memberCount: number
  workspace_id: string
  tour_id: string
}

export function useBonusRows({
  open,
  existingSettings,
  defaults,
  receipts,
  expenses,
  memberCount,
  workspace_id,
  tour_id,
}: UseBonusRowsParams) {
  const [rows, setRows] = useState<BonusRow[]>([])
  const [originalIds, setOriginalIds] = useState<Set<string>>(new Set())

  // 開啟時 hydrate 列表：每個類型至少有一列
  useEffect(() => {
    if (!open) return

    const result: BonusRow[] = []
    const seenTypes = new Set<BonusSettingType>()

    const sorted = [...existingSettings].sort(
      (a, b) => TYPE_SORT_WEIGHT[a.type] - TYPE_SORT_WEIGHT[b.type]
    )
    for (const s of sorted) {
      result.push({
        rowKey: s.id,
        id: s.id,
        type: s.type,
        bonus: Number(s.bonus) || 0,
        bonus_type: s.bonus_type,
        employee_id: s.employee_id,
        description: s.description ?? '',
      })
      seenTypes.add(s.type)
    }

    for (const type of DEFAULT_TYPE_ORDER) {
      if (seenTypes.has(type)) continue
      const def = (defaults ?? []).find(d => d.type === type)
      result.push({
        rowKey: newTmpKey(),
        id: null,
        type,
        bonus: def ? Number(def.bonus) || 0 : 0,
        bonus_type: isAdminRow(type)
          ? BonusCalculationType.FIXED_AMOUNT
          : (def?.bonus_type ?? BonusCalculationType.PERCENT),
        employee_id: def?.employee_id ?? null,
        description: def?.description ?? '',
      })
    }

    result.sort((a, b) => TYPE_SORT_WEIGHT[a.type] - TYPE_SORT_WEIGHT[b.type])
    setRows(result)
    setOriginalIds(new Set(existingSettings.map(s => s.id)))
  }, [open, existingSettings, defaults])

  // === 試算金額 ===
  const profitContext = useMemo(() => {
    const settingsLike: TourBonusSetting[] = rows.map(r => ({
      id: r.id ?? r.rowKey,
      workspace_id,
      tour_id,
      type: r.type,
      bonus: r.bonus,
      bonus_type: r.bonus_type,
      employee_id: r.employee_id,
      description: r.description || null,
      payment_request_id: null,
      disbursement_date: null,
      created_at: '',
      updated_at: '',
    }))
    return calculateFullProfit({
      receipts: receipts.map(r => ({
        receipt_amount: r.receipt_amount ?? undefined,
        actual_amount: r.actual_amount ?? undefined,
      })),
      expenses,
      settings: settingsLike,
      memberCount,
    })
  }, [rows, receipts, expenses, memberCount, workspace_id, tour_id])

  const computeRowAmount = useCallback(
    (row: BonusRow): number => {
      const val = Number(row.bonus) || 0

      if (row.type === BonusSettingType.ADMINISTRATIVE_EXPENSES) return val

      if (row.type === BonusSettingType.PROFIT_TAX) {
        if (row.bonus_type === BonusCalculationType.FIXED_AMOUNT) return val
        return profitContext.profit_tax
      }

      if (row.bonus_type === BonusCalculationType.FIXED_AMOUNT) return val
      if (row.bonus_type === BonusCalculationType.MINUS_FIXED_AMOUNT) return -val
      if (profitContext.net_profit < 0) return 0
      if (row.bonus_type === BonusCalculationType.PERCENT) {
        return Math.round((profitContext.net_profit * val) / 100)
      }
      if (row.bonus_type === BonusCalculationType.MINUS_PERCENT) {
        return Math.round((profitContext.net_profit * -val) / 100)
      }
      return 0
    },
    [profitContext]
  )

  // === Row 操作 ===
  const updateRow = useCallback((index: number, patch: Partial<BonusRow>) => {
    setRows(prev => {
      const next = [...prev]
      next[index] = { ...next[index], ...patch }
      if (patch.type !== undefined && isAdminRow(patch.type)) {
        next[index].bonus_type = BonusCalculationType.FIXED_AMOUNT
      }
      return next
    })
  }, [])

  const addRow = useCallback(() => {
    setRows(prev => [
      ...prev,
      {
        rowKey: newTmpKey(),
        id: null,
        type: BonusSettingType.OP_BONUS,
        bonus: 0,
        bonus_type: BonusCalculationType.PERCENT,
        employee_id: null,
        description: '',
      },
    ])
  }, [])

  const removeRow = useCallback((index: number) => {
    setRows(prev => prev.filter((_, i) => i !== index))
  }, [])

  return {
    rows,
    originalIds,
    profitContext,
    computeRowAmount,
    updateRow,
    addRow,
    removeRow,
  }
}
