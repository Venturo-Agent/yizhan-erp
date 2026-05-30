'use client'
/**
 * PrintableQuotation - 團體報價單列印版
 */

import React, { useMemo } from 'react'
import { ParticipantCounts, SellingPrices } from '../../../_types'
import { PrintableWrapper } from '@/lib/print'
import { QuotationInfo } from './QuotationInfo'
import { QuotationPricingTable } from './QuotationPricingTable'
import { QuotationInclusions } from './QuotationInclusions'
import { Quote } from '@/types/models.types'
import { getPreviewDailyData } from '@/app/(main)/tours/_components/itinerary-editor/format-itinerary'
import { MORANDI_COLORS } from '@/lib/print'
import type { Itinerary } from '@/stores/types'
import type { FlightInfo } from '@/types/flight.types'

interface TierPricingForPrint {
  participant_count: number
  selling_prices: {
    adult: number
    child_with_bed: number
    child_no_bed: number
    single_room: number
    infant: number
  }
}

interface PrintableQuotationProps {
  quote: Quote
  quoteName: string
  participantCounts: ParticipantCounts
  sellingPrices: SellingPrices
  categories: unknown[]
  totalCost: number
  isOpen: boolean
  onClose: () => void
  onPrint: () => void
  accommodationSummary?: unknown[]
  tierLabel?: string
  tierPricings?: TierPricingForPrint[]
  itinerary?: Itinerary | null
  departureDate?: string | null
  excludedItems?: string[]
  insuranceText?: string
}

export const PrintableQuotation: React.FC<PrintableQuotationProps> = ({
  quote,
  quoteName,
  participantCounts,
  sellingPrices,
  isOpen,
  onClose,
  onPrint,
  tierLabel,
  tierPricings = [],
  itinerary,
  departureDate,
  excludedItems,
  insuranceText,
}) => {
  const totalParticipants =
    participantCounts.adult +
    participantCounts.child_with_bed +
    participantCounts.child_no_bed +
    participantCounts.single_room +
    participantCounts.infant

  // 行程預覽資料
  const dailyData = useMemo(() => {
    if (!itinerary?.daily_itinerary) return []
    const daily = itinerary.daily_itinerary as unknown as Array<{
      day: number
      route?: string
      title?: string
      meals?: { breakfast?: string; lunch?: string; dinner?: string }
      accommodation?: string
      sameAsPrevious?: boolean
      hotelBreakfast?: boolean
      lunchSelf?: boolean
      dinnerSelf?: boolean
      note?: string
      description?: string
    }>
    const schedule = daily.map((d, i) => ({
      day: d.day || i + 1,
      route: d.route || d.title || '',
      meals: {
        breakfast: d.meals?.breakfast || '',
        lunch: d.meals?.lunch || '',
        dinner: d.meals?.dinner || '',
      },
      accommodation: d.accommodation || '',
      sameAsPrevious: d.sameAsPrevious || false,
      hotelBreakfast: d.hotelBreakfast || false,
      lunchSelf: d.lunchSelf || false,
      dinnerSelf: d.dinnerSelf || false,
      note: d.note || d.description || undefined,
    }))
    return getPreviewDailyData(schedule, departureDate || itinerary.departure_date || null)
  }, [itinerary, departureDate])

  const outboundFlights = useMemo(() => {
    if (!itinerary?.outbound_flight) return []
    const f = itinerary.outbound_flight
    return (Array.isArray(f) ? f : [f]) as FlightInfo[]
  }, [itinerary])

  const returnFlights = useMemo(() => {
    if (!itinerary?.return_flight) return []
    const f = itinerary.return_flight
    return (Array.isArray(f) ? f : [f]) as FlightInfo[]
  }, [itinerary])

  const allFlights = useMemo(() => {
    return [
      ...outboundFlights.filter(f => f.flightNumber),
      ...returnFlights.filter(f => f.flightNumber),
    ]
  }, [outboundFlights, returnFlights])

  return (
    <PrintableWrapper
      isOpen={isOpen}
      onClose={onClose}
      onPrint={onPrint}
      title={'旅遊報價單'}
      subtitle="QUOTATION"
    >
      <QuotationInfo
        quoteName={quoteName}
        totalParticipants={totalParticipants}
        validUntil={quote?.valid_until ?? undefined}
        tierLabel={tierLabel}
      />

      {/* 簡易行程表 */}
      {dailyData.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'separate',
              borderSpacing: 0,
              fontSize: '12px',
              borderRadius: '8px',
              overflow: 'hidden',
              border: `1px solid ${MORANDI_COLORS.border}`,
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    padding: '6px 8px',
                    textAlign: 'center',
                    fontWeight: 600,
                    color: 'white',
                    backgroundColor: MORANDI_COLORS.gold,
                    width: '50px',
                  }}
                >
                  {'天數'}
                </th>
                <th
                  style={{
                    padding: '6px 8px',
                    textAlign: 'left',
                    fontWeight: 600,
                    color: 'white',
                    backgroundColor: MORANDI_COLORS.gold,
                  }}
                >
                  {'行程內容'}
                </th>
              </tr>
            </thead>
            <tbody>
              {dailyData.map((day, idx) => (
                <React.Fragment key={idx}>
                  <tr
                    style={{ backgroundColor: idx % 2 === 0 ? 'var(--card)' : 'var(--background)' }}
                  >
                    <td
                      rowSpan={1 + (day.note ? 1 : 0) + 1 + (day.accommodation ? 1 : 0)}
                      style={{
                        padding: '6px 8px',
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        fontWeight: 600,
                        color: MORANDI_COLORS.gold,
                        borderTop: `1px solid ${MORANDI_COLORS.border}`,
                        borderRight: `1px solid ${MORANDI_COLORS.border}`,
                      }}
                    >
                      {day.date || day.dayLabel}
                    </td>
                    <td
                      style={{
                        padding: '6px 8px',
                        fontWeight: 500,
                        borderTop: `1px solid ${MORANDI_COLORS.border}`,
                      }}
                    >
                      {day.title}
                    </td>
                  </tr>
                  {day.note && (
                    <tr
                      style={{
                        backgroundColor: idx % 2 === 0 ? 'var(--card)' : 'var(--background)',
                      }}
                    >
                      <td
                        style={{
                          padding: '4px 8px',
                          color: MORANDI_COLORS.gold,
                          fontSize: '11px',
                          borderTop: `1px solid ${MORANDI_COLORS.border}`,
                        }}
                      >
                        ※{day.note}
                      </td>
                    </tr>
                  )}
                  <tr
                    style={{ backgroundColor: idx % 2 === 0 ? 'var(--card)' : 'var(--background)' }}
                  >
                    <td
                      style={{ padding: '4px 0', borderTop: `1px solid ${MORANDI_COLORS.border}` }}
                    >
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr 1fr',
                          fontSize: '11px',
                        }}
                      >
                        <div style={{ padding: '0 8px' }}>
                          <span style={{ fontWeight: 600, color: MORANDI_COLORS.lightGray }}>
                            {'早餐'}{' '}
                          </span>
                          {day.meals.breakfast || 'X'}
                        </div>
                        <div
                          style={{
                            padding: '0 8px',
                            borderLeft: `1px solid ${MORANDI_COLORS.border}`,
                          }}
                        >
                          <span style={{ fontWeight: 600, color: MORANDI_COLORS.lightGray }}>
                            {'午餐'}{' '}
                          </span>
                          {day.meals.lunch || 'X'}
                        </div>
                        <div
                          style={{
                            padding: '0 8px',
                            borderLeft: `1px solid ${MORANDI_COLORS.border}`,
                          }}
                        >
                          <span style={{ fontWeight: 600, color: MORANDI_COLORS.lightGray }}>
                            {'晚餐'}{' '}
                          </span>
                          {day.meals.dinner || 'X'}
                        </div>
                      </div>
                    </td>
                  </tr>
                  {day.accommodation && (
                    <tr
                      style={{
                        backgroundColor: idx % 2 === 0 ? 'var(--card)' : 'var(--background)',
                      }}
                    >
                      <td
                        style={{
                          padding: '4px 8px',
                          fontSize: '11px',
                          borderTop: `1px solid ${MORANDI_COLORS.border}`,
                        }}
                      >
                        <span style={{ fontWeight: 600, color: MORANDI_COLORS.lightGray }}>
                          {'住宿'}{' '}
                        </span>
                        {day.accommodation}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>

          {/* 參考航班 */}
          {allFlights.length > 0 && (
            <table
              style={{
                width: '100%',
                borderCollapse: 'separate',
                borderSpacing: 0,
                fontSize: '12px',
                borderRadius: '8px',
                overflow: 'hidden',
                border: `1px solid ${MORANDI_COLORS.border}`,
                marginTop: '12px',
              }}
            >
              <thead>
                <tr>
                  <th
                    colSpan={5}
                    style={{
                      padding: '6px 8px',
                      textAlign: 'center',
                      fontWeight: 600,
                      color: 'white',
                      backgroundColor: MORANDI_COLORS.gold,
                    }}
                  >
                    {'參考航班'}
                  </th>
                </tr>
                <tr style={{ backgroundColor: MORANDI_COLORS.lightBrown }}>
                  <th
                    style={{
                      padding: '5px 8px',
                      textAlign: 'center',
                      fontWeight: 600,
                      color: MORANDI_COLORS.gray,
                      borderTop: `1px solid ${MORANDI_COLORS.border}`,
                    }}
                  >
                    {'航空公司'}
                  </th>
                  <th
                    style={{
                      padding: '5px 8px',
                      textAlign: 'center',
                      fontWeight: 600,
                      color: MORANDI_COLORS.gray,
                      borderTop: `1px solid ${MORANDI_COLORS.border}`,
                      borderLeft: `1px solid ${MORANDI_COLORS.border}`,
                    }}
                  >
                    {'航班代號'}
                  </th>
                  <th
                    style={{
                      padding: '5px 8px',
                      textAlign: 'center',
                      fontWeight: 600,
                      color: MORANDI_COLORS.gray,
                      borderTop: `1px solid ${MORANDI_COLORS.border}`,
                      borderLeft: `1px solid ${MORANDI_COLORS.border}`,
                    }}
                  >
                    {'出發城市'}
                  </th>
                  <th
                    style={{
                      padding: '5px 8px',
                      textAlign: 'center',
                      fontWeight: 600,
                      color: MORANDI_COLORS.gray,
                      borderTop: `1px solid ${MORANDI_COLORS.border}`,
                      borderLeft: `1px solid ${MORANDI_COLORS.border}`,
                    }}
                  >
                    {'抵達城市'}
                  </th>
                  <th
                    style={{
                      padding: '5px 8px',
                      textAlign: 'center',
                      fontWeight: 600,
                      color: MORANDI_COLORS.gray,
                      borderTop: `1px solid ${MORANDI_COLORS.border}`,
                      borderLeft: `1px solid ${MORANDI_COLORS.border}`,
                    }}
                  >
                    {'航行時間'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {allFlights.map((f, i) => (
                  <tr
                    key={i}
                    style={{ backgroundColor: i % 2 === 0 ? 'var(--card)' : 'var(--background)' }}
                  >
                    <td
                      style={{
                        padding: '5px 8px',
                        textAlign: 'center',
                        borderTop: `1px solid ${MORANDI_COLORS.border}`,
                      }}
                    >
                      {f.airline}
                    </td>
                    <td
                      style={{
                        padding: '5px 8px',
                        textAlign: 'center',
                        borderTop: `1px solid ${MORANDI_COLORS.border}`,
                        borderLeft: `1px solid ${MORANDI_COLORS.border}`,
                      }}
                    >
                      {f.flightNumber}
                    </td>
                    <td
                      style={{
                        padding: '5px 8px',
                        textAlign: 'center',
                        borderTop: `1px solid ${MORANDI_COLORS.border}`,
                        borderLeft: `1px solid ${MORANDI_COLORS.border}`,
                      }}
                    >
                      {f.departureAirport}
                    </td>
                    <td
                      style={{
                        padding: '5px 8px',
                        textAlign: 'center',
                        borderTop: `1px solid ${MORANDI_COLORS.border}`,
                        borderLeft: `1px solid ${MORANDI_COLORS.border}`,
                      }}
                    >
                      {f.arrivalAirport}
                    </td>
                    <td
                      style={{
                        padding: '5px 8px',
                        textAlign: 'center',
                        borderTop: `1px solid ${MORANDI_COLORS.border}`,
                        borderLeft: `1px solid ${MORANDI_COLORS.border}`,
                      }}
                    >
                      {f.departureTime && f.arrivalTime
                        ? `${f.departureTime}-${f.arrivalTime}`
                        : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* 報價 + 費用包含/不含 保持同頁不拆開 */}
      <div style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
        <QuotationPricingTable sellingPrices={sellingPrices} tierPricings={tierPricings} />
        <QuotationInclusions excludedItems={excludedItems} insuranceText={insuranceText} />
      </div>
    </PrintableWrapper>
  )
}
