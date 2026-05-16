/**
 * Cron Heartbeat + Retry Helper
 *
 * 包裝 cron handler 加 retry + heartbeat。
 *
 * 使用:
 * ```ts
 * export async function GET(req: NextRequest) {
 *   return withCronHeartbeat('ticket-status', async () => {
 *     // 實際處理邏輯
 *     return { processed: 10 }
 *   })
 * }
 * ```
 *
 * 機制:
 *   1. 進場 UPSERT cron_heartbeats status='running'
 *   2. 跑 handler、失敗 retry (max 3 次、exponential backoff 1s / 2s / 4s)
 *   3. 成功: status='success' + duration
 *   4. 全部 retry 完仍失敗: status='failed' + last_error
 *   5. 回 HTTP response 給 Vercel cron (成功 200 / 失敗 500)
 *
 * Monitor (外部) 可 query:
 *   SELECT * FROM cron_heartbeats WHERE updated_at < now() - interval '25 hours';
 *   → 沒更新超過 25 小時的 job = stale、要 alert
 */

import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { NextResponse } from 'next/server'

const MAX_RETRIES = 3
const BACKOFF_MS = [1000, 2000, 4000] // 1s → 2s → 4s

async function writeHeartbeat(
  jobName: string,
  patch: {
    status: 'running' | 'success' | 'failed'
    started_at?: string
    finished_at?: string
    duration_ms?: number
    attempts?: number
    last_error?: string | null
  }
) {
  try {
    const supabase = getSupabaseAdminClient()
    await supabase.from('cron_heartbeats').upsert(
      {
        job_name: jobName,
        updated_at: new Date().toISOString(),
        ...patch,
      },
      { onConflict: 'job_name' }
    )
  } catch (e) {
    // 連 heartbeat 都寫失敗就吞掉、避免 cron handler 本身被 heartbeat 問題炸掉
    logger.error(`[cron:${jobName}] heartbeat write failed`, e)
  }
}

export async function withCronHeartbeat<T>(
  jobName: string,
  handler: () => Promise<T>
): Promise<NextResponse> {
  const startedAt = Date.now()
  const startedAtIso = new Date(startedAt).toISOString()

  await writeHeartbeat(jobName, {
    status: 'running',
    started_at: startedAtIso,
    attempts: 0,
    last_error: null,
  })

  let lastError: unknown = null
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await handler()
      const finishedAt = Date.now()
      await writeHeartbeat(jobName, {
        status: 'success',
        finished_at: new Date(finishedAt).toISOString(),
        duration_ms: finishedAt - startedAt,
        attempts: attempt,
        last_error: null,
      })
      logger.log(`[cron:${jobName}] success on attempt ${attempt}`, {
        duration_ms: finishedAt - startedAt,
      })
      return NextResponse.json({ success: true, attempt, data: result })
    } catch (e) {
      lastError = e
      logger.warn(`[cron:${jobName}] attempt ${attempt} failed`, e)
      if (attempt < MAX_RETRIES) {
        await new Promise(res => setTimeout(res, BACKOFF_MS[attempt - 1]))
      }
    }
  }

  // 全部 retry 失敗
  const finishedAt = Date.now()
  const errMsg = lastError instanceof Error ? lastError.message : String(lastError)
  await writeHeartbeat(jobName, {
    status: 'failed',
    finished_at: new Date(finishedAt).toISOString(),
    duration_ms: finishedAt - startedAt,
    attempts: MAX_RETRIES,
    last_error: errMsg.slice(0, 2000),
  })
  logger.error(`[cron:${jobName}] all ${MAX_RETRIES} attempts failed`, lastError)
  return NextResponse.json({ success: false, error: errMsg }, { status: 500 })
}
