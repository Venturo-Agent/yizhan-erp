'use client'

import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { FileText } from 'lucide-react'

export function DocumentsPage() {
  return (
    <ContentPageLayout
      title="文件中心"
      icon={FileText}
    >
      <div className="p-4 text-muted-foreground">文件功能建置中...</div>
    </ContentPageLayout>
  )
}
