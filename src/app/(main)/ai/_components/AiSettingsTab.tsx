'use client'

/**
 * AI Hub - Settings tab
 *
 * Phase 1：純殼、等執事長 spec v2 接 AI prompt / 信心閾值 / 通知設定。
 *
 * 規劃內容（Phase 2）：
 *   - AI 助理 prompt 模板（角色 / 語氣 / 回覆風格）
 *   - 信心閾值（自動建 proposal vs 人工介入）
 *   - 三通路 AI 啟用切換（LINE / FB / IG 個別開關）
 *   - 通知設定（哪些情境推 channel / email）
 *   - AI 自我介紹開關（spec v2 C7）
 */

import { Sparkles } from 'lucide-react'

export function AiSettingsTab() {
  return (
    <div className="p-6">
      <div className="bg-white border border-morandi-muted/20 rounded-2xl p-12 text-center">
        <Sparkles className="w-12 h-12 mx-auto text-morandi-gold/40" strokeWidth={1.5} />
        <h2 className="mt-4 text-lg font-semibold text-morandi-primary">AI 助理設定</h2>
        <p className="mt-2 text-sm text-morandi-secondary max-w-md mx-auto">
          AI prompt / 信心閾值 / 通道啟用 / 通知設定即將推出。
        </p>
        <p className="mt-1 text-xs text-morandi-muted">
          目前 AI 走預設行為、有問題到「對話管理」分頁手動暫停 Bot。
        </p>
      </div>
    </div>
  )
}
