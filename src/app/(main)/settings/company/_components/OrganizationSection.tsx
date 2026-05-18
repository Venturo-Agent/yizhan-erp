'use client'

/**
 * 設定 → 組織管理
 *
 * 兩個 section：品牌管理 / 分公司管理
 *
 * UI 規則（對應 01-架構決定.md 第十三節 + 第八節）：
 *   - 該維度只有 1 筆 placeholder（is_default=true）→ 該 section 折疊、預設藏
 *     用戶要管理就點「我要管理 X」展開
 *   - 該維度有 2+ 筆 → 該 section 預設展開、可 CRUD
 *
 * API：/api/organization/{brands,branches}
 */

import React from 'react'
import { Card } from '@/components/ui/card'
import { Building2, Network, Plus } from 'lucide-react'
import { DimensionSection } from './DimensionSection'
import { BranchesSection } from './BranchesSection'

const SECTIONS: Array<{
  table: 'brands' | 'branches'
  label: string
  singular: string
  icon: React.ComponentType<{ className?: string }>
  /** 5/15 William 拍板：分公司「新增」按鈕用 Building icon、其他用 Plus */
  actionIcon: React.ComponentType<{ className?: string }>
  apiPath: string
  emptyTip: string
}> = [
  {
    table: 'brands',
    label: '品牌管理',
    singular: '品牌',
    icon: Building2,
    actionIcon: Plus,
    apiPath: '/api/organization/brands',
    emptyTip: '目前只有 1 個預設品牌（建立租戶時系統自動建）。新增第 2 個後業務單據會自動冒「品牌」欄位。',
  },
]

export function OrganizationSection() {
  return (
    <div className="space-y-4">
      <Card className="rounded-xl shadow-sm border border-border p-4 bg-morandi-container/10">
        <div className="flex items-center gap-3 mb-3">
          <Network className="h-5 w-5 text-morandi-gold" />
          <h2 className="text-base font-semibold">組織管理</h2>
        </div>
        <p className="text-sm text-morandi-secondary">
          管理「品牌 / 分公司」兩個維度。某維度只要新增第 2 筆、業務單據（旅遊團 / 訂單 / 請款 / 出納）就會自動冒對應下拉、員工編輯頁也會冒對應勾選。
        </p>
        <p className="text-xs text-morandi-muted mt-2">
          <strong>規則：</strong>
          該維度只有 1 筆 placeholder 時、UI 預設折疊；點開新增第 2 筆後就自動展開、業務頁面也會跟著冒欄位。
        </p>
      </Card>

      {/* 品牌：原通用 DimensionSection */}
      {SECTIONS.map(section => (
        <DimensionSection key={section.table} config={section} />
      ))}

      {/* 分公司：5/18 拔掉 nested 部門、回到單純 branches CRUD（之後 nested 重設計） */}
      <BranchesSection />
    </div>
  )
}
