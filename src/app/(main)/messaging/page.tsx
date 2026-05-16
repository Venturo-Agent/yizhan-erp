import { redirect } from 'next/navigation'

/**
 * /messaging — 已遷移到 /ai?tab=conversations（AI Hub 對話管理 tab）
 *
 * 5/14 William 拍板：/messaging 整合進 AI Hub。原 410 行 UI 邏輯移到
 * src/app/(main)/ai/_components/AiConversationsTab.tsx。
 *
 * 鐵律 #8：保留檔案、不 rm。messaging_inbox feature / capability 暫不 deprecate（向後相容）、
 * Phase 4 才會處理（要 William 拍板）。
 */
export default function MessagingRedirectPage() {
  redirect('/ai?tab=conversations')
}
