import { defineModule } from './_define'

/**
 * @deprecated 2026-05-14 整合進 [[ai_hub]]、不再 register
 *
 * 商業上 ai_hub 賣一個 SKU 含 LINE / FB / IG / 收件匣 / AI brain、不再分通路。
 * 既有 caller capability reference（CAPABILITIES.INSTAGRAM_BOT_*）已批次改寫成 AI_HUB_*。
 * 保留檔案不 rm（鐵律 #8）、僅作為歷史脈絡 + 回滾參考。
 *
 * Instagram DM 整合（settings 表 workspace_instagram_settings 仍使用、不動）。
 */
export const InstagramBotModule = defineModule({
  code: 'instagram_bot',
  name: 'Instagram DM',
  description: 'IG Business Account DM AI 對話',
  category: 'premium',
  routes: ['/bot/instagram-setup'],
  exposedToHr: true,
  defaultRoles: ['admin', 'manager'],
  // 2026-05-14 拍板：拔 tabs、回歸粗顆粒（同 line_bot 設計）
  moduleLevelCapabilities: ['read', 'write', 'config'],
  tabs: [],
})
