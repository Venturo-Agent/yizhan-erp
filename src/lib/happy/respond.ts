/**
 * HAPPY 機器人回應邏輯（Phase 1 skeleton）
 *
 * 由 /api/channels/messages POST 在 bot 頻道寫入員工訊息後直接呼叫。
 * 不走 HTTP endpoint、不需要 internal key。
 *
 * 安全設計：
 *   - workspaceId / agentId 由 caller 從 DB channel record 取出（服務端）、不信任 client
 *   - HAPPY 唯讀：只能 SELECT、不能對業務表做任何 INSERT / UPDATE / DELETE
 *   - workspace_id 在所有 DB 查詢中強制帶入、AI 無法跨租戶存取
 *
 * Phase 2（LLM 決定後）：在此接入 tool use + LLM 呼叫
 */

import { getSupabaseAdminClient } from '@/lib/supabase/admin'

interface HappyRespondArgs {
  channelId: string
  workspaceId: string // 服務端注入、不可偽造
  agentId: string
  triggerMessageBody: string
}

export async function happyRespond({
  channelId,
  workspaceId,
  agentId,
  triggerMessageBody: _triggerMessageBody,
}: HappyRespondArgs): Promise<void> {
  const admin = getSupabaseAdminClient()

  // 確認 agent 存在且 active（workspace 隔離雙重確認）
  const { data: agent } = await admin
    .from('ai_agents')
    .select('id, status, capabilities')
    .eq('id', agentId)
    .eq('workspace_id', workspaceId)
    .eq('status', 'active')
    .maybeSingle()

  if (!agent) return // agent 停用或不在此 workspace

  // Phase 2：在此接入 LLM 呼叫 + tool use
  //   - tool 查詢一律帶 workspace_id（server-side 注入）
  //   - 可查詢範圍由 agent.capabilities.data_sources 決定
  //   - LLM model / key 確定後再實作
  //
  // Phase 1：暫不插入 HAPPY 回應（避免假訊息污染頻道）
  void channelId // Phase 2 寫入時用
}
