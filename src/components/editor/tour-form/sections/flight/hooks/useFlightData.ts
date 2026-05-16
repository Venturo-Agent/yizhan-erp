'use client'

import { useEffect, useRef, useMemo } from 'react'
import { TourFormData } from '../../../types'
import { parseDate } from '../utils'

interface UseFlightDataProps {
  data: TourFormData
  updateFlightField: (
    flightType: 'outboundFlight' | 'returnFlight',
    field: string,
    value: string | boolean
  ) => void
}

export function useFlightData({ data, updateFlightField }: UseFlightDataProps) {
  // Track previous values to detect changes
  const prevOutboundRef = useRef({
    airline: data.outboundFlight?.airline || '',
    arrivalAirport: data.outboundFlight?.arrivalAirport || '',
  })

  // Auto-fill return flight when outbound changes
  useEffect(() => {
    const currentAirline = data.outboundFlight?.airline || ''
    const currentArrival = data.outboundFlight?.arrivalAirport || ''
    const prevAirline = prevOutboundRef.current.airline
    const prevArrival = prevOutboundRef.current.arrivalAirport

    // If outbound airline changed and return airline is empty or was same as previous
    if (currentAirline !== prevAirline) {
      const returnAirline = data.returnFlight?.airline || ''
      if (!returnAirline || returnAirline === prevAirline) {
        updateFlightField('returnFlight', 'airline', currentAirline)
      }
    }

    // If outbound arrival airport changed, set it as return departure airport
    if (currentArrival !== prevArrival) {
      const returnDeparture = data.returnFlight?.departureAirport || ''
      if (!returnDeparture || returnDeparture === prevArrival) {
        updateFlightField('returnFlight', 'departureAirport', currentArrival)
      }
    }

    // Update ref
    prevOutboundRef.current = {
      airline: currentAirline,
      arrivalAirport: currentArrival,
    }
  }, [
    data.outboundFlight?.airline,
    data.outboundFlight?.arrivalAirport,
    data.returnFlight?.airline,
    data.returnFlight?.departureAirport,
    updateFlightField,
  ])

  // 自動計算行程天數（根據出發日期和回程日期）
  const tripDays = useMemo(() => {
    if (!data.departureDate || !data.returnFlight?.departureDate) return 0

    const departureDate = parseDate(data.departureDate)
    if (!departureDate) return 0

    // 回程日期格式是 MM/DD，需要補上年份
    const returnDateStr = data.returnFlight.departureDate
    const [month, day] = returnDateStr.split('/').map(Number)
    if (!month || !day) return 0

    // 使用出發年份，如果回程月份小於出發月份則加一年
    let returnYear = departureDate.getFullYear()
    if (month < departureDate.getMonth() + 1) {
      returnYear += 1
    }

    const returnDate = new Date(returnYear, month - 1, day)

    // 計算天數差 + 1（包含出發和回程當天）
    const diffTime = returnDate.getTime() - departureDate.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1

    return diffDays > 0 ? diffDays : 0
  }, [data.departureDate, data.returnFlight?.departureDate])

  return {
    tripDays,
  }
}
