'use client'

/**
 * useReferenceData Hook
 * React Hook 用於載入和使用 PNR 參考資料
 */

import { useState, useEffect, useCallback } from 'react'
import {
  getReferenceData,
  refreshReferenceData,
  getAirlineName,
  getAirportName,
  getCityName,
  getBookingClassDescription,
  getSSRDescription,
  getSSRCategory,
  getStatusDescription,
  getStatusCategory,
  isConfirmedStatus,
  isWaitlistStatus,
  isCancelledStatus,
  getCacheStatus,
  type ReferenceData,
} from './reference-data'

interface UseReferenceDataOptions {
  /** 是否啟用資料載入（預設 true）*/
  enabled?: boolean
}

interface UseReferenceDataResult {
  // 狀態
  isLoading: boolean
  isReady: boolean
  error: string | null

  // 重新載入
  refresh: () => Promise<void>

  // 航空公司
  getAirlineName: (code: string, preferChinese?: boolean) => string

  // 機場
  getAirportName: (code: string, preferChinese?: boolean) => string
  getCityName: (airportCode: string) => string

  // 艙等
  getBookingClassDescription: (code: string) => string

  // SSR
  getSSRDescription: (code: string, preferChinese?: boolean) => string
  getSSRCategory: (code: string) => string | null

  // 狀態碼
  getStatusDescription: (code: string, preferChinese?: boolean) => string
  getStatusCategory: (code: string) => string | null
  isConfirmedStatus: (code: string) => boolean
  isWaitlistStatus: (code: string) => boolean
  isCancelledStatus: (code: string) => boolean

  // 原始資料（進階使用）
  data: ReferenceData | null

  // 快取狀態
  cacheStatus: ReturnType<typeof getCacheStatus>
}

/**
 * 使用 PNR 參考資料的 React Hook
 *
 * @param options.enabled - 是否啟用資料載入（預設 true）
 *
 * @example
 * ```tsx
 * // 基本用法（立即載入）
 * const { isReady, getAirlineName, getAirportName } = useReferenceData()
 *
 * // 條件載入（Dialog 開啟時才載入）
 * const { isReady, getAirlineName } = useReferenceData({ enabled: isOpen })
 *
 * if (!isReady) return <Loading />
 *
 * return (
 *   <div>
 *     航空公司: {getAirlineName('BR')} // 長榮航空
 *     機場: {getAirportName('TPE')} // 桃園國際機場
 *   </div>
 * )
 * ```
 */
export function useReferenceData(options: UseReferenceDataOptions = {}): UseReferenceDataResult {
  const { enabled = true } = options

  const [isLoading, setIsLoading] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ReferenceData | null>(null)
  const [cacheStatus, setCacheStatus] = useState(getCacheStatus())

  // 條件載入：只在 enabled 為 true 時載入
  useEffect(() => {
    if (!enabled) {
      return
    }

    let isMounted = true

    async function loadData() {
      try {
        setIsLoading(true)
        setError(null)
        const result = await getReferenceData()
        if (isMounted) {
          setData(result)
          setIsReady(true)
          setCacheStatus(getCacheStatus())
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : '載入參考資料失敗')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [enabled])

  // 重新載入
  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await refreshReferenceData()
      setData(result)
      setIsReady(true)
      setCacheStatus(getCacheStatus())
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入參考資料失敗')
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    isLoading,
    isReady,
    error,
    refresh,
    getAirlineName,
    getAirportName,
    getCityName,
    getBookingClassDescription,
    getSSRDescription,
    getSSRCategory,
    getStatusDescription,
    getStatusCategory,
    isConfirmedStatus,
    isWaitlistStatus,
    isCancelledStatus,
    data,
    cacheStatus,
  }
}

