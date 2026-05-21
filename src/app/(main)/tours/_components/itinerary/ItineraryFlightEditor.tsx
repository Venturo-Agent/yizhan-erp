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
  'h-7 w-full text-sm px-1 text-center border-0 rounded-none bg-transparent shadow-none focus-visible:ring-0 focus-visible:bg-card'

// SSOT：去程 / 回程 / 行程 共用「第一欄寬度」= 80px、跟 daily schedule 對齊
// 其他欄各 section 自己設、不強求對齊
const FlightColgroup = () => (
  <colgroup>
    <col style={{ width: '80px' }} />
    <col style={{ width: '88px' }} />
    <col style={{ width: '96px' }} />
    <col style={{ width: '56px' }} />
    <col style={{ width: '64px' }} />
    <col style={{ width: '96px' }} />
    <col style={{ width: '56px' }} />
    <col style={{ width: '64px' }} />
    <col />
  </colgroup>
)

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

  const tableHeader = (
    <thead className="bg-morandi-gold-header text-xs">
      <tr>
        <th className="px-2 py-1.5 text-center font-medium table-divider">
          {t('flightEditorAirline')}
        </th>
        <th className="px-2 py-1.5 text-center font-medium table-divider">
          {t('flightEditorFlightNo')}
        </th>
        <th className="px-2 py-1.5 text-center font-medium table-divider">起飛機場</th>
        <th className="px-2 py-1.5 text-center font-medium table-divider">代號</th>
        <th className="px-2 py-1.5 text-center font-medium table-divider">
          {t('flightEditorTime')}
        </th>
        <th className="px-2 py-1.5 text-center font-medium table-divider">抵達機場</th>
        <th className="px-2 py-1.5 text-center font-medium table-divider">代號</th>
        <th className="px-2 py-1.5 text-center font-medium table-divider">
          {t('flightEditorTime')}
        </th>
        <th></th>
      </tr>
    </thead>
  )

  // 為避免重複、抽出單一航班 row 的 cells（給 outbound / return 共用）
  const renderFlightRow = (
    flight: FlightInfo,
    index: number,
    direction: 'outbound' | 'return',
    flightsLen: number
  ) => {
    const setFlights = direction === 'outbound' ? setOutboundFlights : setReturnFlights
    const flightNumberState = direction === 'outbound' ? outboundFlightNumber : returnFlightNumber
    const setFlightNumberState =
      direction === 'outbound' ? setOutboundFlightNumber : setReturnFlightNumber
    const flightDateState = direction === 'outbound' ? outboundFlightDate : returnFlightDate
    const setFlightDateState =
      direction === 'outbound' ? setOutboundFlightDate : setReturnFlightDate
    const handleSearch =
      direction === 'outbound' ? handleSearchOutboundFlight : handleSearchReturnFlight

    return (
      <tr
        key={`${direction}-${index}`}
        className={`text-sm hover:bg-muted/10 group ${index < flightsLen - 1 ? 'border-b border-border/40' : ''}`}
      >
        <td className="px-2 py-1 table-divider">
          <Input
            value={flight.airline || ''}
            placeholder={AIRLINE_PLACEHOLDER}
            onChange={e =>
              setFlights(prev =>
                prev.map((f, i) => (i === index ? { ...f, airline: e.target.value } : f))
              )
            }
            className={inputCls}
          />
        </td>
        <td className="px-2 py-1 table-divider">
          <Input
            value={flight.flightNumber || ''}
            placeholder={direction === 'outbound' ? 'BR123' : 'BR124'}
            onChange={e =>
              setFlights(prev =>
                prev.map((f, i) =>
                  i === index ? { ...f, flightNumber: e.target.value.toUpperCase() } : f
                )
              )
            }
            className={inputCls}
          />
        </td>
        <td className="px-2 py-1 table-divider">
          <Input
            value={flight.departureAirportName || ''}
            placeholder={direction === 'outbound' ? '桃園機場' : '成田機場'}
            onChange={e =>
              setFlights(prev =>
                prev.map((f, i) =>
                  i === index ? { ...f, departureAirportName: e.target.value } : f
                )
              )
            }
            className={inputCls}
          />
        </td>
        <td className="px-2 py-1 table-divider">
          <Input
            value={flight.departureAirport || ''}
            placeholder={direction === 'outbound' ? 'TPE' : 'NRT'}
            onChange={e =>
              setFlights(prev =>
                prev.map((f, i) =>
                  i === index ? { ...f, departureAirport: e.target.value.toUpperCase() } : f
                )
              )
            }
            className={inputCls}
          />
        </td>
        <td className="px-2 py-1 table-divider">
          <Input
            value={flight.departureTime || ''}
            placeholder={direction === 'outbound' ? '08:00' : '14:00'}
            onChange={e =>
              setFlights(prev =>
                prev.map((f, i) => (i === index ? { ...f, departureTime: e.target.value } : f))
              )
            }
            className={inputCls}
          />
        </td>
        <td className="px-2 py-1 table-divider">
          <Input
            value={flight.arrivalAirportName || ''}
            placeholder={direction === 'outbound' ? '成田機場' : '桃園機場'}
            onChange={e =>
              setFlights(prev =>
                prev.map((f, i) =>
                  i === index ? { ...f, arrivalAirportName: e.target.value } : f
                )
              )
            }
            className={inputCls}
          />
        </td>
        <td className="px-2 py-1 table-divider">
          <Input
            value={flight.arrivalAirport || ''}
            placeholder={direction === 'outbound' ? 'NRT' : 'TPE'}
            onChange={e =>
              setFlights(prev =>
                prev.map((f, i) =>
                  i === index ? { ...f, arrivalAirport: e.target.value.toUpperCase() } : f
                )
              )
            }
            className={inputCls}
          />
        </td>
        <td className="px-2 py-1 table-divider">
          <Input
            value={flight.arrivalTime || ''}
            placeholder={direction === 'outbound' ? '12:00' : '17:00'}
            onChange={e =>
              setFlights(prev =>
                prev.map((f, i) => (i === index ? { ...f, arrivalTime: e.target.value } : f))
              )
            }
            className={inputCls}
          />
        </td>
        <td className="px-2 py-1">
          {index === 0 ? (
            <div className="flex items-center justify-end gap-1">
              {flightSearchEnabled && (
                <>
                  <Input
                    value={flightNumberState}
                    onChange={e => setFlightNumberState(e.target.value.toUpperCase())}
                    placeholder={FLIGHT_NUMBER_SEARCH_PLACEHOLDER}
                    className="h-7 text-xs w-28 px-1"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && flightNumberState) {
                        handleSearch()
                      }
                    }}
                  />
                  <DatePicker
                    value={flightDateState}
                    onChange={date => setFlightDateState(date || '')}
                    placeholder={t('flightEditorDatePlaceholder')}
                    className="h-7 text-xs w-24"
                  />
                </>
              )}
              <Button
                type="button"
                size="sm"
                variant="soft-gold"
                onClick={() => setFlights(prev => [...prev, { ...emptyFlight }])}
                className="h-7 w-7 p-0"
                title={t('flightEditorAddBlankRow')}
              >
                <Plus size={12} />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => setFlights(prev => prev.filter((_, i) => i !== index))}
                className="text-destructive/60 hover:text-destructive p-0.5"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </td>
      </tr>
    )
  }

  return (
    <div className="flex flex-col">
      {/* Outbound flights — section title 內縮、table 撐滿 */}
      <div className="flex items-center gap-1.5 text-xs mb-1 mt-1 px-4">
        <Plane size={12} className="text-morandi-gold" />
        <span className="text-muted-foreground font-medium">{t('flightEditorOutbound')}</span>
      </div>
      <table className="w-full border-collapse table-fixed border-t border-b border-border">
        <FlightColgroup />
        {tableHeader}
        <tbody>
          {outboundFlights.map((f, i) =>
            renderFlightRow(f, i, 'outbound', outboundFlights.length)
          )}
        </tbody>
      </table>
      {outboundSegments.length > 0 && (
        <div className="space-y-1 px-2 py-1.5 bg-morandi-gold/5">
          <p className="text-xs text-muted-foreground">{t('flightEditorMultiSegmentSelect')}</p>
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

      {/* Return flights */}
      <div className="flex items-center gap-1.5 text-xs mb-1 mt-2 px-4">
        <Plane size={12} className="text-morandi-gold" />
        <span className="text-muted-foreground font-medium">{t('flightEditorReturn')}</span>
      </div>
      <table className="w-full border-collapse table-fixed border-t border-b border-border">
        <FlightColgroup />
        {tableHeader}
        <tbody>
          {returnFlights.map((f, i) => renderFlightRow(f, i, 'return', returnFlights.length))}
        </tbody>
      </table>
      {returnSegments.length > 0 && (
        <div className="space-y-1 px-2 py-1.5 bg-morandi-gold/5">
          <p className="text-xs text-muted-foreground">{t('flightEditorMultiSegmentSelect')}</p>
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
  )
}
