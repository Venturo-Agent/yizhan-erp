'use client'

/**
 * TourPage - 行程展示頁面（Luxury 風格）
 * 未來若要支援多風格、改走 Style Registry 機制（非 hardcode dispatch）
 */

import { useState } from 'react'
import { useTourScrollEffects } from '@/app/(main)/tours/_hooks/useTourScrollEffects'
import { useTourItineraryNav } from '@/app/(main)/tours/_hooks/useTourItineraryNav'
import { TourHeroLuxury } from './sections/TourHeroLuxury'
import { TourFlightSection } from './sections/TourFlightSection'
import { TourFeaturesSectionLuxury } from './sections/TourFeaturesSectionLuxury'
import { TourItinerarySectionLuxury } from './sections/TourItinerarySectionLuxury'
import { TourLeaderSectionLuxury } from './sections/TourLeaderSectionLuxury'
import { TourHotelsSectionLuxury } from './sections/TourHotelsSectionLuxury'
import { TourPricingSectionLuxury } from './sections/TourPricingSectionLuxury'
import { TourPriceTiersSectionLuxury } from './sections/TourPriceTiersSectionLuxury'
import { TourFAQSection } from './sections/TourFAQSection'
import { TourNoticesSection } from './sections/TourNoticesSection'
import { TourNavigation } from './sections/TourNavigation'
import { useCompanyInfo } from '@/hooks/useCompanyInfo'
import type { TourPageProps } from '@/app/(main)/tours/_types/tour-display.types'

export default function TourPage({ data, isPreview = false, viewMode = 'desktop' }: TourPageProps) {
  const dailyItinerary = Array.isArray(data.dailyItinerary) ? data.dailyItinerary : []
  const [companyLogoUrl] = useState<string | null>(null)
  const { legalName: companyName, subtitle: companySubtitle } = useCompanyInfo()

  const { scrollOpacity } = useTourScrollEffects({ viewMode, isPreview })
  const { activeDayIndex, dayRefs, handleDayNavigate } = useTourItineraryNav(dailyItinerary)

  return (
    <div className={viewMode === 'mobile' ? 'min-h-screen bg-muted' : 'min-h-screen bg-card'}>
      <TourNavigation
        data={data}
        scrollOpacity={scrollOpacity}
        isPreview={isPreview}
        viewMode={viewMode}
      />

      <div id="top">
        <TourHeroLuxury data={data} viewMode={viewMode} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-t border-border"></div>
      </div>

      <div id="flight">
        <TourFlightSection data={data} viewMode={viewMode} />
      </div>

      {data.showFeatures !== false && (data.features?.length ?? 0) > 0 && (
        <>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="border-t border-border"></div>
          </div>

          <div id="features">
            <TourFeaturesSectionLuxury data={data} viewMode={viewMode} />
          </div>

          {viewMode !== 'mobile' && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="border-t border-border"></div>
            </div>
          )}
        </>
      )}

      <div id="itinerary">
        <TourItinerarySectionLuxury
          data={data}
          viewMode={viewMode}
          activeDayIndex={activeDayIndex}
          dayRefs={dayRefs}
          handleDayNavigate={handleDayNavigate}
        />
      </div>

      {(data.leader?.name ||
        data.leader?.domesticPhone ||
        data.leader?.overseasPhone ||
        data.meetingInfo?.time ||
        data.meetingInfo?.location ||
        (data.meetingPoints &&
          data.meetingPoints.some(
            (p: { time?: string; location?: string }) => p.time || p.location
          ))) && (
        <>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="border-t border-border"></div>
          </div>
          <div id="leader">
            <TourLeaderSectionLuxury data={data} viewMode={viewMode} />
          </div>
        </>
      )}

      {data.showHotels !== false && data.hotels && data.hotels.length > 0 && (
        <>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="border-t border-border"></div>
          </div>
          <div id="hotels">
            <TourHotelsSectionLuxury data={data} viewMode={viewMode} />
          </div>
        </>
      )}

      {data.showPriceTiers && data.priceTiers && data.priceTiers.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-t border-border"></div>
        </div>
      )}
      <div id="price-tiers">
        <TourPriceTiersSectionLuxury data={data} viewMode={viewMode} />
      </div>

      {data.showPricingDetails && data.pricingDetails && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-t border-border"></div>
        </div>
      )}
      <div id="pricing">
        <TourPricingSectionLuxury data={data} viewMode={viewMode} />
      </div>

      {data.showFaqs && data.faqs && data.faqs.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-t border-border"></div>
        </div>
      )}
      <div id="faq">
        <TourFAQSection data={data} viewMode={viewMode} />
      </div>

      {((data.showNotices && data.notices && data.notices.length > 0) ||
        (data.showCancellationPolicy &&
          data.cancellationPolicy &&
          data.cancellationPolicy.length > 0)) && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-t border-border"></div>
        </div>
      )}
      <div id="notices">
        <TourNoticesSection data={data} viewMode={viewMode} />
      </div>

      <footer className="bg-morandi-primary py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center mb-3">
              {companyLogoUrl ? (
                <img
                  src={companyLogoUrl}
                  alt="Company Logo"
                  className={`w-auto object-contain ${viewMode === 'mobile' ? 'h-6' : 'h-8'}`}
                />
              ) : (
                <h3
                  className={`font-bold text-morandi-gold ${viewMode === 'mobile' ? 'text-lg' : 'text-2xl'}`}
                >
                  {companyName}
                </h3>
              )}
            </div>
            <p className="text-morandi-secondary mb-6 text-sm">{companySubtitle}</p>
            <p className="text-morandi-secondary text-xs">
              © {new Date().getFullYear()} {companyName}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
