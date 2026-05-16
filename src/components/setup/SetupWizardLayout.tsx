'use client'

/**
 * SetupWizardLayout — 通用 setup 嚮導頁面外殼
 *
 * 2026-05-15 修：不再 wrap ContentPageLayout（之前會跟 AI Hub 主 ContentPageLayout 嵌套、
 * 兩個 header 重疊覆蓋住「AI Hub」標題）。現在只提供 sub-header + max-width content wrapper。
 *
 * caller（LineSetup / FacebookSetup / InstagramSetup）在 AI Hub setup tab 內、
 * 上層已經有「通路：LINE / FB / IG」sub-tab 顯示當前頻道、這個 sub-header 補小 title。
 *
 * 用法：
 *   <SetupWizardLayout title="LINE Bot 整合" icon={Bot}>
 *     <StepIndicator ... />
 *     <Card>...</Card>
 *   </SetupWizardLayout>
 */

import React from 'react'
import type { LucideIcon } from 'lucide-react'

export function SetupWizardLayout({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: LucideIcon
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col h-full">
      {/* 小 sub-header（不蓋 AI Hub 主標題、只標示當前 setup 流程名稱） */}
      <div className="shrink-0 px-6 py-3 border-b border-morandi-muted/20 bg-white flex items-center gap-2">
        <Icon className="w-4 h-4 text-morandi-gold" strokeWidth={1.5} />
        <h2 className="text-sm font-semibold text-morandi-primary">{title}</h2>
      </div>
      {/* 內容區、保留 max-width 限制 */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto p-6 space-y-6">{children}</div>
      </div>
    </div>
  )
}
