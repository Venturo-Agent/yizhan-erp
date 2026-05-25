'use client'

import type { ComponentType } from 'react'

/**
 * 報表共用明細小標題 — 樣式比照「收支總覽」明細區的「交易明細」那行。
 * 2026-05-23 William 拍板：明細標題直接接表格、不再包大卡框。
 * icon + text-xs 小標、跟收支總覽完全一致。
 */
interface ReportSectionTitleProps {
  icon: ComponentType<{ className?: string }>
  title: string
}

export function ReportSectionTitle({ icon: Icon, title }: ReportSectionTitleProps) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <Icon className="h-3.5 w-3.5 text-morandi-primary" />
      <h3 className="text-xs font-semibold text-morandi-primary">{title}</h3>
    </div>
  )
}
