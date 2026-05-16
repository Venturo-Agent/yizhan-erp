'use client'

import { ContentContainer } from '@/components/layout/content-container'

const COMPONENT_LABELS = {
  TITLE: '旅遊團損益表',
  COMING_SOON: '此報表開發中，敬請期待',
} as const

export function TourPnlTab() {
  return (
    <ContentContainer>
      <div className="flex items-center justify-center min-h-[300px] text-morandi-secondary">
        <div className="text-center">
          <p className="text-lg font-medium mb-2">{COMPONENT_LABELS.TITLE}</p>
          <p className="text-sm">{COMPONENT_LABELS.COMING_SOON}</p>
        </div>
      </div>
    </ContentContainer>
  )
}
