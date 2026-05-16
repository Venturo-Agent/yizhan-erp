'use client'

import { getTodayString } from '@/lib/utils/format-date'

import _React, { useState, useCallback } from 'react'
import { TourFormData } from '../../types'
import { searchFlightAction, type FlightData } from '@/lib/actions/flight-actions'
import { alert } from '@/lib/ui/alert-dialog'
import { parseDate } from './utils'
import { COMP_EDITOR_LABELS } from '../../../constants/labels'

// 航段資訊類型
export interface FlightSegment {
  flightNumber: string
  airline: string
  departureAirport: string
  arrivalAirport: string
  departureTime: string
  arrivalTime: string
  duration?: string
}

interface FlightSearchDialogProps {
  data: TourFormData
  updateFlightField: (
    flightType: 'outboundFlight' | 'returnFlight',
    field: string,
    value: string | boolean
  ) => void
  updateFlightFields?: (
    flightType: 'outboundFlight' | 'returnFlight',
    fields: Record<string, string>
  ) => void
}

// 將 FlightData 轉換為 FlightSegment
function flightDataToSegment(data: FlightData): FlightSegment {
  return {
    flightNumber: data.flightNumber,
    airline: data.airline,
    departureAirport: data.departure.iata,
    arrivalAirport: data.arrival.iata,
    departureTime: data.departure.time,
    arrivalTime: data.arrival.time,
    duration: data.duration,
  }
}

export function useFlightSearch({
  data,
  updateFlightField,
  updateFlightFields,
}: FlightSearchDialogProps) {
  const [loadingOutbound, setLoadingOutbound] = useState(false)
  const [loadingReturn, setLoadingReturn] = useState(false)
  // 多航段選擇狀態
  const [outboundSegments, setOutboundSegments] = useState<FlightSegment[]>([])
  const [returnSegments, setReturnSegments] = useState<FlightSegment[]>([])

  // 查詢去程航班
  const handleSearchOutbound = useCallback(async () => {
    const flightNumber = data.outboundFlight?.flightNumber
    const dateStr = data.outboundFlight?.departureDate // 格式 MM/DD

    if (!flightNumber) {
      void alert(COMP_EDITOR_LABELS.請先輸入航班號碼, 'warning')
      return
    }

    // 組合完整日期 YYYY-MM-DD
    let fullDate = ''
    if (dateStr && data.departureDate) {
      const depDate = parseDate(data.departureDate)
      if (depDate) {
        const [month, day] = dateStr.split('/').map(Number)
        const year = depDate.getFullYear()
        fullDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      }
    }

    if (!fullDate) {
      // 使用今天日期
      fullDate = getTodayString()
    }

    setLoadingOutbound(true)
    setOutboundSegments([]) // 清空之前的航段
    try {
      const result = await searchFlightAction(flightNumber, fullDate)
      if (result.error) {
        void alert(result.error, 'error')
        return
      }
      // 多航段：顯示選擇器
      if (result.segments && result.segments.length > 1) {
        setOutboundSegments(result.segments.map(flightDataToSegment))
        return
      }
      // 單一航段：直接更新
      if (result.data) {
        // 使用批次更新（一次更新所有欄位）
        const fields: Record<string, string> = {
          airline: result.data.airline,
          departureAirport: result.data.departure.iata,
          arrivalAirport: result.data.arrival.iata,
          departureTime: result.data.departure.time,
          arrivalTime: result.data.arrival.time,
        }
        if (result.data.duration) {
          fields.duration = result.data.duration
        }

        if (updateFlightFields) {
          updateFlightFields('outboundFlight', fields)
        } else {
          // fallback: 逐一更新
          Object.entries(fields).forEach(([key, value]) => {
            updateFlightField('outboundFlight', key, value)
          })
        }
      }
    } catch {
      void alert(COMP_EDITOR_LABELS.查詢航班時發生錯誤, 'error')
    } finally {
      setLoadingOutbound(false)
    }
  }, [
    data.outboundFlight?.flightNumber,
    data.outboundFlight?.departureDate,
    data.departureDate,
    updateFlightField,
    updateFlightFields,
  ])

  // 選擇去程航段
  const handleSelectOutboundSegment = useCallback(
    (segment: FlightSegment) => {
      const fields: Record<string, string> = {
        airline: segment.airline,
        departureAirport: segment.departureAirport,
        arrivalAirport: segment.arrivalAirport,
        departureTime: segment.departureTime,
        arrivalTime: segment.arrivalTime,
      }
      if (segment.duration) {
        fields.duration = segment.duration
      }
      if (updateFlightFields) {
        updateFlightFields('outboundFlight', fields)
      } else {
        Object.entries(fields).forEach(([key, value]) => {
          updateFlightField('outboundFlight', key, value)
        })
      }
      setOutboundSegments([])
    },
    [updateFlightField, updateFlightFields]
  )

  // 查詢回程航班
  const handleSearchReturn = useCallback(async () => {
    const flightNumber = data.returnFlight?.flightNumber
    const dateStr = data.returnFlight?.departureDate // 格式 MM/DD

    if (!flightNumber) {
      void alert(COMP_EDITOR_LABELS.請先輸入航班號碼, 'warning')
      return
    }

    // 組合完整日期 YYYY-MM-DD
    let fullDate = ''
    if (dateStr && data.departureDate) {
      const depDate = parseDate(data.departureDate)
      if (depDate) {
        const [month, day] = dateStr.split('/').map(Number)
        let year = depDate.getFullYear()
        // 如果回程月份小於出發月份，表示跨年
        if (month < depDate.getMonth() + 1) {
          year += 1
        }
        fullDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      }
    }

    if (!fullDate) {
      fullDate = getTodayString()
    }

    setLoadingReturn(true)
    setReturnSegments([]) // 清空之前的航段
    try {
      const result = await searchFlightAction(flightNumber, fullDate)
      if (result.error) {
        void alert(result.error, 'error')
        return
      }
      // 多航段：顯示選擇器
      if (result.segments && result.segments.length > 1) {
        setReturnSegments(result.segments.map(flightDataToSegment))
        return
      }
      // 單一航段：直接更新
      if (result.data) {
        // 使用批次更新（一次更新所有欄位）
        const fields: Record<string, string> = {
          airline: result.data.airline,
          departureAirport: result.data.departure.iata,
          arrivalAirport: result.data.arrival.iata,
          departureTime: result.data.departure.time,
          arrivalTime: result.data.arrival.time,
        }
        if (result.data.duration) {
          fields.duration = result.data.duration
        }

        if (updateFlightFields) {
          updateFlightFields('returnFlight', fields)
        } else {
          // fallback: 逐一更新
          Object.entries(fields).forEach(([key, value]) => {
            updateFlightField('returnFlight', key, value)
          })
        }
      }
    } catch {
      void alert(COMP_EDITOR_LABELS.查詢航班時發生錯誤, 'error')
    } finally {
      setLoadingReturn(false)
    }
  }, [
    data.returnFlight?.flightNumber,
    data.returnFlight?.departureDate,
    data.departureDate,
    updateFlightField,
    updateFlightFields,
  ])

  // 選擇回程航段
  const handleSelectReturnSegment = useCallback(
    (segment: FlightSegment) => {
      const fields: Record<string, string> = {
        airline: segment.airline,
        departureAirport: segment.departureAirport,
        arrivalAirport: segment.arrivalAirport,
        departureTime: segment.departureTime,
        arrivalTime: segment.arrivalTime,
      }
      if (segment.duration) {
        fields.duration = segment.duration
      }
      if (updateFlightFields) {
        updateFlightFields('returnFlight', fields)
      } else {
        Object.entries(fields).forEach(([key, value]) => {
          updateFlightField('returnFlight', key, value)
        })
      }
      setReturnSegments([])
    },
    [updateFlightField, updateFlightFields]
  )

  // 清除航段選擇
  const clearOutboundSegments = useCallback(() => setOutboundSegments([]), [])
  const clearReturnSegments = useCallback(() => setReturnSegments([]), [])

  return {
    loadingOutbound,
    loadingReturn,
    handleSearchOutbound,
    handleSearchReturn,
    // 多航段相關
    outboundSegments,
    returnSegments,
    handleSelectOutboundSegment,
    handleSelectReturnSegment,
    clearOutboundSegments,
    clearReturnSegments,
  }
}
