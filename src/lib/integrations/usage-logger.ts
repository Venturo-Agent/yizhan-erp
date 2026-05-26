/**
 * Integration Usage Logger
 *
 * 寫 1 筆 integration_usage_log。所有 third-party API caller 共用。
 * 用 service_role 寫入（RLS 阻擋 authenticated 寫）、fail-soft（log 失敗不影響主流程）。
 *
 * 用法：
 *   await logIntegrationUsage({
 *     workspaceId,
 *     integrationCode: 'passport_ocr',
 *     success: true,
 *     metadata: { file_count: 3, response_time_ms: 1500 },
 *   })
 *
 * 設計：2026-05-14 Logan + William 拍板（telegram message 1069）
 */

import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

export interface UsageLogParams {
  workspaceId: string
  integrationCode: string
  success: boolean
  errorMessage?: string | null
  metadata?: Record<string, unknown>
  triggeredBy?: string | null
}

export async function logIntegrationUsage(params: UsageLogParams): Promise<void> {
  try {
    const admin = getSupabaseAdminClient()
    type InsertChain = {
      insert: (v: Record<string, unknown>) => Promise<{ error: unknown }>
    }
    const { error } = await (admin.from as unknown as (t: string) => InsertChain)(
      'integration_usage_log'
    ).insert({
      workspace_id: params.workspaceId,
      integration_code: params.integrationCode,
      success: params.success,
      error_message: params.errorMessage ?? null,
      metadata: params.metadata ?? null,
      triggered_by: params.triggeredBy ?? null,
    })

    if (error) {
      logger.warn('integration_usage_log insert 失敗:', error)
      // fail-soft、不 throw
    }
  } catch (err) {
    logger.warn('logIntegrationUsage 例外:', err)
    // fail-soft
  }
}

/**
 * 查某 workspace + integration 本月用量
 * 回傳：total / success / failed 三個 count
 */
export async function getMonthlyUsage(
  workspaceId: string,
  integrationCode: string
): Promise<{ total: number; success: number; failed: number }> {
  const admin = getSupabaseAdminClient()
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  try {
    // 拉本月該 workspace + integration 的全部紀錄、client 端 count
    // （資料量月 25,000 row 上限、走 list 比 server-side count chain 簡單）
    type SelectChain = {
      select: (c: string) => {
        eq: (
          k: string,
          v: string
        ) => {
          eq: (
            k: string,
            v: string
          ) => {
            gte: (k: string, v: string) => Promise<{ data: Array<{ success: boolean }> | null }>
          }
        }
      }
    }
    const { data } = await (admin.from as unknown as (t: string) => SelectChain)(
      'integration_usage_log'
    )
      .select('success')
      .eq('workspace_id', workspaceId)
      .eq('integration_code', integrationCode)
      .gte('called_at', monthStart.toISOString())

    const rows = data ?? []
    const success = rows.filter(r => r.success).length
    return { total: rows.length, success, failed: rows.length - success }
  } catch {
    return { total: 0, success: 0, failed: 0 }
  }
}
