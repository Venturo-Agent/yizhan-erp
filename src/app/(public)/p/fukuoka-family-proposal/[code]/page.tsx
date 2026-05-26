/**
 * 福岡三代同堂提案頁面
 * 2026-07-07 出發 · 6天5夜 · 8人家族
 */

import { FamilyProposalHero } from './_components/FamilyProposalHero'
import { FamilyProposalItinerary } from './_components/FamilyProposalItinerary'
import { FamilyProposalHotels } from './_components/FamilyProposalHotels'

interface PageProps {
  params: Promise<{ code: string }>
}

export default async function FamilyProposalPage({ params }: PageProps) {
  const { code } = await params

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAF8F5' }}>
      <FamilyProposalHero />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-20">
        <FamilyProposalItinerary />
        <FamilyProposalHotels />
      </div>
      <footer className="border-t py-8 text-center">
        <p className="text-sm text-muted-foreground">此為 Venturo 客製化行程提案</p>
      </footer>
    </div>
  )
}
