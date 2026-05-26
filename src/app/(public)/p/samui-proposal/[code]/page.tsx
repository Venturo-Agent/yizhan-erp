/**
 * 蘇梅島提案展示頁面
 * 2026-08-29 至 2026-09-03 | 14人包島行程
 */

import { TourProposalHero } from './_components/TourProposalHero'
import { TourProposalItinerary } from './_components/TourProposalItinerary'
import { TourProposalPricing } from './_components/TourProposalPricing'
import { TourProposalDining } from './_components/TourProposalDining'
import { TourProposalActivities } from './_components/TourProposalActivities'

interface PageProps {
  params: Promise<{ code: string }>
}

export default async function SamuiProposalPage({ params }: PageProps) {
  const { code } = await params
  const isPreview = code === 'preview'

  return (
    <div className="min-h-screen bg-background">
      <TourProposalHero />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-20">
        <TourProposalItinerary />
        <TourProposalPricing />
        <TourProposalDining />
        <TourProposalActivities />
      </div>

      <footer className="border-t border-border py-8 text-center">
        <p className="text-sm text-muted-foreground">
          此為 Venturo 客製化行程提案 · 詳細資訊請洽業務人員
        </p>
      </footer>
    </div>
  )
}
