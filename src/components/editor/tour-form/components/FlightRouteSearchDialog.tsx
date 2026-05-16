'use client'

/**
 * 航線查詢 Dialog
 *
 * [Planned] 航班時刻表 API 升級
 * 目前使用 AeroDataBox API 只能查詢 14 天內的即時航班動態
 * 如果要查詢更遠的未來航班（如明年的固定班次），需要：
 * 1. 使用 OAG 或其他航班時刻表 API
 * 2. 或建立自己的航線資料庫
 */

import React, { useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { formatDateChineseWithWeekday, formatDate } from '@/lib/utils/format-date'
import { Input } from '@/components/ui/input'

const COMPONENT_LABELS = {
  API_LIMIT_WARNING: '⚠️ 航班 API 只能查詢 14 天內的航班',
} as const
import { DatePicker } from '@/components/ui/date-picker'
import { Search, Loader2, Plane, Clock, MapPin } from 'lucide-react'
import {
  searchAirportDeparturesAction,
  AirportFlightItem,
} from '@/lib/actions/flight-actions'
import { alert } from '@/lib/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { COMP_EDITOR_LABELS } from '../../constants/labels'

interface FlightRouteSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultOrigin?: string // 預設出發機場 (如 TPE)
  defaultDestination?: string // 預設目的地 (如 DAD)
  defaultDate?: string // 預設日期 YYYY-MM-DD
  onSelectFlight: (flight: {
    flightNumber: string
    airline: string
    departureAirport: string
    arrivalAirport: string
    departureTime: string
    arrivalTime: string
  }) => void
}

export function FlightRouteSearchDialog({
  open,
  onOpenChange,
  defaultOrigin = 'TPE',
  defaultDestination = '',
  defaultDate,
  onSelectFlight,
}: FlightRouteSearchDialogProps) {
  // 計算有效的搜尋日期（API 只支援 14 天內的查詢）
  const getValidSearchDate = (inputDate?: string) => {
    const today = new Date()
    const maxDate = new Date(today)
    maxDate.setDate(maxDate.getDate() + 14)

    if (inputDate) {
      const targetDate = new Date(inputDate)
      // 如果日期在有效範圍內（今天到 14 天後），使用該日期
      if (targetDate >= today && targetDate <= maxDate) {
        return inputDate
      }
    }
    // 否則使用今天
    return formatDate(today)
  }

  // 搜尋條件
  const [origin, setOrigin] = useState(defaultOrigin)
  const [destination, setDestination] = useState(defaultDestination)
  const [searchDate, setSearchDate] = useState(getValidSearchDate(defaultDate))

  // 搜尋狀態
  const [loading, setLoading] = useState(false)
  const [flights, setFlights] = useState<AirportFlightItem[]>([])
  const [searched, setSearched] = useState(false)

  // 重置狀態（當 Dialog 開啟時）
  React.useEffect(() => {
    if (open) {
      setOrigin(defaultOrigin)
      setDestination(defaultDestination)
      setSearchDate(getValidSearchDate(defaultDate))
      setFlights([])
      setSearched(false)
    }
  }, [open, defaultOrigin, defaultDestination, defaultDate])

  // 執行搜尋
  const handleSearch = useCallback(async () => {
    if (!origin) {
      void alert(COMP_EDITOR_LABELS.請輸入出發機場代碼, 'warning')
      return
    }

    setLoading(true)
    setSearched(true)

    try {
      const result = await searchAirportDeparturesAction(
        origin,
        searchDate,
        destination || undefined
      )

      if (result.error) {
        void alert(result.error, 'error')
        setFlights([])
        return
      }

      setFlights(result.data || [])
    } catch {
      void alert(COMP_EDITOR_LABELS.查詢時發生錯誤, 'error')
      setFlights([])
    } finally {
      setLoading(false)
    }
  }, [origin, destination, searchDate])

  // 選擇航班
  const handleSelectFlight = useCallback(
    (flight: AirportFlightItem) => {
      onSelectFlight({
        flightNumber: flight.flightNumber,
        airline: flight.airline,
        departureAirport: origin.toUpperCase(),
        arrivalAirport: flight.destinationIata,
        departureTime: flight.scheduledTime,
        arrivalTime: '', // API 沒有提供抵達時間，需要另外查詢
      })
      onOpenChange(false)
    },
    [origin, onSelectFlight, onOpenChange]
  )

  // 格式化日期顯示
  const formatDateDisplay = (dateStr: string) => {
    return formatDateChineseWithWeekday(dateStr)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent level={1} className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plane className="w-5 h-5 text-morandi-gold" />
            {COMP_EDITOR_LABELS.QUERYING_9873}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* 搜尋條件 */}
          <div className="bg-muted p-4 rounded-lg border space-y-3">
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-morandi-primary mb-1">
                  {COMP_EDITOR_LABELS.LABEL_7410}
                </label>
                <Input
                  type="text"
                  value={origin}
                  onChange={e => setOrigin(e.target.value.toUpperCase())}
                  placeholder="TPE"
                  className="text-sm h-9 uppercase"
                  maxLength={3}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-morandi-primary mb-1">
                  {COMP_EDITOR_LABELS.LABEL_5475}
                </label>
                <Input
                  type="text"
                  value={destination}
                  onChange={e => setDestination(e.target.value.toUpperCase())}
                  placeholder="DAD"
                  className="text-sm h-9 uppercase"
                  maxLength={3}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-morandi-primary mb-1">
                  {COMP_EDITOR_LABELS.DATE}
                </label>
                <DatePicker
                  value={searchDate}
                  onChange={date => setSearchDate(date)}
                  placeholder={COMP_EDITOR_LABELS.選擇日期}
                  className="text-sm h-9"
                />
              </div>
              <div className="flex items-end">
                <Button variant="soft-gold"
                  type="button"
                  onClick={handleSearch}
                  disabled={loading || !origin}
 className="w-full h-9 gap-1"
                >
                  {loading ? <Loader2 size="0.875em" className="animate-spin" /> : <Search size="0.875em" />}
                  查詢
                </Button>
              </div>
            </div>

            <div className="text-xs text-morandi-secondary space-y-1">
              {destination && (
                <div className="flex items-center gap-1">
                  <MapPin size="0.75em" />
                  查詢 {origin} → {destination} 的直飛航班
                </div>
              )}
              <div className="text-status-warning">{COMPONENT_LABELS.API_LIMIT_WARNING}</div>
            </div>
          </div>

          {/* 搜尋日期顯示 */}
          {searched && (
            <div className="text-sm text-morandi-primary flex items-center gap-2">
              <Clock size="0.875em" />
              {formatDateDisplay(searchDate)} 的航班
              {flights.length > 0 && (
                <span className="text-morandi-gold font-medium">（共 {flights.length} 班）</span>
              )}
            </div>
          )}

          {/* 航班列表 */}
          <div className="flex-1 overflow-auto min-h-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-morandi-gold" />
                <span className="ml-2 text-morandi-secondary">
                  {COMP_EDITOR_LABELS.QUERYING_974}
                </span>
              </div>
            ) : searched && flights.length === 0 ? (
              <div className="text-center py-12 text-morandi-secondary">
                <Plane className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>{COMP_EDITOR_LABELS.NOT_FOUND_5487}</p>
                <p className="text-xs mt-1">{COMP_EDITOR_LABELS.CONFIRM_3826}</p>
              </div>
            ) : flights.length > 0 ? (
              <div className="space-y-2">
                {flights.map((flight, index) => (
                  <button
                    key={`${flight.flightNumber}-${index}`}
                    type="button"
                    onClick={() => handleSelectFlight(flight)}
                    className={cn(
                      'w-full p-3 rounded-lg border text-left transition-all',
                      'hover:border-morandi-gold hover:bg-morandi-gold/5',
                      'focus:outline-none focus:ring-2 focus:ring-morandi-gold/30'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* 航班號碼 */}
                        <div className="bg-morandi-container px-2 py-1 rounded">
                          <span className="text-sm font-bold text-morandi-primary">
                            {flight.flightNumber}
                          </span>
                        </div>
                        {/* 航空公司 */}
                        <span className="text-sm text-morandi-primary">{flight.airline}</span>
                      </div>
                      {/* 時間 */}
                      <div className="text-right">
                        <span className="text-lg font-bold text-morandi-primary">
                          {flight.scheduledTime}
                        </span>
                        {flight.estimatedTime && flight.estimatedTime !== flight.scheduledTime && (
                          <span className="text-xs text-status-warning ml-2">
                            → {flight.estimatedTime}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs text-morandi-secondary">
                      <div className="flex items-center gap-1">
                        <MapPin size="0.625em" />
                        {origin} → {flight.destinationIata}
                        <span className="ml-1 text-morandi-secondary">({flight.destination})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {flight.terminal && (
                          <span>
                            {COMP_EDITOR_LABELS.LABEL_3761} {flight.terminal}
                          </span>
                        )}
                        {flight.gate && (
                          <span>
                            {COMP_EDITOR_LABELS.LABEL_785} {flight.gate}
                          </span>
                        )}
                        <span
                          className={cn(
                            'px-1.5 py-0.5 rounded text-[0.625rem]',
                            flight.status === COMP_EDITOR_LABELS.預計 ||
                              flight.status === COMP_EDITOR_LABELS.準時
                              ? 'bg-status-success-bg text-status-success'
                              : flight.status === COMP_EDITOR_LABELS.延誤
                                ? 'bg-status-warning-bg text-status-warning'
                                : flight.status === COMP_EDITOR_LABELS.已取消
                                  ? 'bg-status-danger-bg text-status-danger'
                                  : 'bg-morandi-container text-morandi-primary'
                          )}
                        >
                          {flight.status}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
