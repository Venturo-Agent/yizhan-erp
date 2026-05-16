import { redirect } from 'next/navigation'

/**
 * /bot/[lineUserId] — 已遷移到 /ai?tab=conversations（AI Hub 對話管理 tab）
 *
 * 5/14 William 拍板：/bot 全整合進 AI Hub。
 *
 * 注意：原本 detail 頁有 LINE userId 相關功能（BindCustomerDialog / CustomerInfoSidebar）、
 * 這次先不移植、Phase 4 把 detail panel 整合進 conversations tab 時一起做。
 *
 * lineUserId 參數在 redirect 時丟失、員工會看到完整對話列表、自己點該客戶。
 *
 * 鐵律 #8：保留檔案 + _components 子目錄、不 rm。
 */
export default function BotUserDetailRedirectPage() {
  redirect('/ai?tab=conversations')
}
