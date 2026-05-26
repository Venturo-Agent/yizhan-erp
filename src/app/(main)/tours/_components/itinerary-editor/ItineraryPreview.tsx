'use client'
/**
 * ItineraryPreview - 簡易行程表預覽
 */

import { useTranslations } from 'next-intl'
import { Eye, Edit, Printer } from 'lucide-react'
import { EmptyValue } from '@/components/ui/empty-value'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { FlightInfo } from '@/types/flight.types'
import type { PreviewDayData } from './types'

interface ItineraryPreviewProps {
  isOpen: boolean
  onClose: () => void
  title: string
  destination: string
  startDate: string | null
  outboundFlight: FlightInfo | null
  returnFlight: FlightInfo | null
  dailyData: PreviewDayData[]
  companyName: string
  isDomestic: boolean
  onEdit: () => void
  onPrint: () => void
}

export function ItineraryPreview({
  isOpen,
  onClose,
  title,
  destination,
  startDate,
  outboundFlight,
  returnFlight,
  dailyData,
  companyName,
  isDomestic,
  onEdit,
  onPrint,
}: ItineraryPreviewProps) {
  const t = useTranslations('tour')
  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent level={2} className="max-w-5xl max-h-[90vh] overflow-hidden">
        <div className="flex flex-col h-full max-h-[80vh]">
          <DialogHeader className="flex-shrink-0 flex flex-row items-center justify-between mb-4">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-morandi-gold" />
              {t('itineraryPreviewTitle')}
              <span className="text-sm font-normal text-morandi-secondary">- {title}</span>
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="soft-gold"
                size="sm"
                onClick={onEdit}
                className="h-7 text-[0.647rem] gap-1"
              >
                <Edit size={12} />
                {t('itineraryPreviewEdit')}
              </Button>
              <Button
                variant="soft-gold"
                size="sm"
                onClick={onPrint}
                className="h-7 text-[0.647rem] gap-1"
              >
                <Printer size={12} />
                {t('printPrint')}
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto border border-border rounded-lg bg-card p-6">
            {/* 標題區 */}
            <div className="border-b-2 border-morandi-gold pb-4 mb-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-xl font-bold text-morandi-primary mb-1">
                    {title || t('itineraryPreviewDefaultTitle')}
                  </h1>
                </div>
                <div className="text-right text-sm text-morandi-secondary">
                  <p className="font-semibold text-morandi-gold">{companyName}</p>
                </div>
              </div>

              {/* 基本資訊 */}
              <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                <div className="flex gap-2">
                  <span className="text-morandi-secondary">
                    {t('itineraryPreviewDestinationLabel')}
                  </span>
                  <span className="font-medium">{destination || <EmptyValue />}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-morandi-secondary">
                    {t('itineraryPreviewDepartDateLabel')}
                  </span>
                  <span className="font-medium">{startDate || <EmptyValue />}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-morandi-secondary">{t('itineraryPreviewDaysLabel')}</span>
                  <span className="font-medium">
                    {dailyData.length} {t('itineraryPreviewDayUnit')}
                  </span>
                </div>
              </div>

              {/* 航班資訊 */}
              {!isDomestic && (outboundFlight || returnFlight) && (
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  {outboundFlight && (
                    <div className="flex gap-2">
                      <span className="text-morandi-secondary">
                        {t('itineraryPreviewOutboundFlightLabel')}
                      </span>
                      <span className="font-medium">
                        {outboundFlight.airline} {outboundFlight.flightNumber}
                        <span className="text-morandi-secondary ml-1">
                          ({outboundFlight.departureAirport}
                          {outboundFlight.departureAirportName
                            ? ` ${outboundFlight.departureAirportName}`
                            : ''}{' '}
                          {outboundFlight.departureTime} → {outboundFlight.arrivalAirport}
                          {outboundFlight.arrivalAirportName
                            ? ` ${outboundFlight.arrivalAirportName}`
                            : ''}{' '}
                          {outboundFlight.arrivalTime})
                        </span>
                      </span>
                    </div>
                  )}
                  {returnFlight && (
                    <div className="flex gap-2">
                      <span className="text-morandi-secondary">
                        {t('itineraryPreviewReturnFlightLabel')}
                      </span>
                      <span className="font-medium">
                        {returnFlight.airline} {returnFlight.flightNumber}
                        <span className="text-morandi-secondary ml-1">
                          ({returnFlight.departureAirport}
                          {returnFlight.departureAirportName
                            ? ` ${returnFlight.departureAirportName}`
                            : ''}{' '}
                          {returnFlight.departureTime} → {returnFlight.arrivalAirport}
                          {returnFlight.arrivalAirportName
                            ? ` ${returnFlight.arrivalAirportName}`
                            : ''}{' '}
                          {returnFlight.arrivalTime})
                        </span>
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 每日行程表格 */}
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-morandi-gold-header">
                  <th className="border border-morandi-gold/50 px-3 py-2 text-left w-20">
                    {t('itineraryPreviewDateColumn')}
                  </th>
                  <th className="border border-morandi-gold/50 px-3 py-2 text-left">
                    {t('itineraryPreviewContentColumn')}
                  </th>
                  <th className="border border-morandi-gold/50 px-3 py-2 text-center w-16">
                    {t('itineraryTabBreakfastHeader')}
                  </th>
                  <th className="border border-morandi-gold/50 px-3 py-2 text-center w-16">
                    {t('itineraryTabLunchHeader')}
                  </th>
                  <th className="border border-morandi-gold/50 px-3 py-2 text-center w-16">
                    {t('itineraryTabDinnerHeader')}
                  </th>
                  <th className="border border-morandi-gold/50 px-3 py-2 text-left w-32">
                    {t('itineraryPreviewHotelColumn')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {dailyData.map((day, index) => (
                  <tr
                    key={index}
                    className={index % 2 === 0 ? 'bg-card' : 'bg-morandi-container/20'}
                  >
                    <td className="border border-morandi-container px-3 py-2">
                      <div className="font-semibold text-morandi-gold">{day.dayLabel}</div>
                      <div className="text-xs text-morandi-secondary">{day.date}</div>
                    </td>
                    <td className="border border-morandi-container px-3 py-2">
                      <div className="font-medium">{day.title}</div>
                    </td>
                    <td className="border border-morandi-container px-3 py-2 text-center text-xs">
                      {day.meals.breakfast || <EmptyValue />}
                    </td>
                    <td className="border border-morandi-container px-3 py-2 text-center text-xs">
                      {day.meals.lunch || <EmptyValue />}
                    </td>
                    <td className="border border-morandi-container px-3 py-2 text-center text-xs">
                      {day.meals.dinner || <EmptyValue />}
                    </td>
                    <td className="border border-morandi-container px-3 py-2 text-xs">
                      {day.accommodation || <EmptyValue />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* 頁尾 */}
            <div className="mt-6 pt-4 border-t border-morandi-container text-xs text-morandi-secondary text-center">
              <p>
                {t('itineraryPreviewFooter')} {companyName} {t('itineraryPreviewFooterProvided')}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** 內嵌預覽組件（用於 Dialog 內部） */
export function ItineraryPreviewContent({
  title,
  destination,
  startDate,
  outboundFlight,
  returnFlight,
  dailyData,
  companyName,
  isDomestic,
  onEdit,
  onPrint,
}: Omit<ItineraryPreviewProps, 'isOpen' | 'onClose'>) {
  const t = useTranslations('tour')
  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      <DialogHeader className="flex-shrink-0 flex flex-row items-center justify-between mb-4">
        <DialogTitle className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-morandi-gold" />
          {t('itineraryPreviewTitle')}
          <span className="text-sm font-normal text-morandi-secondary">- {title}</span>
        </DialogTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="soft-gold"
            size="sm"
            onClick={onEdit}
            className="h-7 text-[0.647rem] gap-1"
          >
            <Edit size={12} />
            {t('itineraryPreviewEdit')}
          </Button>
          <Button
            variant="soft-gold"
            size="sm"
            onClick={onPrint}
            className="h-7 text-[0.647rem] gap-1"
          >
            <Printer size={12} />
            {t('printPrint')}
          </Button>
        </div>
      </DialogHeader>

      <div className="flex-1 overflow-y-auto border border-border rounded-lg bg-card p-6">
        {/* 標題區 */}
        <div className="border-b-2 border-morandi-gold pb-4 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-morandi-primary mb-1">
                {title || t('itineraryPreviewDefaultTitle')}
              </h1>
            </div>
            <div className="text-right text-sm text-morandi-secondary">
              <p className="font-semibold text-morandi-gold">{companyName}</p>
            </div>
          </div>

          {/* 基本資訊 */}
          <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
            <div className="flex gap-2">
              <span className="text-morandi-secondary">
                {t('itineraryPreviewDestinationLabel')}
              </span>
              <span className="font-medium">{destination || <EmptyValue />}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-morandi-secondary">{t('itineraryPreviewDepartDateLabel')}</span>
              <span className="font-medium">{startDate || <EmptyValue />}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-morandi-secondary">{t('itineraryPreviewDaysLabel')}</span>
              <span className="font-medium">
                {dailyData.length} {t('itineraryPreviewDayUnit')}
              </span>
            </div>
          </div>

          {/* 航班資訊 */}
          {!isDomestic && (outboundFlight || returnFlight) && (
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              {outboundFlight && (
                <div className="flex gap-2">
                  <span className="text-morandi-secondary">
                    {t('itineraryPreviewOutboundFlightLabel')}
                  </span>
                  <span className="font-medium">
                    {outboundFlight.airline} {outboundFlight.flightNumber}
                    <span className="text-morandi-secondary ml-1">
                      ({outboundFlight.departureAirport} {outboundFlight.departureTime} →{' '}
                      {outboundFlight.arrivalAirport} {outboundFlight.arrivalTime})
                    </span>
                  </span>
                </div>
              )}
              {returnFlight && (
                <div className="flex gap-2">
                  <span className="text-morandi-secondary">
                    {t('itineraryPreviewReturnFlightLabel')}
                  </span>
                  <span className="font-medium">
                    {returnFlight.airline} {returnFlight.flightNumber}
                    <span className="text-morandi-secondary ml-1">
                      ({returnFlight.departureAirport} {returnFlight.departureTime} →{' '}
                      {returnFlight.arrivalAirport} {returnFlight.arrivalTime})
                    </span>
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 每日行程表格 */}
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-morandi-gold-header">
              <th className="border border-morandi-gold/50 px-3 py-2 text-left w-20">
                {t('itineraryPreviewDateColumn')}
              </th>
              <th className="border border-morandi-gold/50 px-3 py-2 text-left">
                {t('itineraryPreviewContentColumn')}
              </th>
              <th className="border border-morandi-gold/50 px-3 py-2 text-center w-16">
                {t('itineraryTabBreakfastHeader')}
              </th>
              <th className="border border-morandi-gold/50 px-3 py-2 text-center w-16">
                {t('itineraryTabLunchHeader')}
              </th>
              <th className="border border-morandi-gold/50 px-3 py-2 text-center w-16">
                {t('itineraryTabDinnerHeader')}
              </th>
              <th className="border border-morandi-gold/50 px-3 py-2 text-left w-32">
                {t('itineraryPreviewHotelColumn')}
              </th>
            </tr>
          </thead>
          <tbody>
            {dailyData.map((day, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-card' : 'bg-morandi-container/20'}>
                <td className="border border-morandi-container px-3 py-2">
                  <div className="font-semibold text-morandi-gold">{day.dayLabel}</div>
                  <div className="text-xs text-morandi-secondary">{day.date}</div>
                </td>
                <td className="border border-morandi-container px-3 py-2">
                  <div className="font-medium">{day.title}</div>
                </td>
                <td className="border border-morandi-container px-3 py-2 text-center text-xs">
                  {day.meals.breakfast || <EmptyValue />}
                </td>
                <td className="border border-morandi-container px-3 py-2 text-center text-xs">
                  {day.meals.lunch || <EmptyValue />}
                </td>
                <td className="border border-morandi-container px-3 py-2 text-center text-xs">
                  {day.meals.dinner || <EmptyValue />}
                </td>
                <td className="border border-morandi-container px-3 py-2 text-xs">
                  {day.accommodation || <EmptyValue />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 頁尾 */}
        <div className="mt-6 pt-4 border-t border-morandi-container text-xs text-morandi-secondary text-center">
          <p>
            {t('itineraryPreviewFooter')} {companyName} {t('itineraryPreviewFooterProvided')}
          </p>
        </div>
      </div>
    </div>
  )
}
