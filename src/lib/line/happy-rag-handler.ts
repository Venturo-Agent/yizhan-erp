/**
 * HAPPY RAG handler — LINE bot `/happy` prefix 觸發的 ERP 知識庫問答
 *
 * 2026-05-22 Phase 0 Day 2（William 拍板）
 *
 * 流程：
 *   1. 偵測訊息開頭 `/happy `（在 line-handler.ts 處理）
 *   2. 抽 query（去掉 prefix）
 *   3. 從 query 抽 keywords、查 knowledge_chunks ILIKE
 *   4. 把 top-N chunks 組 system context
 *   5. call LLM、限定「依 chunks 回答、不知道就說不知道、不要編」
 *   6. reply LINE
 *
 * RAG 簡易策略（不用 embeddings）：
 *   - 抽 query 中的有意義 token（過濾停用詞）
 *   - SELECT chunks WHERE workspace_id=漫途 AND metadata->>'source'='erp-system' AND content ILIKE ANY(tokens)
 *   - 按命中 token 數排序、取 top 8
 *
 * 未來升級：
 *   - 加 embeddings（已預留 embedding column）
 *   - 加 sender 員工偵測、自動進 RAG mode（不靠 /happy prefix）
 */

import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { callLLM, isOpenRouterConfigured } from '@/lib/llm/openrouter-client'
import { logger } from '@/lib/utils/logger'

const HANDLER = 'happy-rag'
const HAPPY_PREFIX = '/happy '
const PLATFORM_WORKSPACE_ID = 'b2222222-2222-2222-2222-222222222222' // 漫途整合行銷

interface HappyResult {
  replyText: string
  chunksUsed: number
  llmUsed: boolean
  debugReason?: string
}

/**
 * 判斷訊息是否為 HAPPY query
 */
export function isHappyQuery(text: string): boolean {
  return text.trim().toLowerCase().startsWith(HAPPY_PREFIX)
}

/**
 * 抽 query body（去掉 /happy prefix）
 */
function extractQuery(text: string): string {
  return text.trim().slice(HAPPY_PREFIX.length).trim()
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
 * 主入口
 */
export async function handleHappyQuery(userText: string): Promise<HappyResult> {
  const query = extractQuery(userText)

  if (!query) {
    return {
      replyText: '嗨！我是 HAPPY、一棧 ERP 系統助手。請在 /happy 後面加上你的問題，譬如：\n\n/happy 怎麼請款\n/happy 怎麼新增客戶\n/happy 月結了怎麼辦',
      chunksUsed: 0,
      llmUsed: false,
      debugReason: 'empty query',
    }
  }

  logger.info(`${HANDLER}: query`, { query: query.slice(0, 100) })

  // RAG 查 chunks
  const chunks = await searchKnowledgeChunks(query)
  const ragContext = formatRagContext(chunks)

  // 沒有 OpenRouter API key → fallback 純 RAG 回覆（直接給 chunks）
  if (!isOpenRouterConfigured()) {
    const fallback = chunks.length === 0
      ? '抱歉、我的知識庫沒找到相關資料、請問漫途同事吧。'
      : `我從知識庫找到這些可能相關的段落：\n\n${chunks
          .slice(0, 3)
          .map((c, i) => `${i + 1}. [${c.title}]\n${c.content.slice(0, 300)}...`)
          .join('\n\n')}\n\n（提示：尚未設 OPENROUTER_API_KEY、無法 LLM 統整）`
    return {
      replyText: fallback,
      chunksUsed: chunks.length,
      llmUsed: false,
      debugReason: 'OPENROUTER_API_KEY missing',
    }
  }

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

  const llmResult = await callLLM({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query },
    ],
    temperature: 0.3,
    caller: 'happy-rag',
    workspaceId: PLATFORM_WORKSPACE_ID,
  })

  if (!llmResult.ok) {
    return {
      replyText: `LLM 服務暫時無法回覆：${llmResult.error ?? 'unknown'}`,
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
