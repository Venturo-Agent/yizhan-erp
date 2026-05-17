'use client'

/**
 * createReportHook — 財務報表 Hook 工廠
 *
 * 標準化 5 個 finance/reports 的 SWR 樣板：
 *   - 統一 SWR 設定（revalidateOnFocus: false、5 min dedupe）
 *   - 統一回傳形狀：{ rows, loading, error, stats, refresh }
 *   - 不走 entity hook（報表是 RPC view / 跨表 join、不是單一實體）
 *   - 支援無參數 hook（key: string）和帶參數 hook（key: (params) => string | null）
 *
 * 用法（無參數）：
 *   export const usePayables = createReportHook({
 *     key: 'payables-report',
 *     fetcher: async () => { ... return { rows, stats } },
 *     defaultStats: { count: 0, total_payable: 0, ... },
 *   })
 *
 * 用法（帶參數）：
 *   export const useSalesPerformance = createReportHook({
 *     key: (p: DateRange | null) => p ? `sales:${p.startDate}:${p.endDate}` : null,
 *     fetcher: async (p: DateRange | null) => { ... },
 *     defaultStats: { ... },
 *   })
 */

import useSWR from 'swr'
import { logger } from '@/lib/utils/logger'

export interface ReportResult<TRow, TStats> {
  rows: TRow[]
  loading: boolean
  error: string | null
  stats: TStats
  refresh: () => Promise<void>
}

const REPORT_SWR_CONFIG = {
  revalidateOnFocus: false,
  dedupingInterval: 5 * 60 * 1000,
} as const

/**
 * 帶型別參數的 createReportHook（最常用路徑）。
 * TRow    報表每行資料型別
 * TStats  聚合統計型別
 * TParams hook 接受的參數型別（預設 void = 無參數）
 */
export function createReportHook<TRow, TStats, TParams = void>(config: {
  key: TParams extends void ? string : ((params: TParams) => string | null)
  fetcher: (params: TParams) => Promise<{ rows: TRow[]; stats: TStats }>
  defaultStats: TStats
  swrOptions?: { revalidateOnFocus?: boolean; dedupingInterval?: number }
}) {
  // TypeScript 不允許直接用 conditional type 呼叫，用 overload 繞過
  function useReport(params: TParams): ReportResult<TRow, TStats>
  function useReport(...args: unknown[]): ReportResult<TRow, TStats> {
    const params = args[0] as TParams

    const swrKey =
      typeof config.key === 'function'
        ? (config.key as (p: TParams) => string | null)(params)
        : (config.key as string)

    const swrConfig = config.swrOptions
      ? { ...REPORT_SWR_CONFIG, ...config.swrOptions }
      : REPORT_SWR_CONFIG

    const { data, error, isLoading, mutate } = useSWR(
      swrKey,
      async () => {
        try {
          return await config.fetcher(params)
        } catch (err) {
          logger.error(`[createReportHook] fetcher error (key=${swrKey}):`, err)
          throw err
        }
      },
      swrConfig
    )

    return {
      rows: data?.rows ?? [],
      loading: isLoading,
      error: error instanceof Error ? error.message : error ? String(error) : null,
      stats: data?.stats ?? config.defaultStats,
      refresh: async () => { await mutate() },
    }
  }

  return useReport
}

/**
 * 分桶工具（aging bucket）— payables / receivables 共用
 */
export type AgingBucket = 'current' | 'd30' | 'd60' | 'd90' | 'd90_plus'

export function agingBucket(days: number): AgingBucket {
  if (days <= 0) return 'current'
  if (days <= 30) return 'd30'
  if (days <= 60) return 'd60'
  if (days <= 90) return 'd90'
  return 'd90_plus'
}

export function daysBetween(dateStr: string | null, today: Date): number {
  if (!dateStr) return 0
  const d = new Date(dateStr)
  const diff = today.getTime() - d.getTime()
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}
