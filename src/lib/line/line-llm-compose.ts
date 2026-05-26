/**
 * LINE Bot LLM 組答邏輯
 *
 * 從原 handler.ts 抽出：composeReply / buildKbContext / composeReplyFallback
 */

import { isOpenRouterConfigured } from '@/lib/llm/openrouter-client'
import { dispatchLLM } from '@/lib/ai/llm-dispatcher'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { filterActive } from '@/lib/data/filter-active'
import { logger } from '@/lib/utils/logger'
import { searchKnowledgeByKeywords, buildRagBlock } from '@/lib/rag/keyword-search'
import { getCompanyName } from '@/lib/ai/get-company-name'
import { getTaipeiToday, normalizeDatesInText } from '@/lib/line/date-normalizer'
import {
  sendPaymentLinkTool,
  executeSendPaymentLink,
  type SendPaymentLinkArgs,
} from '@/lib/ai/tools/send-payment-link'
import type { BotContext, LLMChatMessage, LineMessageRow, TourSummary } from '@/types/line.types'
import type { MemoryJson } from '@/lib/ai/memory-summarizer'
import type { SupabaseClient } from '@supabase/supabase-js'

const HANDLER = 'line-llm-compose'

// ============================================================================
// types
// ============================================================================

export interface ComposeArgs {
  ctx: BotContext
  userText: string
  history: LineMessageRow[]
  tours: TourSummary[]
  customerName: string | null
  /** inbox conversation id（給速記卡 lookup 用、handler 傳進來、可省） */
  conversationId?: string | null
}

// ============================================================================
// system prompt
// ============================================================================

// 業務 SOP（William 2026-05-19 拍板）：
//   - ${COMPANY_NAME}身份（不是中性 AI）、有對話節奏（歸納→確認→收人數→留電話轉專人）
//   - 不要說「我做不到」、改成「請我們專人協助」
//   - 不要自己算星期幾、code 已在 user 訊息中預處理（10/17 → 10/17（星期六））
//
// ⚠️ 簡體字大忌：MiniMax 國產家、預設可能吐簡體、開頭 + 末尾雙重強調「台灣繁體」。
const SYSTEM_PROMPT = `【語言鐵律】回應只准用台灣繁體中文（zh-TW、台灣慣用詞）、禁止簡體字、禁止中國大陸用語。

你是「\${COMPANY_NAME}」的 LINE 客服 AI。你不是通用聊天 bot、你代表的是\${COMPANY_NAME}這家公司。

【LINE 排版鐵律】LINE 不支援 markdown、所有 ** 粗體 / # 標題 / [link] 都會變字面亂碼。絕對禁止：
- 不要用 ** 包字（粗體）
- 不要用 * 開頭（列表）
- 不要用 # 開頭（標題）
- 不要用 \` 包字 / [文字](連結)
分項用換行 + 短橫線「-」或數字「1.」即可。Emoji 最多 1-2 個、不要每行都加。

【對話節奏 SOP】
情境 A — 客人問題零散、需求模糊：
  不要一次塞所有資訊。主動幫他歸納成 2-3 個方向、用列表問「您是要 A、B 還是 C？」、等他選一個再往下。

情境 B — 客人需求明確（地區 + 大概期程已知）：
  給專業建議 + 知識庫片段內容（若有）。
  主動補：「客製化需要一些時間、實際報價要看您決定的人數和等級。」
  引導他提供人數和大概日期。

情境 C — 客人還很不確定：
  給「大概範圍 + 方向」、不要硬給具體價格。
  明確聲明：「這只是參考、實際以最後人數為主。」
  繼續引導、不要急著推給真人。

情境 D — 客人想報價 / 預訂 / 進入下一步：
  絕對禁止這些語氣：
    ✗「抱歉、我沒辦法報價」
    ✗「我沒有 XX 資料」
    ✗「我無法 X」「我不能 X」「我做不到 X」
    ✗ 推給「業務同事」「客服」「真人」這種抽象稱呼
  正確語氣：
    ✓「我先跟您確認幾個資訊、我們團隊就能算大概範圍給您」
    ✓「我請我們\${COMPANY_NAME}的顧問幫您估、能不能留個電話？方便聯繫時間？」
    ✓ 主動問：人數、大概出發日期、預算範圍、住宿等級偏好
  收到電話 + 方便時間 = 任務完成、自然感謝客人。

範例對話（請完全模仿這個節奏）：
  客人：「幫我報價、大概多少錢？」
  ✗ 錯誤：「抱歉、我沒辦法報價、我沒有即時資料、要請業務同事估」
  ✓ 正確：「好的、我先跟您確認幾個資訊、就能幫您算範圍：
            1. 大概幾位？
            2. 出發日期大概？
            3. 預算範圍？
            這些給我之後、我請我們\${COMPANY_NAME}的顧問幫您試算、能不能留個電話跟方便聯繫的時間？」

【絕對禁止】（重複強調、LLM 很容易犯）
- ✗ 不說「沒辦法」「沒有辦法」「不行」「做不到」「我無法」「我不能」這類字眼
- ✗ 不說「我沒有 XX 資料 / 即時資料 / 完整資料」（會讓客人覺得 AI 沒用）
- ✗ 不用「業務同事」「真人客服」這種抽象稱呼、必須說「我們\${COMPANY_NAME}的顧問」
- ✗ 不自己算「X 月 X 日是星期幾」— code 已在 user 訊息中補好「（星期 X）」、直接用
- ✗ 不用 markdown 語法
- ✗ 不 hallucinate 具體價格 / 確切日期

【若收到「漫途旅遊知識庫」片段】優先用片段內容回答；片段沒涵蓋的不要編造、引導客人提供更多資訊「這部分要請我們\${COMPANY_NAME}的顧問幫您確認」。

【再次提醒】整段回應必須是台灣繁體中文、發現自己快寫簡體立即改成繁體。常見對應：国→國、设→設、网→網、这→這、来→來、对→對、时→時、后→後。`

// ============================================================================
// public API
// ============================================================================

export async function composeReply(args: ComposeArgs): Promise<string> {
  const { ctx, userText: rawUserText, history, tours, customerName, conversationId } = args

  // 日期 normalizer（William 2026-05-19 拍板）：
  //   LLM 算「X 月 X 日是星期幾」很容易翻車（沒日曆、硬算 mod 7）。
  //   code 在 user 訊息進 LLM 前抓 date pattern + 算星期幾 + 替換、LLM 直接讀。
  const today = getTaipeiToday()
  const userText = normalizeDatesInText(rawUserText, today.isoDate)
  const todayBlock = `【今日時間】今天是 ${today.formatted}。客人提到的日期若沒帶年份預設今年；user 訊息中的（星期 X）是 code 自動補的、直接用、不要再算。`

  // 速記卡（rolling summary memory、William 2026-05-18 拍板）：
  // 每對話累積 20 則訊息、AI 自己重寫一張速記卡（人物畫像 / 偏好 / 避忌 / 已聊過的事）。
  // 注入 system prompt 當長期記憶、補 50 則 history 也涵蓋不到的更早 context（如「不吃螃蟹」）。
  const memoryBlock = conversationId
    ? await fetchMemoryBlock(ctx.workspaceId, conversationId)
    : null

  // RAG keyword 檢索（William 2026-05-19 拍板、Phase 1 不接 embedding 先 keyword）：
  // 從客戶最新訊息抽地區 / 國家 / 客群 / 季節 / 風格、SQL ILIKE + jsonb tag 篩 knowledge_chunks。
  // miss 全空 → 不注入、走純對話；命中 → 把片段組成 system prompt 給 LLM 參考。
  let ragBlock: string | null = null
  try {
    const matches = await searchKnowledgeByKeywords({
      workspaceId: ctx.workspaceId,
      userText,
      limit: 5,
    })
    ragBlock = buildRagBlock(matches)
    if (ragBlock) {
      logger.info(`${HANDLER}: rag matched`, {
        workspaceId: ctx.workspaceId,
        matchCount: matches.length,
        regions: [...new Set(matches.map(m => m.region))],
      })
    }
  } catch (err) {
    // RAG 失敗不擋對話、走純 LLM
    logger.warn(`${HANDLER}: rag search failed (ignored)`, { err })
  }

  // MiniMax-M2 不接受多個連續 system messages（會回 "invalid params, invalid chat setting"）。
  // 合併成單一 system message、用分隔線區隔不同段落。
  // OpenAI / Anthropic 接受多個 system、之後若改 provider 可改回多條。
  // 2026-05-22 William 拍板：動態填 workspace 名稱、不再 hardcoded「角落旅遊」
  // 優先讀 workspace_ai_settings.prompt_template、有就用；沒有用通用 template
  const companyName = await getCompanyName(ctx.workspaceId)
  const filledSystemPrompt = SYSTEM_PROMPT.replace(/\$\{COMPANY_NAME\}/g, companyName)
  const systemParts: string[] = [filledSystemPrompt, todayBlock]
  if (customerName) systemParts.push(`客戶顯示名：${customerName}`)
  if (memoryBlock) systemParts.push(memoryBlock)
  if (ragBlock) systemParts.push(ragBlock)

  const messages: LLMChatMessage[] = [
    { role: 'system', content: systemParts.join('\n\n═══════════════════\n\n') },
    // William 2026-05-17 拍板改 50 條、long context 給 LLM 記得久（MiniMax-M2 context window 夠）
    ...history.slice(-50).map(m => ({
      role: (m.direction === 'inbound' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.content ?? '',
    })),
    { role: 'user', content: userText },
  ]

  // dispatchLLM 內部會查 workspace_ai_settings、依該 workspace 設的 provider call
  // （minimax / anthropic / openrouter）、沒設定才 fallback platform OPENROUTER_API_KEY
  const llmRes = await dispatchLLM({
    messages,
    workspaceId: ctx.workspaceId,
    temperature: 0.3,
    caller: 'line-llm-compose',
    tools: [sendPaymentLinkTool],
  })

  // 全部 provider 都不通（連 fallback 也沒）→ 純規則 fallback
  if (!llmRes.ok && !isOpenRouterConfigured()) {
    return composeReplyFallback(userText, tours)
  }

  if (!llmRes.ok) {
    logger.warn(`${HANDLER}: LLM call failed, fallback`, {
      workspaceId: ctx.workspaceId,
      error: llmRes.error,
    })
    return composeReplyFallback(userText, tours)
  }

  // tool_use 處理（AI 判斷該收錢、call send_payment_link）
  // 跟 ai-brain 同樣邏輯、LINE 也支援
  let toolAppendix = ''
  if (llmRes.toolCalls && llmRes.toolCalls.length > 0) {
    for (const call of llmRes.toolCalls) {
      if (call.function.name === 'send_payment_link') {
        let toolArgs: SendPaymentLinkArgs
        try {
          toolArgs = JSON.parse(call.function.arguments) as SendPaymentLinkArgs
        } catch {
          toolArgs = { amount: 0 }
        }
        const result = await executeSendPaymentLink(toolArgs, {
          workspaceId: ctx.workspaceId,
          conversationId: conversationId ?? undefined,
        })
        if (result.ok) {
          const absoluteLink = result.payment_link // 永豐刷卡頁絕對網址、直接用
          const days = Math.ceil(
            (new Date(result.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          )
          toolAppendix +=
            (toolAppendix ? '\n\n' : '\n\n') +
            `💳 付款連結（${result.amount.toLocaleString()}、有效 ${days} 天）：\n${absoluteLink}`
        } else {
          toolAppendix +=
            (toolAppendix ? '\n\n' : '\n\n') +
            `⚠️ 付款連結產生失敗：${result.error ?? '請稍後再試'}`
        }
      }
    }
  }

  const finalText = `${llmRes.content.trim()}${toolAppendix}`.trim()
  if (!finalText) {
    return composeReplyFallback(userText, tours)
  }
  return stripMarkdownForLine(finalText)
}

/**
 * LINE 不 render markdown、把 LLM 可能吐出的 markdown 語法在送出前砍掉。
 *
 * 為什麼用 post-process 而非只靠 prompt：
 *   prompt 約束不是 100% 保證（MiniMax 有時忽略）、加 code 層 strip 雙保險。
 *
 * 不動：
 *   - emoji（客戶喜歡）
 *   - 換行 / 短橫線「-」/ 數字列表（這些 LINE 顯示正常）
 *   - 全形符號（「」『』等）
 */
function stripMarkdownForLine(text: string): string {
  return (
    text
      // **bold** → bold（最常見、必砍）
      .replace(/\*\*(.+?)\*\*/g, '$1')
      // __bold__ → bold
      .replace(/__(.+?)__/g, '$1')
      // *italic* → italic（但不動句首 * 列表符 / 已被前一條砍的粗體殘留）
      // 用 lookbehind 避開列表項：星號前不能是行首 / 空白
      .replace(/(?<=\S)\*([^*\n]+?)\*(?=\S|$)/g, '$1')
      // # heading → heading
      .replace(/^#{1,6}\s+/gm, '')
      // [link](url) → link
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // `inline code` → inline code
      .replace(/`([^`\n]+)`/g, '$1')
      // ```code block``` 整段保留內容、移除 fence
      .replace(/```[a-z]*\n?([\s\S]*?)```/g, '$1')
      // 連續 3 個以上換行壓縮成 2 個
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  )
}

// ============================================================================
// private helpers
// ============================================================================

interface MemoryRow {
  memory_json: MemoryJson | null
  last_summarized_at: string | null
}

/**
 * 查速記卡、組成 system prompt 用的 memory block。
 * 沒卡 / 卡空 / 查失敗 → null（不阻塞、不報 warning）。
 */
async function fetchMemoryBlock(
  workspaceId: string,
  conversationId: string
): Promise<string | null> {
  try {
    const supabase = getSupabaseAdminClient() as unknown as SupabaseClient
    const memoryQuery = supabase
      .from('customer_memories')
      .select('memory_json, last_summarized_at')
      .eq('conversation_id', conversationId)
      .eq('workspace_id', workspaceId)
    const { data: memory } = await filterActive(memoryQuery).maybeSingle<MemoryRow>()

    if (!memory?.memory_json) return null
    const m = memory.memory_json
    const lines: string[] = []

    if (m.summary_text) lines.push(`📋 ${m.summary_text}`)

    if (m.preferences?.avoid && m.preferences.avoid.length > 0) {
      lines.push(`⚠️ 客戶明確不要 / 避忌：${m.preferences.avoid.join('、')}`)
    }
    if (m.preferences?.budget_range) lines.push(`💰 預算：${m.preferences.budget_range}`)
    if (m.preferences?.destinations && m.preferences.destinations.length > 0) {
      lines.push(`✈️ 想去：${m.preferences.destinations.join('、')}`)
    }
    if (m.preferences?.special_needs && m.preferences.special_needs.length > 0) {
      lines.push(`🔍 特殊需求：${m.preferences.special_needs.join('、')}`)
    }
    if (m.history?.rejected && m.history.rejected.length > 0) {
      const rej = m.history.rejected.map(r => `${r.tour}（${r.reason}）`).join('、')
      lines.push(`🚫 已拒絕過的團：${rej}`)
    }
    if (m.history?.interested && m.history.interested.length > 0) {
      lines.push(`👍 感興趣的團：${m.history.interested.join('、')}`)
    }

    if (lines.length === 0) return null
    return `【客戶速記卡】（上次更新：${memory.last_summarized_at ?? '剛建立'}）\n${lines.join('\n')}\n\n（請依速記卡認識客戶、回覆時尊重 avoid 清單、不要重複問已知資訊）`
  } catch (error) {
    logger.debug('fetchMemoryBlock failed (ignored)', { error })
    return null
  }
}

function buildKbContext(tours: TourSummary[], customerName: string | null): string {
  const parts: string[] = []
  if (customerName) {
    parts.push(`客戶顯示名：${customerName}`)
  }
  if (tours.length === 0) {
    parts.push('KB 結果：（沒查到符合日期的團、請引導客戶換日期或聯繫真人）')
  } else {
    parts.push('KB 結果（符合條件的團、請從這裡推薦）：')
    for (const t of tours) {
      const price =
        t.selling_price_per_person != null
          ? `${Number(t.selling_price_per_person).toLocaleString('en-US')} / 人`
          : '價格洽詢'
      const seats =
        t.max_participants != null
          ? `${t.current_participants ?? 0}/${t.max_participants}`
          : `${t.current_participants ?? 0}`
      parts.push(
        `- [${t.code}] ${t.name}｜出發 ${t.departure_date ?? '-'}｜${t.days_count ?? '-'} 天｜${price}｜人數 ${seats}`
      )
    }
  }
  return parts.join('\n')
}

/**
 * Fallback 訊息：LLM call 整條鏈都失敗時的 safety net。
 *
 * 設計（2026-05-17 William 拍板「徹底修復」）：
 *   - 訊息必須**明顯標示是異常 fallback**、不要假裝是正常 AI 回答（避免客戶以為這就是「AI 服務」）
 *   - 不再強行引導「給日期」（會把客戶推回死板客服 SOP 印象）
 *   - 中性、誠實、引導客戶等真人接手
 */
export function composeReplyFallback(userText: string, tours: TourSummary[]): string {
  // tours 推薦保留（這條至少是「真實資料」、不假）
  if (tours.length > 0) {
    const lines = tours.slice(0, 5).map(t => {
      const price =
        t.selling_price_per_person != null
          ? `${Number(t.selling_price_per_person).toLocaleString('en-US')} / 人`
          : '價格洽詢'
      return `・${t.name}｜${t.departure_date ?? '-'}｜${price}`
    })
    return `（⚠️ AI 服務暫時無回應、以下是相近行程：）\n${lines.join('\n')}\n\n稍候真人客服會接手 🙏`
  }

  // 純 fallback：誠實標明、不假裝
  return '⚠️ AI 服務暫時無回應、客服已收到訊息、稍後會由真人接手回覆您 🙏'
}
