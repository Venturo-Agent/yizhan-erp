/**
 * 福岡高爾夫提案展示頁面
 * 2025-10-12 至 2025-10-16 | 16人行程
 * 8人打球 / 8人太太專屬行程
 */

import { FukuokaGolfProposalHero } from './_components/FukuokaGolfProposalHero'
import { FukuokaGolfProposalItinerary } from './_components/FukuokaGolfProposalItinerary'
import { FukuokaGolfProposalHotels } from './_components/FukuokaGolfProposalHotels'
import { FukuokaGolfProposalDining } from './_components/FukuokaGolfProposalDining'

interface PageProps {
  params: Promise<{ code: string }>
}

export default async function FukuokaGolfProposalPage({ params }: PageProps) {
  const { code } = await params
  const isPreview = code === 'preview'

  return (
    <div className="min-h-screen bg-background">
      <FukuokaGolfProposalHero />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-20">
        <FukuokaGolfProposalItinerary />
        <FukuokaGolfProposalHotels />
        <FukuokaGolfProposalDining />
      </div>

      <footer className="border-t border-border py-8 text-center">
        <p className="text-sm text-muted-foreground">
          此為 Venturo 客製化行程提案 · 詳細資訊請洽業務人員
        </p>
      </footer>
    </div>
  )
}
