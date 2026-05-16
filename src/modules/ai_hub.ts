import { defineModule } from './_define'

/**
 * AI Hub — AI 整合平台
 *
 * 對應：
 * - 路由：/ai
 * - capability：ai_hub.{read,write}
 * - tabs：UI 層 3 個（dashboard / conversations / settings）、capability 不分 tab
 * - category：premium（對應執事長 spec v2 NT$3000/月 ai_integration umbrella）
 *
 * 功能：
 * - dashboard：AI 控制中心（4 統計卡 + 平台狀態 + 活動 feed + 7 日效能圖）
 * - conversations：多通路對話收件匣（合併原 /messaging）+ AI 摘要面板
 * - settings：AI 助理 prompt / 信心閾值設定（Phase 2 細化）
 *
 * 紀律：
 * - 跟 messaging_inbox 2026-05-14 拍板方向一致、走粗顆粒 module-level read/write
 * - UI tab 不對應 capability tab、避免 5/14 messaging_inbox 踩過的「tab capability 死碼」坑
 * - 真正 AI logic（intent 分級 / proposal 開團 / 估價 / 自動建單）由執事長 spec v2 接、
 *   此 module 只負責 UI 殼 + 路由 + feature gate
 */
export const AiHubModule = defineModule({
  code: 'ai_hub',
  name: 'AI Hub',
  description: 'AI 整合平台 — 多通路對話統一收件匣 + AI 助理 + 對話分析',
  category: 'premium',
  routes: ['/ai'],
  exposedToHr: true,
  defaultRoles: ['admin', 'manager'],
  moduleLevelCapabilities: ['read', 'write'],
  tabs: [],
})
