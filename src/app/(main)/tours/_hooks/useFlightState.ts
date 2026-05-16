'use client'

/**
 * useFlightState — 航班狀態管理 hook
 *
 * 從 TourItineraryTab 抽出，包含：
 * - 去程 / 回程航班陣列（FlightInfo[]）
 * - 去程 / 回程搜尋號碼 + 日期
 * - 自動橋接 useFlightSearch（搜尋 + 選擇航段）
 */

import { useState, useEffect } from 'react'
import { useFlightSearch } from '@/hooks'
import type { FlightInfo } from '@/types/flight.types'
import type { Tour } from '@/stores/types'

const emptyFlight: FlightInfo = {
  airline: '',
  flightNumber: '',
  departureAirport: '',
  departureTime: '',
  arrivalAirport: '',
  arrivalTime: '',
}

interface UseFlightStateParams {
  tour: Tour
  numDays: number
}

export function useFlightState({ tour, numDays }: UseFlightStateParams) {
  const [outboundFlights, setOutboundFlights] = useState<FlightInfo[]>([{ ...emptyFlight }])
  const [returnFlights, setReturnFlights] = useState<FlightInfo[]>([{ ...emptyFlight }])
  const [outboundFlightNumber, setOutboundFlightNumber] = useState('')
  const [outboundFlightDate, setOutboundFlightDate] = useState('')
  const [returnFlightNumber, setReturnFlightNumber] = useState('')
  const [returnFlightDate, setReturnFlightDate] = useState('')

  // Search flight state（橋接 useFlightSearch）
  const [searchOutboundFlight, setSearchOutboundFlight] = useState<FlightInfo | null>(null)
  const [searchReturnFlight, setSearchReturnFlight] = useState<FlightInfo | null>(null)

  useEffect(() => {
    setSearchOutboundFlight(
      outboundFlightNumber ? ({ flightNumber: outboundFlightNumber } as FlightInfo) : null
    )
  }, [outboundFlightNumber])

  useEffect(() => {
    setSearchReturnFlight(
      returnFlightNumber ? ({ flightNumber: returnFlightNumber } as FlightInfo) : null
    )
  }, [returnFlightNumber])

  const {
    loadingOutboundFlight: _searchingOutbound,
    loadingReturnFlight: _searchingReturn,
    outboundSegments,
    returnSegments,
    handleSearchOutboundFlight,
    handleSearchReturnFlight,
    handleSelectOutboundSegment,
    handleSelectReturnSegment,
    clearOutboundSegments,
    clearReturnSegments,
  } = useFlightSearch({
    outboundFlight: searchOutboundFlight,
    setOutboundFlight: flight => {
      if (flight) {
        setOutboundFlights(prev => {
          const emptyIdx = prev.findIndex(f => !f.flightNumber && !f.airline)
          if (emptyIdx !== -1) {
            return prev.map((f, i) => (i === emptyIdx ? flight : f))
          }
          return [...prev, flight]
        })
      }
      setOutboundFlightNumber('')
    },
    returnFlight: searchReturnFlight,
    setReturnFlight: flight => {
      if (flight) {
        setReturnFlights(prev => {
          const emptyIdx = prev.findIndex(f => !f.flightNumber && !f.airline)
          if (emptyIdx !== -1) {
            return prev.map((f, i) => (i === emptyIdx ? flight : f))
          }
          return [...prev, flight]
        })
      }
      setReturnFlightNumber('')
    },
    departureDate: outboundFlightDate || tour.departure_date || '',
    days: String(numDays),
  })

  return {
    outboundFlights,
    setOutboundFlights,
    returnFlights,
    setReturnFlights,
    outboundFlightNumber,
    setOutboundFlightNumber,
    outboundFlightDate,
    setOutboundFlightDate,
    returnFlightNumber,
    setReturnFlightNumber,
    returnFlightDate,
    setReturnFlightDate,
    outboundSegments,
    returnSegments,
    handleSearchOutboundFlight,
    handleSearchReturnFlight,
    handleSelectOutboundSegment,
    handleSelectReturnSegment,
    clearOutboundSegments,
    clearReturnSegments,
  }
}
