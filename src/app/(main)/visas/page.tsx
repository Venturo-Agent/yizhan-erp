'use client'

import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Card } from '@/components/ui/card'
import { FileText } from 'lucide-react'

/**
 * 簽證代辦 — Placeholder
 *
 * DB schema 已上線（5/20 morning）：
 *   - document_types（證件種類字典、112 rows seed）
 *   - application_service_types（服務種類字典、112 rows seed）
 *   - customer_documents（客戶證件抽屜）
 *   - supplier_pricing（代辦商價目含版本歷史）
 *   - customer_document_applications + history（申辦事件 + 軌跡）
 *
 * UI / API 開發中：
 *   - entity hooks（src/data/entities/visas-*.ts）開發中
 *   - 申辦進度頁、客戶證件抽屜 tab、代辦商價目頁 UI 待補
 *   - API routes 待補
 */
export default function VisasPage() {
  return (
    <ContentPageLayout title="簽證代辦">
      <Card className="p-8 text-center">
        <FileText className="mx-auto mb-4 h-12 w-12 text-morandi-blue-500" />
        <h2 className="mb-2 text-lg font-semibold text-morandi-gray-800">簽證代辦功能準備中</h2>
        <p className="text-sm text-morandi-gray-600">
          DB schema 已上線、UI / API 開發中。
          <br />
          已建立的資料：
        </p>
        <ul className="mx-auto mt-4 max-w-md space-y-1 text-left text-sm text-morandi-gray-700">
          <li>✓ 證件種類字典（14 種：護照、台胞證、各國簽證）</li>
          <li>✓ 服務種類字典（14 種、含一般 / 急件）</li>
          <li>✓ 客戶證件抽屜（待填）</li>
          <li>✓ 代辦商價目（含版本歷史、待填）</li>
          <li>✓ 申辦事件 + 狀態軌跡（待填）</li>
        </ul>
        <p className="mt-6 text-xs text-morandi-gray-500">
          模型設計：客戶證件抽屜 + 申辦事件 + 代辦商價目 三層架構
        </p>
      </Card>
    </ContentPageLayout>
  )
}
