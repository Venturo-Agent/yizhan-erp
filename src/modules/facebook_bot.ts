import { defineModule } from './_define'

/**
 * @deprecated 2026-05-14 整合進 [[ai_hub]]、不再 register
 *
 * 商業上 ai_hub 賣一個 SKU 含 LINE / FB / IG / 收件匣 / AI brain、不再分通路。
 * 既有 caller capability reference（CAPABILITIES.FACEBOOK_BOT_*）已批次改寫成 AI_HUB_*。
 * 保留檔案不 rm（鐵律 #8）、僅作為歷史脈絡 + 回滾參考。
 *
 * Facebook Messenger 整合（Token 加密表 workspace_facebook_settings 仍使用、不動）。
 */
export const FacebookBotModule = defineModule({
  code: 'facebook_bot',
  name: 'Facebook Messenger',
  description: 'FB Page Messenger AI 對話 + 自動建單',
  category: 'premium',
  routes: ['/bot/facebook-setup'],
  exposedToHr: true,
  defaultRoles: ['admin', 'manager'],
  // 2026-05-14 拍板：拔 tabs、回歸粗顆粒（同 line_bot 設計）
  moduleLevelCapabilities: ['read', 'write', 'config'],
  tabs: [],
})
