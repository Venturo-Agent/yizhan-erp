/**
 * LINE Bot ERP bridge — 內部共用 helpers
 *
 * 僅供 erp-bridge-*.ts 子模組 import，不對外暴露。
 */

import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import type { BotContext } from '@/types/line.types'

// ============================================================================
// 程式碼層守門參數（由子模組共用）
// ============================================================================

export const SAFETY = {
  MAX_ORDER_AMOUNT: 1_000_000,
  MIN_ORDER_AMOUNT: 100,
  MAX_PARTICIPANTS: 99, // bot 不接 100 人以上的團單、轉真人
  TOUR_SEARCH_HARD_LIMIT: 50,
  RECENT_MESSAGES_HARD_LIMIT: 100,
} as const

export const DEFAULT_TOUR_SEARCH_LIMIT = 20
export const DEFAULT_RECENT_MESSAGES = 30

export const HANDLER = 'line-erp-bridge'

// ============================================================================
// 共用：assert ctx 完整
// ============================================================================

export function assertCanWrite(ctx: BotContext, op: string): void {
  if (!ctx.workspaceId) {
    throw new Error(`[${HANDLER}] missing workspaceId for ${op}`)
  }
  if (!ctx.botEmployeeId) {
    throw new Error(
      `[${HANDLER}] bot_employee_id not set for workspace ${ctx.workspaceId}; ` +
        `setup pipeline 沒跑完、不能 ${op}`
    )
  }
}

export function assertCanRead(ctx: BotContext, op: string): void {
  if (!ctx.workspaceId) {
    throw new Error(`[${HANDLER}] missing workspaceId for ${op}`)
  }
}

// ============================================================================
// audit log helper
// ============================================================================

export interface AuditLogInput {
  action: 'create' | 'update' | 'delete' | 'restore'
  entity_type: string
  entity_id: string
  before?: unknown
  after?: unknown
  reason: string
}

export async function writeAuditLog(ctx: BotContext, input: AuditLogInput): Promise<void> {
  if (!ctx.botEmployeeId) {
    // assertCanWrite 應該擋掉、保險再擋一次
    logger.warn(`${HANDLER}: skip audit log, no bot_employee_id`, {
      workspaceId: ctx.workspaceId,
      action: input.action,
      entity: `${input.entity_type}/${input.entity_id}`,
    })
    return
  }

  const supabase = getSupabaseAdminClient()

  const { error } = await supabase.from('audit_logs').insert({
    workspace_id: ctx.workspaceId,
    actor_id: ctx.botEmployeeId,
    action: input.action,
    entity_type: input.entity_type,
    entity_id: input.entity_id,
    before: (input.before ?? null) as never,
    after: (input.after ?? null) as never,
    reason: input.reason,
  })

  if (error) {
    logger.error(`${HANDLER}: write audit_log failed`, error, {
      workspaceId: ctx.workspaceId,
      entity: `${input.entity_type}/${input.entity_id}`,
    })
    // audit log 寫不進不能讓主流程炸、但要 log 出來給之後對帳
  }
}

// ============================================================================
// utils
// ============================================================================

export function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min
  return Math.max(min, Math.min(max, n))
}
