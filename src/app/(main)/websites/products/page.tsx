'use client'

/**
 * /websites/products — 產品上架管理
 *
 * Day 1 skeleton：用 ListPageLayout、之後填 tour list + toggle 上架 + 編輯 marketing_*
 * 後續會 reuse 既有 /marketing/website list 樣板（不重複造輪）
 */

import { Globe, Layout as LayoutIcon } from 'lucide-react'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

const BREADCRUMB = [
  { label: '客戶官網', href: '/websites/design' },
  { label: '產品上架', href: '/websites/products' },
]

export default function WebsiteProductsPage() {
  const router = useRouter()

  return (
    <ContentPageLayout title="產品上架" icon={Globe} breadcrumb={BREADCRUMB}>
      <div className="p-6 space-y-4">
        <Card className="p-6 border-0 bg-morandi-container/30">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-morandi-primary mb-1">產品上架管理</h2>
              <p className="text-xs text-morandi-secondary leading-relaxed">
                挑選哪些行程要展示到客戶官網（{'{subdomain}.venturo.tw'}）、編輯行銷文案 / SEO / 封面圖。
                <br />
                Day 7 落地、會 reuse 既有 /marketing/website 樣板。
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/websites/design')}
            >
              <LayoutIcon className="w-4 h-4 mr-1.5" />
              切到版面設計
            </Button>
          </div>
        </Card>

        <Card className="p-8 text-center border-0 bg-morandi-container/20">
          <p className="text-sm text-morandi-muted">
            Day 1 skeleton
            <br />
            <span className="text-xs">tour list + toggle 上架 + 編輯詳情 → Day 7 落地</span>
          </p>
        </Card>
      </div>
    </ContentPageLayout>
  )
}
