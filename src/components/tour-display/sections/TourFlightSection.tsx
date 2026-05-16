'use client'

/**
 * TourFlightSection - 航班區塊（入口點、實際渲染交給統一元件）
 *
 * @see TourFlightSectionUnified - 統一實作
 * @see @/app/(main)/tours/_themes - 主題系統
 */

import { TourFlightSectionUnified } from './flight/TourFlightSectionUnified'
import type { TourPageData, CoverStyleType } from '@/app/(main)/tours/_types/tour-display.types'

interface TourFlightSectionProps {
  data: TourPageData
  viewMode: 'desktop' | 'mobile'
  coverStyle?: CoverStyleType
}

/**
 * 航班區塊主組件 - 委託給統一元件處理
 */
export function TourFlightSection({ data, viewMode }: TourFlightSectionProps) {
  return <TourFlightSectionUnified data={data} viewMode={viewMode} />
}
