import { redirect } from 'next/navigation'

/**
 * /bot — 已遷移到 /ai?tab=conversations（AI Hub 對話管理 tab）
 *
 * 5/14 William 拍板：/bot 跟 /messaging 全部整合進 AI Hub。
 * 原 LINE Bot 對話列表邏輯整合到 /api/messaging/conversations（read-side 已 unified、
 * 從 inbox_conversations + line_user_profiles synthetic 合成）。
 *
 * 鐵律 #8：保留檔案、不 rm。Edit 改 redirect 即可。
 * Phase 4 才會處理 /bot/_components dead code 清理（要 William 拍板）。
 */
export default function BotRedirectPage() {
  redirect('/ai?tab=conversations')
}
