/**
 * LINE Bot domain types
 *
 * 卡片：[[03-LINE-Bot-第一階段]]
 *
 * Schema 對齊（2026-05-10）：
 *   - DB 沒有 sailings / cabins / cruise_lines / sailing_agencies 表
 *   - 實際對應 ERP 既有 schema：tours / customers / orders
 *   - 「sailing」術語在程式碼裡用 `tour` 對齊 schema、避免命名混亂
 *
 * 這份只放 LINE Bot 邏輯需要的「精簡視圖」、不重複 src/lib/supabase/types.ts
 * 的完整 row schema。需要完整 schema 時直接用 Database['public']['Tables']['xxx']['Row']。
 */
import type { Database } from '@/lib/supabase/types'

// ============================================================================
// DB row 別名（從 generated types 取、保持單一真相）
// ============================================================================

export type CustomerRow = Database['public']['Tables']['customers']['Row']
export type TourRow = Database['public']['Tables']['tours']['Row']
export type OrderRow = Database['public']['Tables']['orders']['Row']
export type LineMessageRow = Database['public']['Tables']['line_conversation_messages']['Row']

// ============================================================================
// LINE 對話訊息方向 / 角色
// ============================================================================

export type LineMessageDirection = 'inbound' | 'outbound'

/**
 * sender 欄位語意（line_conversation_messages.sender）：
 *   - 'customer' = 客戶（inbound）
 *   - 'bot'      = LINE Bot 自動回（outbound）
 *   - 'employee' = 真人接管（outbound、phase 2）
 */
export type LineMessageSender = 'customer' | 'bot' | 'employee'

// ============================================================================
// Bot Context（每次處理 event 時傳入、強制 workspace 隔離）
// ============================================================================

export interface BotContext {
  /** 從 webhook router 反查 workspace_line_settings 拿到的 workspace_id */
  workspaceId: string

  /**
   * workspace 級的「LINE Bot 系統」員工 id
   * 從 workspace_line_settings.bot_employee_id 來
   * 沒設 = bot 還沒被自助開通完成、不能寫任何 ERP entity
   */
  botEmployeeId: string | null

  /** workspace.code（給 audit_log reason 用、純資訊） */
  workspaceCode?: string

  /** 對話對象的 LINE user id（U + 32 hex） */
  lineUserId: string

  /** LINE 顯示名稱（profile API 拿、可選） */
  lineDisplayName?: string | null

  /** 該 workspace 的 channel_access_token（reply 用、跟 secret 一樣 per-workspace） */
  channelAccessToken: string
}

// ============================================================================
// Tour 搜尋（對應 KB「search_sailings ±N 天」、實際走 tours 表）
// ============================================================================

export interface TourSearchFilters {
  /** 目標日期 (YYYY-MM-DD)、會搜尋 ±daysBefore / ±daysAfter */
  targetDate: string
  /** 預設 7 */
  daysBefore?: number
  /** 預設 7 */
  daysAfter?: number
  /** 模糊搜尋團名（可選） */
  nameKeyword?: string
  /** 限制城市 / airport_code（可選） */
  airportCode?: string
  /** 預設 20、上限 50（避免 LLM context 爆） */
  limit?: number
}

/** 給 LLM / bot 看的精簡 tour 視圖（不要把 100 個欄位丟進 prompt） */
export interface TourSummary {
  id: string
  code: string
  name: string
  departure_date: string | null
  return_date: string | null
  days_count: number | null
  location: string | null
  airport_code: string | null
  selling_price_per_person: number | null
  current_participants: number | null
  max_participants: number | null
  status: string
  is_active: boolean
}

// ============================================================================
// 建單 input（從 bot 對話收集出來、傳給 botCreateOrder）
// ============================================================================

export interface BotCreateOrderInput {
  /** 哪個團（tour_id）、bot 必先確認過 */
  tourId: string
  /** 顯示用團名（snapshot、避免 tour 改名後 order 顯示亂） */
  tourName: string

  /** 客戶 id（用 botEnsureCustomer 拿、不准信任 LLM 隨便丟 id） */
  customerId: string
  /** 聯絡人姓名 */
  contactPerson: string
  /** 聯絡人電話（可選但強烈建議） */
  contactPhone?: string | null
  /** 聯絡人 email（可選） */
  contactEmail?: string | null

  /** 出發日（snapshot、跟 tour.departure_date 對齊） */
  departureDate: string | null

  /** 成人數（必填） */
  adultCount: number
  /** 總人數（含兒童 / 嬰兒、bot 算好傳入） */
  memberCount: number
  /** 身份組合明細（成人 X 兒童 X 嬰兒 X、可選）→ orders.identity_options */
  identityOptions?: { adult?: number; child?: number; infant?: number } | null

  /** 總金額（bot 算好傳入、會被 SAFETY 守門） */
  totalAmount: number

  /** 備註（含原始對話摘要） */
  notes?: string | null
}

// ============================================================================
// LLM client types
// ============================================================================

export type LLMRole = 'system' | 'user' | 'assistant' | 'tool'

export interface LLMChatMessage {
  role: LLMRole
  content: string
  /** tool call response 用（OpenAI / OpenRouter 規格） */
  tool_call_id?: string
  /** assistant 發出的 tool calls */
  tool_calls?: LLMToolCall[]
  /** 顯示名（可選） */
  name?: string
}

export interface LLMToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    /** JSON-encoded arguments */
    arguments: string
  }
}

export interface LLMTool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

export interface LLMRequest {
  messages: LLMChatMessage[]
  tools?: LLMTool[]
  /** 預設 'deepseek/deepseek-v3' */
  model?: string
  temperature?: number
  /** 給 OpenRouter 做 cost / usage 標記 */
  workspaceId?: string
  /** 呼叫來源（給 usage tracker 分類）：'ai-brain' / 'memory-summarizer' / 'retrospective-aggregator' / 'attraction-polish' / 'line-llm-compose' 等 */
  caller?: string
}

export interface LLMResponse {
  ok: boolean
  /** assistant 的純文字回覆（如果有） */
  content: string
  /** tool 呼叫（如果有） */
  toolCalls: LLMToolCall[]
  /** 用了哪個 model */
  model: string
  /** 失敗時填 reason、ok=true 時為 null */
  error: string | null
  /** raw usage 資訊（token 統計、給之後 cost tracking） */
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
}
