'use client'

/**
 * /hr/organization — 組織管理（品牌 / 分公司 / 部門）
 *
 * 為什麼放 /hr 底下：員工的所屬分公司 / 部門是人資範疇、進 /hr/organization 比埋在
 * 「設定 → 公司設定」三層底下直覺。
 *
 * UI 完全 re-use OrganizationSection、不重複實作。
 * Capability 守門：settings.company.read（既有、未來不必另建）
 */

import { Network } from 'lucide-react'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { OrganizationSection } from '@/app/(main)/settings/company/_components/OrganizationSection'

export default function HrOrganizationPage() {
  return (
    <ContentPageLayout
      title="組織管理"
      icon={Network}
    >
      <div className="mb-4 text-sm text-morandi-secondary">
        管理品牌、分公司、部門三層架構。部門必須掛在某個分公司底下。
      </div>
      <OrganizationSection />
    </ContentPageLayout>
  )
}
