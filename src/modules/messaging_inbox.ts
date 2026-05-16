import { defineModule } from './_define'

/**
 * @deprecated 2026-05-14 整合進 [[ai_hub]]、不再 register
 *
 * 商業上 ai_hub 賣一個 SKU 含 LINE / FB / IG / 收件匣 / AI brain、不再分通路。
 * 既有 caller capability reference（CAPABILITIES.MESSAGING_INBOX_*）已批次改寫成 AI_HUB_*。
 * 保留檔案不 rm（鐵律 #8）、僅作為歷史脈絡 + 回滾參考。
 *
 * 多通路對話收件匣 — 已搬到 /ai?tab=conversations。
 */
export const MessagingInboxModule = defineModule({
  code: 'messaging_inbox',
  name: '對話收件匣',
  description: 'FB / IG / LINE 多通路對話統一檢視',
  category: 'premium',
  routes: ['/messaging'],
  exposedToHr: true,
  defaultRoles: ['admin', 'manager'],
  // 2026-05-14 拍板：拔 tabs、回歸粗顆粒
  // tabs.conversations 跟 module-level read/write 語意重疊、雙吐造成 messaging_inbox.conversations.read 死碼
  moduleLevelCapabilities: ['read', 'write'],
  tabs: [],
})
