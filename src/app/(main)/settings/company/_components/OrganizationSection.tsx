'use client'

/**
 * 設定 → 組織管理
 *
 * 5/24 William 拍板：**移除品牌管理**。品牌由漫途在租戶創建時設定、租戶不自管；
 *   一開始沒建品牌、之後只能請漫途追加。所以這裡只剩「分公司管理」。
 *
 * API：/api/organization/branches（品牌 API 保留供漫途/租戶管理用、但租戶設定頁不再顯示品牌 CRUD）
 */

import React from 'react'
import { Card } from '@/components/ui/card'
import { Network } from 'lucide-react'
import { BranchesSection } from './BranchesSection'

export function OrganizationSection() {
  return (
    <div className="space-y-4">
      <Card className="rounded-xl shadow-sm border border-border p-4 bg-morandi-container/10">
        <div className="flex items-center gap-3 mb-3">
          <Network className="h-5 w-5 text-morandi-gold" />
          <h2 className="text-base font-semibold">組織管理</h2>
        </div>
        <p className="text-sm text-morandi-secondary">
          管理「分公司」維度。新增第 2 筆後、業務單據（旅遊團 / 訂單 / 請款 / 出納）就會自動冒對應下拉、員工編輯頁也會冒對應勾選。
        </p>
        <p className="text-xs text-morandi-muted mt-2">
          <strong>品牌</strong>由漫途在開通時設定；若需新增品牌請通知漫途追加。
        </p>
      </Card>

      {/* 分公司：5/18 拔掉 nested 部門、回到單純 branches CRUD */}
      <BranchesSection />
    </div>
  )
}
