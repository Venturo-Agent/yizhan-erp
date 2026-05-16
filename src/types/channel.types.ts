/**
 * Channel 系統型別定義
 * spec: ~/Obsidian/Logan-Workspace/2026-05-12-channel-system-spec-v0.md
 */

export type ChannelType =
  | 'announcement'    // 公告（人發、限 channels.announcement.write、其他人 reply）
  | 'system_notice'   // 系統通知（個人化 recipient_employee_id 過濾）
  | 'bot'             // 機器人頻道（HAPPY 等、agent_id 連 ai_agents）
  | 'dm'              // 1on1 私訊（含員工↔員工、員工↔AI agent）
  | 'blank'           // 空白群組
  | 'project'         // 團專案頻道（綁 tour_id）

export type ChannelMemberRole = 'owner' | 'member'

export type MessageType =
  | 'text'             // 一般文字訊息
  | 'card'             // 結構化卡片
  | 'system'           // 系統訊息
  | 'action_result'    // 業務動作結果（v2 才會用、欄位先留）

export interface Channel {
  id: string
  workspace_id: string
  type: ChannelType
  tour_id: string | null  // tours.id 是 text、所以是 string
  agent_id: string | null  // DM channel 對話對象是 AI agent 時設（員工↔HAPPY DM）
  name: string | null
  description: string | null
  created_by: string | null
  is_system: boolean
  is_archived: boolean
  archived_at: string | null
  created_at: string
  updated_at: string
  // 5/13 William 拍板：三類官方頻道 + 發言守門
  is_official: boolean // 公司級別、員工自動 enroll、不可主動建
  post_permission: string // 'all' / 'capability:X'（公告類限發、reply 留言不限）
}

export type AgentScope = 'internal' | 'external'

export interface AiAgent {
  id: string
  workspace_id: string
  code: string
  name: string
  avatar_url: string | null
  description: string | null
  scope: AgentScope
  capabilities: Record<string, unknown>
  status: 'active' | 'disabled'
  created_at: string
  updated_at: string
}

export interface ChannelMember {
  id: string
  channel_id: string
  employee_id: string
  role: ChannelMemberRole
  joined_at: string
  last_read_at: string | null
}

export interface ChannelMessage {
  id: string
  channel_id: string
  sender_employee_id: string | null
  sender_agent_id: string | null
  body: string | null
  message_type: MessageType
  payload: Record<string, unknown> | null
  reply_to_id: string | null
  reply_count: number
  last_reply_at: string | null
  scheduled_at: string | null
  is_pinned: boolean
  reactions: Record<string, unknown>
  attachments: string[] | Record<string, unknown>[]
  is_active: boolean
  revoked_at: string | null
  created_at: string
  edited_at: string | null
  // 5/13 William 拍板：系統通知個人化收件人（NULL = 公開、NOT NULL = 個人）
  recipient_employee_id: string | null
}
