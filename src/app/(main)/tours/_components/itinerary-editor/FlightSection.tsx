'use client'
/**
 * FlightSection - 航班搜尋區塊
 */

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plane, Search, Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DatePicker } from '@/components/ui/date-picker'
import type { FlightInfo, FlightSegmentInfo } from '@/types/flight.types'

import { Spinner } from '@/components/ui/spinner'

/**
 * ManualFlightEntry — 手動填寫航班（API 查不到時的退路、2026-05-25 William）
 * FlightInfo 欄位全可選、填多少存多少、設好後一樣顯示在簡易行程表預覽。
 * 航班號碼 / 日期沿用上方既有輸入（flightNumber / date props 傳入）。
 */
function ManualFlightEntry({
  flightNumber,
  date,
  onAdd,
}: {
  flightNumber: string
  date: string
  onAdd: (flight: FlightInfo) => void
}) {
  const t = useTranslations('tour')
  const [expanded, setExpanded] = useState(false)
  const [airline, setAirline] = useState('')
  const [depAirport, setDepAirport] = useState('')
  const [arrAirport, setArrAirport] = useState('')
  const [depTime, setDepTime] = useState('')
  const [arrTime, setArrTime] = useState('')

  const handleAdd = () => {
    onAdd({
      flightNumber: flightNumber || null,
      airline: airline || null,
      departureAirport: depAirport || null,
      arrivalAirport: arrAirport || null,
      departureTime: depTime || null,
      arrivalTime: arrTime || null,
      departureDate: date || null,
    })
    setAirline('')
    setDepAirport('')
    setArrAirport('')
    setDepTime('')
    setArrTime('')
    setExpanded(false)
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="flex items-center gap-1 text-xs text-morandi-secondary hover:text-morandi-gold transition-colors"
      >
        <Plus size={12} />
        {t('itineraryFlightManualToggle')}
      </button>
    )
  }

  return (
    <div className="space-y-2 rounded-lg border border-morandi-gold/30 bg-morandi-gold/5 p-2">
      <p className="text-[0.65rem] text-morandi-secondary">{t('itineraryFlightManualHint')}</p>
      <Input
        value={airline}
        onChange={e => setAirline(e.target.value)}
        placeholder={t('itineraryFlightManualAirline')}
        className="h-7 text-xs"
      />
      <div className="flex gap-2">
        <Input
          value={depAirport}
          onChange={e => setDepAirport(e.target.value.toUpperCase())}
          placeholder={t('itineraryFlightManualDepAirport')}
          className="h-7 text-xs"
        />
        <Input
          value={arrAirport}
          onChange={e => setArrAirport(e.target.value.toUpperCase())}
          placeholder={t('itineraryFlightManualArrAirport')}
          className="h-7 text-xs"
        />
      </div>
      <div className="flex gap-2">
        <Input
          value={depTime}
          onChange={e => setDepTime(e.target.value)}
          placeholder={t('itineraryFlightManualDepTime')}
          className="h-7 text-xs"
        />
        <Input
          value={arrTime}
          onChange={e => setArrTime(e.target.value)}
          placeholder={t('itineraryFlightManualArrTime')}
          className="h-7 text-xs"
        />
      </div>
      <Button
        variant="soft-gold"
        type="button"
        size="sm"
        onClick={handleAdd}
        className="h-7 w-full text-xs"
      >
        {t('itineraryFlightManualAdd')}
      </Button>
    </div>
  )
}
interface FlightSectionProps {
  // 去程
  outboundFlight: FlightInfo | null
  outboundFlightNumber: string
  outboundFlightDate: string
  searchingOutbound: boolean
  outboundSegments: FlightSegmentInfo[]
  onOutboundFlightNumberChange: (value: string) => void
  onOutboundFlightDateChange: (date: string) => void
  onSearchOutbound: () => void
  onSelectOutboundSegment: (segment: FlightSegmentInfo) => void
  onClearOutboundSegments: () => void
  onRemoveOutbound: () => void
  // 回程
  returnFlight: FlightInfo | null
  returnFlightNumber: string
  returnFlightDate: string
  searchingReturn: boolean
  returnSegments: FlightSegmentInfo[]
  onReturnFlightNumberChange: (value: string) => void
  onReturnFlightDateChange: (date: string) => void
  onSearchReturn: () => void
  onSelectReturnSegment: (segment: FlightSegmentInfo) => void
  onClearReturnSegments: () => void
  onRemoveReturn: () => void
  /** 手動填寫航班（API 查不到時的退路、2026-05-25）*/
  onManualOutbound: (flight: FlightInfo) => void
  onManualReturn: (flight: FlightInfo) => void
  /** Feature flag：航班搜尋（workspace_features.flight_search）— false 時隱藏搜尋按鈕跟 Enter 觸發 */
  searchEnabled?: boolean
}

export function FlightSection({
  outboundFlight,
  outboundFlightNumber,
  outboundFlightDate,
  searchingOutbound,
  outboundSegments,
  onOutboundFlightNumberChange,
  onOutboundFlightDateChange,
  onSearchOutbound,
  onSelectOutboundSegment,
  onClearOutboundSegments,
  onRemoveOutbound,
  returnFlight,
  returnFlightNumber,
  returnFlightDate,
  searchingReturn,
  returnSegments,
  onReturnFlightNumberChange,
  onReturnFlightDateChange,
  onSearchReturn,
  onSelectReturnSegment,
  onClearReturnSegments,
  onRemoveReturn,
  onManualOutbound,
  onManualReturn,
  searchEnabled = true,
}: FlightSectionProps) {
  const t = useTranslations('tour')
  return (
    <div className="space-y-3">
      <Label className="text-xs text-morandi-primary flex items-center gap-1">
        <Plane size={12} />
        {t('itineraryFlightInfoOptional')}
      </Label>

      {/* 去程航班 */}
      <div className="border border-border rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-morandi-secondary">{t('itineraryOutboundFlight')}</span>
          {outboundFlight && (
            <button
              type="button"
              onClick={onRemoveOutbound}
              className="text-status-danger hover:text-status-danger/80 p-1"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
        {outboundFlight ? (
          <div className="bg-morandi-container/50 rounded p-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-morandi-primary">
                {outboundFlight.flightNumber}
              </span>
              <span className="text-xs text-morandi-secondary">{outboundFlight.airline}</span>
            </div>
            <div className="text-xs text-morandi-secondary mt-1">
              {outboundFlight.departureAirport} → {outboundFlight.arrivalAirport}
              <span className="ml-2">
                {outboundFlight.departureTime} - {outboundFlight.arrivalTime}
              </span>
            </div>
          </div>
        ) : outboundSegments.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-morandi-secondary">
              {t('itineraryFlightMultiSegmentSelect')}
            </p>
            <div className="space-y-1">
              {outboundSegments.map((seg, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onSelectOutboundSegment(seg)}
                  className="w-full text-left p-2 rounded border border-border hover:border-morandi-gold hover:bg-morandi-gold/5 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-morandi-primary">
                      {seg.departureAirport} → {seg.arrivalAirport}
                    </span>
                    <span className="text-xs text-morandi-secondary">
                      {seg.departureTime} - {seg.arrivalTime}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onClearOutboundSegments}
              className="text-xs text-morandi-secondary hover:text-morandi-primary"
            >
              {t('itineraryFlightCancelSelect')}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={outboundFlightNumber}
                onChange={e => onOutboundFlightNumberChange(e.target.value.toUpperCase())}
                placeholder={t('itineraryFlightOutboundPlaceholder')}
                className="h-8 text-xs flex-1"
                onKeyDown={e => searchEnabled && e.key === 'Enter' && onSearchOutbound()}
              />
              <DatePicker
                value={outboundFlightDate}
                onChange={date => onOutboundFlightDateChange(date || '')}
                placeholder={t('itineraryFlightDatePlaceholder')}
                className="h-8 text-xs w-32"
              />
              {searchEnabled && (
                <Button
                  variant="soft-gold"
                  type="button"
                  size="sm"
                  onClick={onSearchOutbound}
                  disabled={searchingOutbound}
                  className="h-8 px-2"
                >
                  {searchingOutbound ? <Spinner size="sm" /> : <Search size={14} />}
                </Button>
              )}
            </div>
            <ManualFlightEntry
              flightNumber={outboundFlightNumber}
              date={outboundFlightDate}
              onAdd={onManualOutbound}
            />
          </div>
        )}
      </div>

      {/* 回程航班 */}
      <div className="border border-border rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-morandi-secondary">{t('itineraryReturnFlight')}</span>
          {returnFlight && (
            <button
              type="button"
              onClick={onRemoveReturn}
              className="text-status-danger hover:text-status-danger/80 p-1"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
        {returnFlight ? (
          <div className="bg-morandi-container/50 rounded p-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-morandi-primary">
                {returnFlight.flightNumber}
              </span>
              <span className="text-xs text-morandi-secondary">{returnFlight.airline}</span>
            </div>
            <div className="text-xs text-morandi-secondary mt-1">
              {returnFlight.departureAirport} → {returnFlight.arrivalAirport}
              <span className="ml-2">
                {returnFlight.departureTime} - {returnFlight.arrivalTime}
              </span>
            </div>
          </div>
        ) : returnSegments.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-morandi-secondary">
              {t('itineraryFlightMultiSegmentSelect')}
            </p>
            <div className="space-y-1">
              {returnSegments.map((seg, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onSelectReturnSegment(seg)}
                  className="w-full text-left p-2 rounded border border-border hover:border-morandi-gold hover:bg-morandi-gold/5 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-morandi-primary">
                      {seg.departureAirport} → {seg.arrivalAirport}
                    </span>
                    <span className="text-xs text-morandi-secondary">
                      {seg.departureTime} - {seg.arrivalTime}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onClearReturnSegments}
              className="text-xs text-morandi-secondary hover:text-morandi-primary"
            >
              {t('itineraryFlightCancelSelect')}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={returnFlightNumber}
                onChange={e => onReturnFlightNumberChange(e.target.value.toUpperCase())}
                placeholder={t('itineraryFlightReturnPlaceholder')}
                className="h-8 text-xs flex-1"
                onKeyDown={e => searchEnabled && e.key === 'Enter' && onSearchReturn()}
              />
              <DatePicker
                value={returnFlightDate}
                onChange={date => onReturnFlightDateChange(date || '')}
                placeholder={t('itineraryFlightDatePlaceholder')}
                className="h-8 text-xs w-32"
              />
              {searchEnabled && (
                <Button
                  variant="soft-gold"
                  type="button"
                  size="sm"
                  onClick={onSearchReturn}
                  disabled={searchingReturn}
                  className="h-8 px-2"
                >
                  {searchingReturn ? <Spinner size="sm" /> : <Search size={14} />}
                </Button>
              )}
            </div>
            <ManualFlightEntry
              flightNumber={returnFlightNumber}
              date={returnFlightDate}
              onAdd={onManualReturn}
            />
          </div>
        )}
      </div>
    </div>
  )
}
