/**
 * LINE 推播用量計次（2026-05-28 William 拍板）
 *
 * LINE 免費版每月 200 則主動推播(push)額度、reply 無限免費。
 * 每次 push 後呼叫 recordLinePush 累加用量 + 記失敗錯誤碼(429額度滿 / 401token失效)。
 *
 * 計次以 workspace + 月為單位（不分哪個同事、一起算）。
 * 唯一入口走 RPC increment_line_usage（原子 upsert、防併發）— 紅線 E。
 *
 * 設計：計次失敗不可影響發送主流程（fire-and-forget、catch 吞掉只記 log）。
 */

import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

interface LinePushOutcome {
  ok: boolean
  status?: number
}

/** 當月第一天 YYYY-MM-01（billing_month key） */
function currentBillingMonth(): string {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}-01`
}

/**
 * 記一次 push 結果（成功累加 success、失敗累加 fail 並記錯誤碼）。
 * fire-and-forget：絕不 throw、不阻塞發送流程。
 */
export async function recordLinePush(
  workspaceId: string | null | undefined,
  outcome: LinePushOutcome
): Promise<void> {
  if (!workspaceId) return
  try {
    const supabase = getSupabaseAdminClient()
    const errorCode = outcome.ok ? undefined : String(outcome.status ?? 'network')
    const { error } = await supabase.rpc('increment_line_usage', {
      p_workspace_id: workspaceId,
      p_billing_month: currentBillingMonth(),
      p_success: outcome.ok,
      p_error_code: errorCode,
    })
    if (error) {
      logger.warn('recordLinePush rpc failed', { workspaceId, error: error.message })
    }
  } catch (err) {
    logger.warn('recordLinePush threw', { workspaceId, err })
  }
}
