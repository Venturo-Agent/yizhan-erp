import { defineModule } from './_define'

/**
 * @deprecated 2026-05-14 整合進 [[ai_hub]]、不再 register（_registry.ts 移除）
 *
 * 商業上 ai_hub 賣一個 SKU 含 LINE / FB / IG / 收件匣 / AI brain、不再分通路。
 * 既有 caller capability reference（CAPABILITIES.LINE_BOT_*）已批次改寫成 AI_HUB_*。
 * DB 層既有 workspace_features.line_bot row 在 cleanup migration 設成 false（保留可還原）。
 *
 * 保留檔案不 rm（鐵律 #8）、僅作為歷史脈絡 + 回滾參考。
 *
 * 機器人管理 — LINE 官方帳號 AI 機器人
 */
export const LineBotModule = defineModule({
  code: 'line_bot',
  name: '機器人管理',
  description: 'LINE 官方帳號 AI 機器人',
  category: 'premium',
  routes: ['/bot'],
  exposedToHr: true,
  defaultRoles: ['admin', 'manager'],
  // 2026-05-14 拍板：拔 tabs、回歸粗顆粒
  // - read：看對話 / 看設定
  // - write：操作對話（pause / bind customer / send message）
  // - config：設定 LINE OA（channel / token / 代理員工）
  // tabs.conversation/config 跟 module-level 語意重疊、雙吐造成 a89335d4 vs b2222222 seed 不一致 bug
  moduleLevelCapabilities: ['read', 'write', 'config'],
  tabs: [],
})
