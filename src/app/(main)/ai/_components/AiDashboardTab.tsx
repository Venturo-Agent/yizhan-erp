'use client'

/**
 * AI Hub - Dashboard tab
 *
 * AI 控制中心：今日對話統計 / 平台連線狀態 / 快速操作 / 近期活動 / 7 日效能圖
 *
 * 2026-05-15 William 拍板：mock 資料全部移除、等 Phase 2 接執事長 spec v2 真實 API。
 * 目前顯示「資料整合中」placeholder、避免 mock 跟真實狀態混淆。
 */

import { Sparkles } from 'lucide-react'

export function AiDashboardTab() {
  return (
    <div className="p-6">
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="rounded-2xl p-4 bg-morandi-gold/10 mb-4">
          <Sparkles className="w-8 h-8 text-morandi-gold" strokeWidth={1.5} />
        </div>
        <h2 className="text-lg font-semibold text-morandi-primary mb-2">
          AI 控制中心
        </h2>
        <p className="text-sm text-morandi-secondary max-w-md leading-relaxed">
          資料整合中。待接入對話統計 / 平台連線狀態 / AI 回應效能等真實數據後上線。
        </p>
        <p className="text-xs text-morandi-muted mt-3">
          切到「對話管理」分頁可使用多通路收件匣 · 切到「通道設定」可設定 LINE / Facebook / Instagram bot。
        </p>
      </div>
    </div>
  )
}
