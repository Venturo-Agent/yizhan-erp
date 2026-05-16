import { useMemo } from 'react'

/**
 * 過濾配置介面
 */
interface FilterConfig<T> {
  /** 狀態欄位名稱 */
  statusField?: keyof T
  /** 用於搜尋的欄位列表 */
  searchFields?: (keyof T)[]
  /** 自訂過濾函數 */
  customFilters?: Array<(item: T) => boolean>
  /** 是否啟用模糊搜尋（預設 true） */
  fuzzySearch?: boolean
  /** 搜尋時是否忽略大小寫（預設 true） */
  caseInsensitive?: boolean
}

/**
 * 資料過濾 Hook
 *
 * 提供統一的資料過濾邏輯，支援狀態過濾、關鍵字搜尋和自訂過濾
 *
 * @param data - 要過濾的資料陣列
 * @param statusFilter - 狀態過濾值（'all' 表示不過濾）
 * @param searchTerm - 搜尋關鍵字
 * @param config - 過濾配置
 * @returns 過濾後的資料陣列
 *
 * @example
 * ```tsx
 * // 基本用法
 * const filteredTours = useDataFiltering(tours, activeStatus, searchQuery, {
 *   statusField: 'status',
 *   searchFields: ['name', 'code', 'location']
 * });
 *
 * // 進階用法 - 帶自訂過濾
 * const filteredOrders = useDataFiltering(orders, statusFilter, searchTerm, {
 *   statusField: 'status',
 *   searchFields: ['order_number', 'contact_person'],
 *   customFilters: [
 *     (order) => order.total_amount > 1000,
 *     (order) => order.is_active
 *   ]
 * });
 * ```
 */
export function useDataFiltering<T extends Record<string, unknown>>(
  data: T[],
  statusFilter: string,
  searchTerm: string,
  config: FilterConfig<T>
): T[] {
  const {
    statusField,
    searchFields = [],
    customFilters = [],
    fuzzySearch = true,
    caseInsensitive = true,
  } = config

  return useMemo(() => {
    return data.filter(item => {
      // 1. 狀態過濾
      if (statusField && statusFilter && statusFilter !== 'all') {
        const itemStatus = item[statusField]
        if (itemStatus !== statusFilter) {
          return false
        }
      }

      // 2. 關鍵字搜尋
      if (searchTerm && searchTerm.trim() !== '' && searchFields.length > 0) {
        const normalizedSearch = caseInsensitive
          ? searchTerm.trim().toLowerCase()
          : searchTerm.trim()

        const matchesSearch = searchFields.some(field => {
          const value = item[field]

          // 跳過 null 或 undefined
          if (value == null) return false

          // 轉換為字串並比對
          const stringValue = String(value)
          const normalizedValue = caseInsensitive ? stringValue.toLowerCase() : stringValue

          if (fuzzySearch) {
            // 模糊搜尋 - 包含關鍵字即可
            return normalizedValue.includes(normalizedSearch)
          } else {
            // 精確搜尋 - 必須完全匹配
            return normalizedValue === normalizedSearch
          }
        })

        if (!matchesSearch) {
          return false
        }
      }

      // 3. 自訂過濾器
      if (customFilters.length > 0) {
        const passesAllFilters = customFilters.every(filter => {
          try {
            return filter(item)
          } catch (_error) {
            return true // 過濾器錯誤時，不排除該項目
          }
        })

        if (!passesAllFilters) {
          return false
        }
      }

      return true
    })
  }, [
    data,
    statusFilter,
    searchTerm,
    statusField,
    searchFields,
    customFilters,
    fuzzySearch,
    caseInsensitive,
  ])
}

/**
 * 多狀態過濾 Hook
 *
 * 支援同時過濾多個狀態值
 *
 * @param data - 要過濾的資料陣列
 * @param statusFilters - 狀態過濾值陣列
 * @param searchTerm - 搜尋關鍵字
 * @param config - 過濾配置
 * @returns 過濾後的資料陣列
 *
 * @example
 * ```tsx
 * // 顯示「待處理」和「進行中」的訂單
 * const filteredOrders = useMultiStatusFiltering(
 *   orders,
 *   ['pending', 'processing'],
 *   searchTerm,
 *   {
 *     statusField: 'status',
 *     searchFields: ['order_number']
 *   }
 * );
 * ```
 */
function _useMultiStatusFiltering<T extends Record<string, unknown>>(
  data: T[],
  statusFilters: string[],
  searchTerm: string,
  config: Omit<FilterConfig<T>, 'statusField'> & { statusField: keyof T }
): T[] {
  const { statusField, ...restConfig } = config

  return useMemo(() => {
    return data.filter(item => {
      // 1. 多狀態過濾
      if (statusFilters.length > 0 && !statusFilters.includes('all')) {
        const itemStatus = item[statusField]
        if (!statusFilters.includes(String(itemStatus))) {
          return false
        }
      }

      // 2. 關鍵字搜尋
      if (searchTerm && searchTerm.trim() !== '' && restConfig.searchFields) {
        const normalizedSearch =
          restConfig.caseInsensitive !== false ? searchTerm.trim().toLowerCase() : searchTerm.trim()

        const matchesSearch = restConfig.searchFields.some(field => {
          const value = item[field]
          if (value == null) return false

          const stringValue = String(value)
          const normalizedValue =
            restConfig.caseInsensitive !== false ? stringValue.toLowerCase() : stringValue

          return normalizedValue.includes(normalizedSearch)
        })

        if (!matchesSearch) {
          return false
        }
      }

      // 3. 自訂過濾器
      if (restConfig.customFilters && restConfig.customFilters.length > 0) {
        return restConfig.customFilters.every(filter => filter(item))
      }

      return true
    })
  }, [data, statusFilters, searchTerm, statusField, restConfig])
}

/**
 * 日期範圍過濾 Hook
 *
 * @param data - 要過濾的資料陣列
 * @param dateField - 日期欄位名稱
 * @param startDate - 開始日期（ISO 字串）
 * @param endDate - 結束日期（ISO 字串）
 * @returns 過濾後的資料陣列
 *
 * @example
 * ```tsx
 * const filteredPayments = useDateRangeFiltering(
 *   payments,
 *   'payment_date',
 *   '2025-01-01',
 *   '2025-01-31'
 * );
 * ```
 */
function _useDateRangeFiltering<T extends Record<string, unknown>>(
  data: T[],
  dateField: keyof T,
  startDate?: string,
  endDate?: string
): T[] {
  return useMemo(() => {
    if (!startDate && !endDate) return data

    return data.filter(item => {
      const itemDate = item[dateField]
      if (!itemDate) return false

      const dateStr = String(itemDate)
      const itemTimestamp = new Date(dateStr).getTime()

      if (startDate) {
        const startTimestamp = new Date(startDate).getTime()
        if (itemTimestamp < startTimestamp) return false
      }

      if (endDate) {
        const endTimestamp = new Date(endDate).getTime()
        if (itemTimestamp > endTimestamp) return false
      }

      return true
    })
  }, [data, dateField, startDate, endDate])
}
