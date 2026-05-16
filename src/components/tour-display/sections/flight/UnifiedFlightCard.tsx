'use client'

import { getTheme, type TourStyle } from '@/app/(main)/tours/_themes'
import type { FlightInfo } from '@/types/flight.types'
import { parseFlightDate } from './variants/flight-card-utils'
import { OriginalFlightCard } from './variants/OriginalFlightCard'
import { LuxuryFlightCard } from './variants/LuxuryFlightCard'
import { ArtFlightCard } from './variants/ArtFlightCard'
import { DreamscapeFlightCard } from './variants/DreamscapeFlightCard'
import { CollageFlightCard } from './variants/CollageFlightCard'
import { NatureFlightCard } from './variants/NatureFlightCard'

// ============================================
// 統一航班卡片元件（dispatcher）
// ============================================

interface UnifiedFlightCardProps {
  flight: FlightInfo
  type: 'outbound' | 'return'
  style: TourStyle
  isMobile?: boolean
  /** 目的地圖片 URL（japanese 風格用）*/
  destinationImage?: string | null
}

export function UnifiedFlightCard({
  flight,
  type,
  style,
  isMobile = false,
}: UnifiedFlightCardProps) {
  const theme = getTheme(style)
  const dateInfo = parseFlightDate(flight.departureDate)
  const _isOutbound = type === 'outbound'

  const variantProps = { flight, type, theme, isMobile, dateInfo }

  // 根據風格選擇渲染方式
  switch (style) {
    case 'art':
      return <ArtFlightCard {...variantProps} />
    case 'luxury':
      return <LuxuryFlightCard {...variantProps} />
    case 'dreamscape':
      return <DreamscapeFlightCard {...variantProps} />
    case 'collage':
      return <CollageFlightCard {...variantProps} />
    case 'nature':
      return <NatureFlightCard {...variantProps} />
    default:
      return <OriginalFlightCard {...variantProps} />
  }
}
