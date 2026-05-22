/**
 * HAPPY RAG handler — 漫途 LINE@ 員工專用 ERP 知識庫問答
 *
 * 2026-05-22 Phase 0（William 拍板）
 *
 * 路由：line-handler.ts 偵測 ctx.workspaceId === PLATFORM_WORKSPACE_ID 直接 call 本 handler
 * 漫途 LINE@ = 員工專用、全部訊息當 ERP 問題處理（不用 /happy 前綴）
 * 角落 / 其他 LINE@ = 客戶旅遊客服 flow（不動）
 *
 * 流程：
 *   1. 收到員工原始問題（已過 prefix detection、不再去 prefix）
 *   2. 從問題抽 keywords、查 knowledge_chunks ILIKE
 *   3. 把 top-N chunks 組 system context
 *   4. call LLM、限定「依 chunks 回答、不知道就說不知道、不要編」
 *   5. reply LINE
 *
 * RAG 簡易策略（不用 embeddings）：
 *   - 抽 query 中的有意義 token（過濾停用詞）
 *   - SELECT chunks WHERE workspace_id=漫途 AND metadata->>'source'='erp-system' AND content ILIKE ANY(tokens)
 *   - 按命中 token 數排序、取 top 8
 *
 * 未來升級：
 *   - 加 embeddings（已預留 embedding column）
 *   - 補 user-facing how-to docs（非開發者向、業務白話）
 */

import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { dispatchLLM } from '@/lib/ai/llm-dispatcher'
import { logger } from '@/lib/utils/logger'

const HANDLER = 'happy-rag'
export const PLATFORM_WORKSPACE_ID = 'b2222222-2222-2222-2222-222222222222' // 漫途整合行銷

interface HappyResult {
  replyText: string
  chunksUsed: number
  llmUsed: boolean
  debugReason?: string
}

/**
 * 判斷該 workspace 是否走 HAPPY ERP 員工模式
 * （漫途 LINE@ 走、其他客戶用 LINE@ 走原本旅遊客服 flow）
 */
export function isHappyWorkspace(workspaceId: string): boolean {
  return workspaceId === PLATFORM_WORKSPACE_ID
}

/**
 * 簡單 keyword 抽取（中文按字元、英文按 token、過濾太短的）
 */
function extractKeywords(query: string): string[] {
  // 抽中文詞（2 字元起）+ 英文 token + 數字
  const chineseWords = query.match(/[一-鿿]{2,}/g) ?? []
  const englishWords = query.match(/[a-zA-Z]{3,}/g) ?? []
  const numbers = query.match(/\d{2,}/g) ?? []
  const all = [...chineseWords, ...englishWords, ...numbers]
  // dedupe + 限定最多 5 個 keyword（防 SQL 太長）
  return Array.from(new Set(all)).slice(0, 5)
}

/**
 * RAG 查 chunks
 */
async function searchKnowledgeChunks(query: string, limit = 8): Promise<
  Array<{ content: string; source_file: string; title: string }>
> {
  const keywords = extractKeywords(query)
  if (keywords.length === 0) return []

  const supabase = getSupabaseAdminClient()

  // 用 `or` 拼多個 ILIKE 條件
  const orClause = keywords.map(k => `content.ilike.%${k}%`).join(',')

  const { data, error } = await supabase
    .from('knowledge_chunks')
    .select('content, metadata, document_id, knowledge_documents!inner(title, source_file)')
    .eq('workspace_id', PLATFORM_WORKSPACE_ID)
    .eq('metadata->>source', 'erp-system')
    .or(orClause)
    .limit(limit)

  if (error) {
    logger.warn(`${HANDLER}: search chunks failed`, { err: error.message, keywords })
    return []
  }

  return (data ?? []).map(row => ({
    content: row.content,
    source_file:
      (row as { knowledge_documents?: { source_file?: string } }).knowledge_documents?.source_file ?? 'unknown',
    title: (row as { knowledge_documents?: { title?: string } }).knowledge_documents?.title ?? 'unknown',
  }))
}

/**
 * 組 RAG context block
 */
function formatRagContext(chunks: Array<{ content: string; source_file: string; title: string }>): string {
  if (chunks.length === 0) {
    return '【知識庫無相關資料】\n（員工問題可能超出 HAPPY 目前知識範圍）'
  }
  const blocks = chunks.map((c, i) => {
    return `[來源 ${i + 1}: ${c.title}]
${c.content}
---`
  })
  return `【一棧 ERP 系統知識庫 — 相關段落（${chunks.length} 筆）】\n\n${blocks.join('\n')}`
}

/**
 * 主入口 — 對員工原始問題做 RAG 回答
 */
export async function handleHappyQuery(userText: string): Promise<HappyResult> {
  const query = userText.trim()

  if (!query) {
    return {
      replyText: '嗨！我是 HAPPY、一棧 ERP 系統助手 🙋\n\n你可以直接問我，譬如：\n• 怎麼新增客戶\n• 怎麼開新團\n• 收款流程怎麼走\n• 月底要做什麼',
      chunksUsed: 0,
      llmUsed: false,
      debugReason: 'empty query',
    }
  }

  logger.info(`${HANDLER}: query`, { query: query.slice(0, 100) })

  // RAG 查 chunks
  const chunks = await searchKnowledgeChunks(query)
  const ragContext = formatRagContext(chunks)

  // 組 LLM messages
  const systemPrompt = `你是 HAPPY、一棧 ERP（旅遊團 SaaS）系統 AI 助手。

【你的個性】
- 友善、業務白話、不寫 code 細節
- 對員工說話、不對客戶

【嚴格規矩】
- 只根據下方「知識庫段落」回答、不知道就說「這個我不確定、請問你的主管或漫途團隊」、不要編
- 用繁體中文 + 台灣商務用語
- 引用知識庫時、可標 [來源: 檔名]
- 簡潔（最多 200 字）、可以用條列

${ragContext}`

  // dispatchLLM 會依漫途 workspace_ai_settings.provider 自動 call MiniMax / Anthropic / OpenRouter
  // 漫途已設 MiniMax-M2、所以這裡會走 MiniMax
  const llmResult = await dispatchLLM({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query },
    ],
    temperature: 0.3,
    caller: 'happy-rag',
    workspaceId: PLATFORM_WORKSPACE_ID,
  })

  if (!llmResult.ok) {
    // LLM 失敗 → fallback 給 raw chunks（仍比沒回覆好）
    if (chunks.length > 0) {
      const rawFallback = `（LLM 暫時無法統整、直接給你知識庫段落）\n\n${chunks
        .slice(0, 3)
        .map((c, i) => `${i + 1}. [${c.title}]\n${c.content.slice(0, 300)}...`)
        .join('\n\n')}`
      return {
        replyText: rawFallback,
        chunksUsed: chunks.length,
        llmUsed: false,
        debugReason: llmResult.error ?? undefined,
      }
    }
    return {
      replyText: `抱歉、AI 服務暫時無法回覆。錯誤：${llmResult.error ?? 'unknown'}`,
      chunksUsed: chunks.length,
      llmUsed: false,
      debugReason: llmResult.error ?? undefined,
    }
  }

  return {
    replyText: llmResult.content || '（LLM 回覆為空）',
    chunksUsed: chunks.length,
    llmUsed: true,
  }
}
