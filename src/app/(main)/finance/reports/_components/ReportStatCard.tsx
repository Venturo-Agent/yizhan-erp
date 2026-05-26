'use client'

import { Card, CardContent } from '@/components/ui/card'
import { CurrencyCell } from '@/components/table-cells'

/**
 * 報表共用統計卡 — 樣式比照「收支總覽」(OverviewStatCards)。
 * 2026-05-23 William 拍板：6 個分頁版型統一、原本 5 份重複的 StatCard 收斂成這一份。
 * 跟收支總覽一致：白卡底 + 細邊框 + hover 金色、左標題右數字、不放 icon。
 */
interface ReportStatCardProps {
  title: string
  value: number
  isCurrency?: boolean
  variant?: 'income' | 'expense'
}

export function ReportStatCard({ title, value, isCurrency = false, variant }: ReportStatCardProps) {
  return (
    <Card className="bg-card border-border/60 hover:border-morandi-gold/40 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-morandi-secondary whitespace-nowrap">
            {title}
          </span>
          {isCurrency ? (
            <CurrencyCell
              amount={value}
              variant={variant}
              className="text-xl font-bold tabular-nums"
            />
          ) : (
            <span className="text-xl font-bold text-morandi-primary tabular-nums">{value}</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
