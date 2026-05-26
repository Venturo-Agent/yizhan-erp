/**
 * 取得或建立 workspace 的 system bot role。
 *
 * 走 supabase admin client，因為是 setup 流程（無使用者 session）。
 * 每個 workspace 有自己的 system bot role（is_system_bot = true），
 * 而非跨 workspace hardcode 同一個 UUID（違反鐵律 #9）。
 */

import { getSupabaseAdminClient } from '@/lib/supabase/admin'

export async function getOrCreateSystemBotRole(workspaceId: string): Promise<string> {
  const supabase = getSupabaseAdminClient()

  // 先查 workspace 內是否已有 system bot role
  const { data: existing } = await supabase
    .from('workspace_roles')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('is_system_bot', true)
    .single()

  if (existing) return existing.id

  // 沒有就建（只在 setup pipeline 跑，不是 hot path）
  const { data: created, error } = await supabase
    .from('workspace_roles')
    .insert({
      workspace_id: workspaceId,
      name: 'System Bot',
      is_system_bot: true,
    })
    .select('id')
    .single()

  if (error || !created) {
    throw new Error(
      `Failed to create system bot role for workspace ${workspaceId}: ${error?.message}`
    )
  }

  return created.id
}
