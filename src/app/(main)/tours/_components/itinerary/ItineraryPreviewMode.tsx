'use client'

/**
 * ItineraryPreviewMode — 行程表預覽模式（可列印）
 *
 * 從 tour-itinerary-tab.tsx 拆出。
 * 包含：列印按鈕、行程表預覽（含航班、每日行程表格）。
 */

import { Fragment, RefObject } from 'react'
import { useTranslations } from 'next-intl'
import { Eye, Edit, Printer, Plane } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { FlightInfo } from '@/types/flight.types'

type PreviewDay = {
  date?: string
  dayLabel: string
  title: string
  note?: string
  meals: { breakfast: string; lunch: string; dinner: string }
  accommodation?: string
}

interface ItineraryPreviewModeProps {
  title: string
  tourDestinationDisplay: string
  tourDepartureDate?: string
  outboundFlights: FlightInfo[]
  returnFlights: FlightInfo[]
  dailyData: PreviewDay[]
  workspaceCode?: string
  printContentRef: RefObject<HTMLDivElement | null>
  onBackToEdit: () => void
  onPrint: () => void
}

export function ItineraryPreviewMode({
  title,
  tourDestinationDisplay,
  tourDepartureDate,
  outboundFlights,
  returnFlights,
  dailyData,
  workspaceCode,
  printContentRef,
  onBackToEdit,
  onPrint,
}: ItineraryPreviewModeProps) {
  const t = useTranslations('tour')
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-medium">
          <Eye className="w-5 h-5 text-morandi-gold" />
          {t('itineraryPreviewSimplePreview')}
        </h3>
        <div className="flex gap-2">
          <Button variant="soft-gold" size="sm" onClick={onBackToEdit}>
            <Edit className="w-4 h-4 mr-1" />
            {t('itineraryPreviewEdit')}
          </Button>
          <Button variant="soft-gold" size="sm" onClick={onPrint}>
            <Printer className="w-4 h-4 mr-1" />
            {t('printPrint')}
          </Button>
        </div>
      </div>

      <div ref={printContentRef} className="border rounded-lg p-6 bg-card print-container">
        <div className="header-bar border-b-2 border-morandi-gold pb-4 mb-6">
          <div className="header-top flex items-start justify-between">
            <h1 className="text-xl font-bold text-morandi-primary">
              {title || t('itineraryPreviewDefaultTitle')}
            </h1>
            <span className="workspace-code text-sm font-semibold text-morandi-gold">
              {workspaceCode || t('itineraryPreviewTravelAgency')}
            </span>
          </div>
          <div className="meta-grid mt-4 grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="meta-label text-muted-foreground">
                {t('itineraryPreviewDestinationLabel')}
              </span>
              {tourDestinationDisplay || '-'}
            </div>
            <div>
              <span className="meta-label text-muted-foreground">
                {t('itineraryPreviewDepartDateLabel')}
              </span>
              {tourDepartureDate || '-'}
            </div>
            <div>
              <span className="meta-label text-muted-foreground">
                {t('itineraryPreviewDaysLabel')}
              </span>
              {dailyData.length} {t('itineraryPreviewDayUnit')}
            </div>
          </div>
        </div>

        {/* 航班資訊 */}
        {outboundFlights.some(f => f.flightNumber) || returnFlights.some(f => f.flightNumber) ? (
          <div className="flight-section mb-6 grid grid-cols-2 gap-4 text-sm">
            {outboundFlights.some(f => f.flightNumber) && (
              <div>
                <h4 className="flight-title font-semibold text-morandi-gold mb-2 flex items-center gap-1">
                  <Plane className="w-4 h-4" />
                  {t('flightEditorOutbound')}
                </h4>
                {outboundFlights
                  .filter(f => f.flightNumber)
                  .map((f, i) => (
                    <div
                      key={i}
                      className="flight-info flex items-center gap-2 text-muted-foreground"
                    >
                      <span className="bold font-medium text-morandi-primary">
                        {f.airline} {f.flightNumber}
                      </span>
                      <span>
                        {f.departureAirport} {f.departureTime}
                      </span>
                      <span>→</span>
                      <span>
                        {f.arrivalAirport} {f.arrivalTime}
                      </span>
                    </div>
                  ))}
              </div>
            )}
            {returnFlights.some(f => f.flightNumber) && (
              <div>
                <h4 className="flight-title font-semibold text-morandi-gold mb-2 flex items-center gap-1">
                  <Plane className="w-4 h-4" />
                  {t('flightEditorReturn')}
                </h4>
                {returnFlights
                  .filter(f => f.flightNumber)
                  .map((f, i) => (
                    <div
                      key={i}
                      className="flight-info flex items-center gap-2 text-muted-foreground"
                    >
                      <span className="bold font-medium text-morandi-primary">
                        {f.airline} {f.flightNumber}
                      </span>
                      <span>
                        {f.departureAirport} {f.departureTime}
                      </span>
                      <span>→</span>
                      <span>
                        {f.arrivalAirport} {f.arrivalTime}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ) : null}

        <table className="w-full border-collapse text-[0.765rem]">
          <thead>
            <tr className="bg-morandi-gold-header">
              <th className="border border-morandi-gold/50 px-3 py-2 text-left w-16">
                {t('itineraryTabDateHeader')}
              </th>
              <th className="border border-morandi-gold/50 px-3 py-2 text-left">
                {t('itineraryTabContent')}
              </th>
            </tr>
          </thead>
          <tbody>
            {dailyData.map((day, index) => {
              const rowCount = 2 + (day.note ? 1 : 0) + (day.accommodation ? 1 : 0)
              return (
                <Fragment key={index}>
                  <tr className={index % 2 === 0 ? 'bg-card' : 'bg-muted/20'}>
                    <td
                      className="border border-muted px-3 py-2 align-middle text-center font-semibold text-morandi-gold"
                      rowSpan={rowCount}
                    >
                      {day.date || day.dayLabel}
                    </td>
                    <td className="border border-muted px-3 py-2 font-medium">{day.title}</td>
                  </tr>
                  {day.note && (
                    <tr className={index % 2 === 0 ? 'bg-card' : 'bg-muted/20'}>
                      <td className="border border-muted px-3 py-1.5">
                        <span className="text-morandi-gold text-[0.706rem]">※{day.note}</span>
                      </td>
                    </tr>
                  )}
                  <tr className={index % 2 === 0 ? 'bg-card' : 'bg-muted/20'}>
                    <td className="border border-muted px-0 py-1.5">
                      <div className="grid grid-cols-3 text-[0.706rem]">
                        <div className="flex items-center gap-2 px-3">
                          <span className="font-medium text-muted-foreground shrink-0">
                            {t('itineraryTabBreakfastHeader')}
                          </span>
                          <span>{day.meals.breakfast || 'X'}</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 border-l border-muted">
                          <span className="font-medium text-muted-foreground shrink-0">
                            {t('itineraryTabLunchHeader')}
                          </span>
                          <span>{day.meals.lunch || 'X'}</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 border-l border-muted">
                          <span className="font-medium text-muted-foreground shrink-0">
                            {t('itineraryTabDinnerHeader')}
                          </span>
                          <span>{day.meals.dinner || 'X'}</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                  {day.accommodation && (
                    <tr className={index % 2 === 0 ? 'bg-card' : 'bg-muted/20'}>
                      <td className="border border-muted px-3 py-1.5 text-[0.706rem]">
                        <span className="font-medium text-muted-foreground mr-2">
                          {t('itineraryPreviewHotelColumn')}
                        </span>
                        <span>{day.accommodation}</span>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
