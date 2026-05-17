/**
 * LINE Bot ERP bridge — 客戶操作
 *
 * 從 erp-bridge.ts 抽出：botEnsureCustomer
 */

import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { filterActive } from '@/lib/data/filter-active'
import type { BotContext, CustomerRow } from '@/types/line.types'
import { assertCanWrite, writeAuditLog, HANDLER } from '@/lib/line/erp-bridge-internal'

// ============================================================================
// 客戶：用 line_user_id 對應 ERP customer
// ============================================================================

/**
 * 找 / 建客戶（用 line_user_id 對應）
 *
 * - 已 link → 直接回
 * - 沒 link → 建一筆新 customer、source='line_bot'、code='LB{timestamp}'
 *
 * 為什麼 code 用 timestamp 而非順序號？
 *   一般 customer 編號要 list-all 算 max、demo 不想 race condition / N+1。
 *   bot 建的客戶清楚標 source='line_bot'、之後客服可手動改 code。
 */
export async function botEnsureCustomer(ctx: BotContext): Promise<CustomerRow> {
  assertCanWrite(ctx, 'botEnsureCustomer')

  const supabase = getSupabaseAdminClient()

  // 1. 先用 line_user_id + workspace_id 找
  const { data: existing, error: findErr } = await filterActive(
    supabase
      .from('customers')
      .select('*')
      .eq('workspace_id', ctx.workspaceId)
      .eq('line_user_id', ctx.lineUserId)
  ).maybeSingle()

  if (findErr) {
    logger.error(`${HANDLER}: lookup customer by line_user_id failed`, findErr, {
      workspaceId: ctx.workspaceId,
    })
    throw findErr
  }

  if (existing) {
    return existing as CustomerRow
  }

  // 2. 建新 customer
  const now = new Date()
  const id = crypto.randomUUID()
  const code = `LB${now.getTime().toString(36).toUpperCase()}`
  const displayName = ctx.lineDisplayName?.trim() || 'LINE 客戶'

  const insertPayload = {
    id,
    workspace_id: ctx.workspaceId,
    code,
    name: displayName,
    line_user_id: ctx.lineUserId,
    linked_at: now.toISOString(),
    linked_method: 'line_bot_auto',
    source: 'line_bot',
    member_type: 'potential', // CHECK constraint: ['potential', 'member', 'vip']；LINE 新訪客預設「潛在客戶」
    is_active: true,
    created_by: ctx.botEmployeeId, // FK → employees.id
    updated_by: ctx.botEmployeeId,
  } satisfies Partial<CustomerRow> & { id: string; code: string; name: string; workspace_id: string }

  const { data: created, error: createErr } = await supabase
    .from('customers')
    .insert(insertPayload)
    .select('*')
    .single()

  if (createErr || !created) {
    logger.error(`${HANDLER}: create customer failed`, createErr, {
      workspaceId: ctx.workspaceId,
    })
    throw createErr ?? new Error('create customer returned no row')
  }

  await writeAuditLog(ctx, {
    action: 'create',
    entity_type: 'customers',
    entity_id: created.id,
    after: created,
    reason: `LINE Bot 自動建客戶（line_user=${ctx.lineUserId}）`,
  })

  return created as CustomerRow
}
