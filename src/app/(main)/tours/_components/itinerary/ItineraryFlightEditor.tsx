'use client'

/**
 * ItineraryFlightEditor — 去程 / 回程航班編輯區塊
 *
 * 從 tour-itinerary-tab.tsx 拆出（原 lines 1401-1791）。
 * 包含：去程多航段 input + 搜尋、回程多航段 input + 搜尋。
 */

import { useTranslations } from 'next-intl'
import { Plane, Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { useIsIntegrationEnabled } from '@/lib/permissions/useIntegrationEnabled'
import type { FlightInfo, FlightSegmentInfo } from '@/types/flight.types'

const AIRLINE_PLACEHOLDER = '長榮'
const FLIGHT_NUMBER_SEARCH_PLACEHOLDER = '航班號搜尋'

interface ItineraryFlightEditorProps {
  // 去程
  outboundFlights: FlightInfo[]
  setOutboundFlights: React.Dispatch<React.SetStateAction<FlightInfo[]>>
  outboundFlightNumber: string
  setOutboundFlightNumber: (v: string) => void
  outboundFlightDate: string
  setOutboundFlightDate: (v: string) => void
  outboundSegments: FlightSegmentInfo[]
  handleSearchOutboundFlight: () => void
  handleSelectOutboundSegment: (seg: FlightSegmentInfo) => void
  clearOutboundSegments: () => void
  // 回程
  returnFlights: FlightInfo[]
  setReturnFlights: React.Dispatch<React.SetStateAction<FlightInfo[]>>
  returnFlightNumber: string
  setReturnFlightNumber: (v: string) => void
  returnFlightDate: string
  setReturnFlightDate: (v: string) => void
  returnSegments: FlightSegmentInfo[]
  handleSearchReturnFlight: () => void
  handleSelectReturnSegment: (seg: FlightSegmentInfo) => void
  clearReturnSegments: () => void
}

const emptyFlight: FlightInfo = {
  airline: '',
  flightNumber: '',
  departureAirport: '',
  departureTime: '',
  arrivalAirport: '',
  arrivalTime: '',
}

const inputCls =
  'h-7 text-sm px-1 border-0 border-b border-border/30 rounded-none bg-transparent focus-visible:bg-card focus-visible:border focus-visible:rounded'

export function ItineraryFlightEditor({
  outboundFlights,
  setOutboundFlights,
  outboundFlightNumber,
  setOutboundFlightNumber,
  outboundFlightDate,
  setOutboundFlightDate,
  outboundSegments,
  handleSearchOutboundFlight,
  handleSelectOutboundSegment,
  clearOutboundSegments,
  returnFlights,
  setReturnFlights,
  returnFlightNumber,
  setReturnFlightNumber,
  returnFlightDate,
  setReturnFlightDate,
  returnSegments,
  handleSearchReturnFlight,
  handleSelectReturnSegment,
  clearReturnSegments,
}: ItineraryFlightEditorProps) {
  const t = useTranslations('tour')
  // Integration 守門：航班搜尋（workspace_integrations.flight_search）
  // 沒串 API 時、隱藏「航班號搜尋 input + DatePicker」、保留「+」加 row 按鈕
  // 跟 PackageItineraryDialog 跟訂單成員護照 OCR 同 pattern
  const { enabled: flightSearchEnabled } = useIsIntegrationEnabled('flight_search')
  const columnHeader = (
    <div className="flex items-center gap-1.5 text-xs bg-morandi-gold-header px-2 py-1.5">
      <span className="w-16">{t('flightEditorAirline')}</span>
      <span className="w-20">{t('flightEditorFlightNo')}</span>
      <span className="w-14">{t('flightEditorDepart')}</span>
      <span className="w-16">{t('flightEditorTime')}</span>
      <span className="w-4"></span>
      <span className="w-14">{t('flightEditorArrive')}</span>
      <span className="w-16">{t('flightEditorTime')}</span>
      <span className="flex-1"></span>
    </div>
  )

  return (
    <div className="flex flex-col gap-3 mb-3">
      {/* Outbound flights */}
      <div className="flex-1">
        <div className="flex items-center gap-1.5 text-xs mb-1.5">
          <Plane size={12} className="text-morandi-gold" />
          <span className="text-muted-foreground font-medium">
            {t('flightEditorOutbound')}
          </span>
        </div>
        <div className="border border-border rounded-xl overflow-hidden">
          {columnHeader}
          {outboundFlights.map((flight, index) => (
            <div
              key={index}
              className={`flex items-center gap-1.5 text-sm px-2 py-1 hover:bg-muted/10 group ${index < outboundFlights.length - 1 ? 'border-b border-border' : ''}`}
            >
              <Input
                value={flight.airline || ''}
                placeholder={AIRLINE_PLACEHOLDER}
                onChange={e =>
                  setOutboundFlights(prev =>
                    prev.map((f, i) => (i === index ? { ...f, airline: e.target.value } : f))
                  )
                }
                className={`${inputCls} w-16`}
              />
              <Input
                value={flight.flightNumber || ''}
                placeholder="BR123"
                onChange={e =>
                  setOutboundFlights(prev =>
                    prev.map((f, i) =>
                      i === index ? { ...f, flightNumber: e.target.value.toUpperCase() } : f
                    )
                  )
                }
                className={`${inputCls} w-20`}
              />
              <Input
                value={flight.departureAirport || ''}
                placeholder="TPE"
                onChange={e =>
                  setOutboundFlights(prev =>
                    prev.map((f, i) =>
                      i === index ? { ...f, departureAirport: e.target.value.toUpperCase() } : f
                    )
                  )
                }
                className={`${inputCls} w-14`}
              />
              <Input
                value={flight.departureTime || ''}
                placeholder="08:00"
                onChange={e =>
                  setOutboundFlights(prev =>
                    prev.map((f, i) =>
                      i === index ? { ...f, departureTime: e.target.value } : f
                    )
                  )
                }
                className={`${inputCls} w-16`}
              />
              <span className="text-muted-foreground w-4 text-center text-xs">→</span>
              <Input
                value={flight.arrivalAirport || ''}
                placeholder="NRT"
                onChange={e =>
                  setOutboundFlights(prev =>
                    prev.map((f, i) =>
                      i === index ? { ...f, arrivalAirport: e.target.value.toUpperCase() } : f
                    )
                  )
                }
                className={`${inputCls} w-14`}
              />
              <Input
                value={flight.arrivalTime || ''}
                placeholder="12:00"
                onChange={e =>
                  setOutboundFlights(prev =>
                    prev.map((f, i) =>
                      i === index ? { ...f, arrivalTime: e.target.value } : f
                    )
                  )
                }
                className={`${inputCls} w-16`}
              />
              {index === 0 ? (
                <div className="flex-1 flex items-center justify-end gap-1">
                  {flightSearchEnabled && (
                    <>
                      <Input
                        value={outboundFlightNumber}
                        onChange={e => setOutboundFlightNumber(e.target.value.toUpperCase())}
                        placeholder={FLIGHT_NUMBER_SEARCH_PLACEHOLDER}
                        className="h-7 text-xs w-28 px-1"
                        onKeyDown={e => {
                          if (e.key === 'Enter' && outboundFlightNumber) {
                            handleSearchOutboundFlight()
                          }
                        }}
                      />
                      <DatePicker
                        value={outboundFlightDate}
                        onChange={date => setOutboundFlightDate(date || '')}
                        placeholder={t('flightEditorDatePlaceholder')}
                        className="h-7 text-xs w-24"
                      />
                    </>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="soft-gold"
                    onClick={() => setOutboundFlights(prev => [...prev, { ...emptyFlight }])}
                    className="h-7 w-7 p-0"
                    title={t('flightEditorAddBlankRow')}
                  >
                    <Plus size={12} />
                  </Button>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => setOutboundFlights(prev => prev.filter((_, i) => i !== index))}
                    className="text-destructive/60 hover:text-destructive p-0.5"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
          {outboundSegments.length > 0 && (
            <div className="space-y-1 px-2 py-1.5 bg-morandi-gold/5">
              <p className="text-xs text-muted-foreground">
                {t('flightEditorMultiSegmentSelect')}
              </p>
              {outboundSegments.map((seg, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectOutboundSegment(seg)}
                  className="w-full text-left p-1 rounded hover:bg-morandi-gold/10 transition-colors text-xs"
                >
                  {seg.departureAirport} → {seg.arrivalAirport}
                  <span className="text-muted-foreground ml-1">
                    {seg.departureTime} - {seg.arrivalTime}
                  </span>
                </button>
              ))}
              <button
                type="button"
                onClick={clearOutboundSegments}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {t('cancel')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Return flights */}
      <div className="flex-1">
        <div className="flex items-center gap-1.5 text-xs mb-1.5">
          <Plane size={12} className="text-morandi-gold" />
          <span className="text-muted-foreground font-medium">
            {t('flightEditorReturn')}
          </span>
        </div>
        <div className="border border-border rounded-xl overflow-hidden">
          {columnHeader}
          {returnFlights.map((flight, index) => (
            <div
              key={index}
              className={`flex items-center gap-1.5 text-sm px-2 py-1 hover:bg-muted/10 group ${index < returnFlights.length - 1 ? 'border-b border-border' : ''}`}
            >
              <Input
                value={flight.airline || ''}
                placeholder={AIRLINE_PLACEHOLDER}
                onChange={e =>
                  setReturnFlights(prev =>
                    prev.map((f, i) => (i === index ? { ...f, airline: e.target.value } : f))
                  )
                }
                className={`${inputCls} w-16`}
              />
              <Input
                value={flight.flightNumber || ''}
                placeholder="BR124"
                onChange={e =>
                  setReturnFlights(prev =>
                    prev.map((f, i) =>
                      i === index ? { ...f, flightNumber: e.target.value.toUpperCase() } : f
                    )
                  )
                }
                className={`${inputCls} w-20`}
              />
              <Input
                value={flight.departureAirport || ''}
                placeholder="NRT"
                onChange={e =>
                  setReturnFlights(prev =>
                    prev.map((f, i) =>
                      i === index ? { ...f, departureAirport: e.target.value.toUpperCase() } : f
                    )
                  )
                }
                className={`${inputCls} w-14`}
              />
              <Input
                value={flight.departureTime || ''}
                placeholder="14:00"
                onChange={e =>
                  setReturnFlights(prev =>
                    prev.map((f, i) =>
                      i === index ? { ...f, departureTime: e.target.value } : f
                    )
                  )
                }
                className={`${inputCls} w-16`}
              />
              <span className="text-muted-foreground w-4 text-center text-xs">→</span>
              <Input
                value={flight.arrivalAirport || ''}
                placeholder="TPE"
                onChange={e =>
                  setReturnFlights(prev =>
                    prev.map((f, i) =>
                      i === index ? { ...f, arrivalAirport: e.target.value.toUpperCase() } : f
                    )
                  )
                }
                className={`${inputCls} w-14`}
              />
              <Input
                value={flight.arrivalTime || ''}
                placeholder="17:00"
                onChange={e =>
                  setReturnFlights(prev =>
                    prev.map((f, i) =>
                      i === index ? { ...f, arrivalTime: e.target.value } : f
                    )
                  )
                }
                className={`${inputCls} w-16`}
              />
              {index === 0 ? (
                <div className="flex-1 flex items-center justify-end gap-1">
                  {flightSearchEnabled && (
                    <>
                      <Input
                        value={returnFlightNumber}
                        onChange={e => setReturnFlightNumber(e.target.value.toUpperCase())}
                        placeholder={FLIGHT_NUMBER_SEARCH_PLACEHOLDER}
                        className="h-7 text-xs w-28 px-1"
                        onKeyDown={e => {
                          if (e.key === 'Enter' && returnFlightNumber) {
                            handleSearchReturnFlight()
                          }
                        }}
                      />
                      <DatePicker
                        value={returnFlightDate}
                        onChange={date => setReturnFlightDate(date || '')}
                        placeholder={t('flightEditorDatePlaceholder')}
                        className="h-7 text-xs w-24"
                      />
                    </>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="soft-gold"
                    onClick={() => setReturnFlights(prev => [...prev, { ...emptyFlight }])}
                    className="h-7 w-7 p-0"
                    title={t('flightEditorAddBlankRow')}
                  >
                    <Plus size={12} />
                  </Button>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => setReturnFlights(prev => prev.filter((_, i) => i !== index))}
                    className="text-destructive/60 hover:text-destructive p-0.5"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
          {returnSegments.length > 0 && (
            <div className="space-y-1 px-2 py-1.5 bg-morandi-gold/5">
              <p className="text-xs text-muted-foreground">
                {t('flightEditorMultiSegmentSelect')}
              </p>
              {returnSegments.map((seg, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectReturnSegment(seg)}
                  className="w-full text-left p-1 rounded hover:bg-morandi-gold/10 transition-colors text-xs"
                >
                  {seg.departureAirport} → {seg.arrivalAirport}
                  <span className="text-muted-foreground ml-1">
                    {seg.departureTime} - {seg.arrivalTime}
                  </span>
                </button>
              ))}
              <button
                type="button"
                onClick={clearReturnSegments}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {t('cancel')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
