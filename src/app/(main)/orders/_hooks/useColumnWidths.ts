'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// 預設欄位寬度
const DEFAULT_WIDTHS: Record<string, number> = {
  drag: 28,
  seq: 40,
  chinese_name: 80,
  order_code: 60,
  identity: 60,
  passport_name: 120,
  birth_date: 100,
  gender: 50,
  id_number: 100,
  passport_number: 100,
  passport_expiry: 100,
  special_meal: 80,
  total_payable: 80,
  deposit_amount: 80,
  balance: 80,
  remarks: 120,
  room: 100,
  vehicle: 80,
  pnr: 80,
  ticket_number: 120,
  ticketing_deadline: 100,
  flight_cost: 100,
  actions: 80,
}

const STORAGE_KEY = 'memberListColumnWidths'

export function useColumnWidths() {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    if (typeof window === 'undefined') return DEFAULT_WIDTHS
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        return { ...DEFAULT_WIDTHS, ...JSON.parse(saved) }
      }
    } catch {
      // ignore
    }
    return DEFAULT_WIDTHS
  })

  const isInitialMount = useRef(true)

  // 儲存到 localStorage（跳過初次渲染）
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(columnWidths))
  }, [columnWidths])

  // 更新單一欄位寬度
  const setColumnWidth = useCallback((columnId: string, width: number) => {
    setColumnWidths(prev => ({
      ...prev,
      [columnId]: Math.max(30, width), // 最小寬度 30px
    }))
  }, [])

  // 取得欄位寬度
  const getColumnWidth = useCallback(
    (columnId: string) => {
      return columnWidths[columnId] || DEFAULT_WIDTHS[columnId] || 80
    },
    [columnWidths]
  )

  // 重置所有欄位寬度
  const resetColumnWidths = useCallback(() => {
    setColumnWidths(DEFAULT_WIDTHS)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return {
    columnWidths,
    setColumnWidth,
    getColumnWidth,
    resetColumnWidths,
  }
}
