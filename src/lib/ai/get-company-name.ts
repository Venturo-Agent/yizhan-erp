/**
 * Get Company Name — workspace 自家公司名稱（用於 LLM prompt 動態填入）
 *
 * 2026-05-22 William 拍板：line-llm-compose / ai-brain / memory-summarizer
 * 過去 hardcoded「角落旅遊」、多租戶 SaaS 致命 bug。
 * 此 helper 統一從 workspaces.name 動態讀、所有 prompt 用 ${companyName} 替換。
 *
 * 設計：
 *   - 沒設定 / 找不到 → fallback「我們公司」
 *   - in-memory cache 1 分鐘（避免每次 LLM call 都查 DB）
 */

import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

const FALLBACK_NAME = '我們公司'
const CACHE_TTL_MS = 60_000 // 1 分鐘

const cache = new Map<string, { name: string; expiresAt: number }>()

export async function getCompanyName(workspaceId: string): Promise<string> {
  if (!workspaceId) return FALLBACK_NAME

  // cache hit
  const cached = cache.get(workspaceId)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.name
  }

  try {
    const supabase = getSupabaseAdminClient()
    const { data, error } = await supabase
      .from('workspaces')
      .select('name')
      .eq('id', workspaceId)
      .maybeSingle()

    if (error) {
      logger.warn('getCompanyName: query failed', { workspaceId, err: error.message })
      return FALLBACK_NAME
    }

    const name = data?.name?.trim() || FALLBACK_NAME
    cache.set(workspaceId, { name, expiresAt: Date.now() + CACHE_TTL_MS })
    return name
  } catch (err) {
    logger.warn('getCompanyName: unexpected error', { workspaceId, err })
    return FALLBACK_NAME
  }
}
