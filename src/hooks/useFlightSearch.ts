'use client'

import { getTodayString, formatDate } from '@/lib/utils/format-date'
import { useState, useCallback } from 'react'
import { searchFlightAction, type FlightData } from '@/lib/actions/flight-actions'
import { alertError, alert } from '@/lib/ui/alert-dialog'
import { COMMON_MESSAGES } from '@/constants/messages'
import { FlightInfo, FlightSegmentInfo } from '@/types/flight.types'

interface UseFlightSearchProps {
  outboundFlight: FlightInfo | null
  setOutboundFlight: (flight: FlightInfo | null) => void
  returnFlight: FlightInfo | null
  setReturnFlight: (flight: FlightInfo | null) => void
  departureDate: string
  days: string
}

// 將 FlightData 轉換為 FlightSegmentInfo
function flightDataToSegment(data: FlightData): FlightSegmentInfo {
  return {
    flightNumber: data.flightNumber,
    airline: data.airline,
    departureAirport: data.departure.iata,
    departureAirportName: data.departure.airport,
    arrivalAirport: data.arrival.iata,
    arrivalAirportName: data.arrival.airport,
    departureTime: data.departure.time,
    arrivalTime: data.arrival.time,
  }
}

/**
 * Hook for managing flight search logic
 * Includes: outbound and return flight search
 */
export function useFlightSearch({
  outboundFlight,
  setOutboundFlight,
  returnFlight,
  setReturnFlight,
  departureDate,
  days,
}: UseFlightSearchProps) {
  const [loadingOutboundFlight, setLoadingOutboundFlight] = useState(false)
  const [loadingReturnFlight, setLoadingReturnFlight] = useState(false)
  // 多航段選擇狀態
  const [outboundSegments, setOutboundSegments] = useState<FlightSegmentInfo[]>([])
  const [returnSegments, setReturnSegments] = useState<FlightSegmentInfo[]>([])

  // Search outbound flight
  const handleSearchOutboundFlight = useCallback(async () => {
    const flightNumber = outboundFlight?.flightNumber
    if (!flightNumber) {
      await alertError('請先輸入航班號碼')
      return
    }

    setLoadingOutboundFlight(true)
    setOutboundSegments([]) // 清空之前的航段
    try {
      const result = await searchFlightAction(flightNumber, departureDate || getTodayString())
      if (result.error) {
        await alertError(result.error)
        return
      }
      // 多航段：顯示選擇器
      if (result.segments && result.segments.length > 1) {
        setOutboundSegments(result.segments.map(flightDataToSegment))
        return
      }
      // 單一航段：直接設定
      if (result.data) {
        const flightData = result.data
        setOutboundFlight({
          flightNumber: flightNumber,
          airline: flightData.airline,
          departureAirport: flightData.departure.iata,
          arrivalAirport: flightData.arrival.iata,
          departureTime: flightData.departure.time,
          arrivalTime: flightData.arrival.time,
          departureDate: outboundFlight?.departureDate || '',
        })
        // 顯示警告（如果資料不完整）
        if (result.warning) {
          await alert(result.warning, 'warning')
        }
      }
    } catch {
      await alertError(COMMON_MESSAGES.OPERATION_FAILED)
    } finally {
      setLoadingOutboundFlight(false)
    }
  }, [
    outboundFlight?.flightNumber,
    outboundFlight?.departureDate,
    departureDate,
    setOutboundFlight,
  ])

  // 選擇去程航段
  const handleSelectOutboundSegment = useCallback(
    (segment: FlightSegmentInfo) => {
      setOutboundFlight({
        flightNumber: segment.flightNumber,
        airline: segment.airline,
        departureAirport: segment.departureAirport,
        arrivalAirport: segment.arrivalAirport,
        departureTime: segment.departureTime,
        arrivalTime: segment.arrivalTime,
        departureDate: outboundFlight?.departureDate || '',
      })
      setOutboundSegments([])
    },
    [outboundFlight?.departureDate, setOutboundFlight]
  )

  // Search return flight
  const handleSearchReturnFlight = useCallback(async () => {
    const flightNumber = returnFlight?.flightNumber
    if (!flightNumber) {
      await alertError('請先輸入航班號碼')
      return
    }

    // Calculate return date
    let returnDateStr = getTodayString()
    if (departureDate && days) {
      const returnDate = new Date(departureDate)
      returnDate.setDate(returnDate.getDate() + parseInt(days) - 1)
      returnDateStr = formatDate(returnDate)
    }

    setLoadingReturnFlight(true)
    setReturnSegments([]) // 清空之前的航段
    try {
      const result = await searchFlightAction(flightNumber, returnDateStr)
      if (result.error) {
        await alertError(result.error)
        return
      }
      // 多航段：顯示選擇器
      if (result.segments && result.segments.length > 1) {
        setReturnSegments(result.segments.map(flightDataToSegment))
        return
      }
      // 單一航段：直接設定
      if (result.data) {
        const flightData = result.data
        setReturnFlight({
          flightNumber: flightNumber,
          airline: flightData.airline,
          departureAirport: flightData.departure.iata,
          arrivalAirport: flightData.arrival.iata,
          departureTime: flightData.departure.time,
          arrivalTime: flightData.arrival.time,
          departureDate: returnFlight?.departureDate || '',
        })
        // 顯示警告（如果資料不完整）
        if (result.warning) {
          await alert(result.warning, 'warning')
        }
      }
    } catch {
      await alertError('查詢航班時發生錯誤')
    } finally {
      setLoadingReturnFlight(false)
    }
  }, [
    returnFlight?.flightNumber,
    returnFlight?.departureDate,
    departureDate,
    days,
    setReturnFlight,
  ])

  // 選擇回程航段
  const handleSelectReturnSegment = useCallback(
    (segment: FlightSegmentInfo) => {
      setReturnFlight({
        flightNumber: segment.flightNumber,
        airline: segment.airline,
        departureAirport: segment.departureAirport,
        arrivalAirport: segment.arrivalAirport,
        departureTime: segment.departureTime,
        arrivalTime: segment.arrivalTime,
        departureDate: returnFlight?.departureDate || '',
      })
      setReturnSegments([])
    },
    [returnFlight?.departureDate, setReturnFlight]
  )

  // 清除航段選擇
  const clearOutboundSegments = useCallback(() => setOutboundSegments([]), [])
  const clearReturnSegments = useCallback(() => setReturnSegments([]), [])

  return {
    loadingOutboundFlight,
    loadingReturnFlight,
    handleSearchOutboundFlight,
    handleSearchReturnFlight,
    // 多航段相關
    outboundSegments,
    returnSegments,
    handleSelectOutboundSegment,
    handleSelectReturnSegment,
    clearOutboundSegments,
    clearReturnSegments,
  }
}
