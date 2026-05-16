import React from 'react'
import { useCountries, useCities } from '@/data'
import { logger } from '@/lib/utils/logger'
import { CityOption } from '../types'
import { COMP_EDITOR_LABELS } from '../../constants/labels'

/**
 * 🎯 軍事級別的地區資料管理 Hook
 *
 * 功能：
 * - 自動載入國家和城市資料
 * - 管理國家/城市選擇狀態
 * - 處理國家代碼和名稱的對應關係
 * - 防止競態條件和狀態不一致
 *
 * 修復項目：
 * 1. ✅ 修復 initialCountryCode 的依賴問題
 * 2. ✅ 處理 countries 異步載入的競態條件
 * 3. ✅ 簡化狀態同步邏輯，避免衝突
 * 4. ✅ 添加錯誤處理和日誌
 */
export function useRegionData(data: { country?: string }) {
  const { items: countries } = useCountries()
  const { items: cities } = useCities()

  // 狀態管理
  const [selectedCountry, setSelectedCountry] = React.useState<string>(data.country || '')
  const [selectedCountryCode, setSelectedCountryCode] = React.useState<string>('')

  // Refs 用於追蹤狀態
  const hasFetchedRef = React.useRef(false)
  const isInitializedRef = React.useRef(false)

  // 📦 階段1：SWR 自動載入 regions 資料
  React.useEffect(() => {
    if (countries.length > 0 && !hasFetchedRef.current) {
      hasFetchedRef.current = true
      logger.log(COMP_EDITOR_LABELS.useRegionData_國家和城市資料已載入_SWR)
    }
  }, [countries.length])

  // 📦 階段2：當 countries 載入完成後，初始化 country code
  React.useEffect(() => {
    // 必須等待 countries 載入完成
    if (countries.length === 0) return

    // 如果沒有 data.country，清空狀態
    if (!data.country) {
      if (selectedCountry !== '') setSelectedCountry('')
      if (selectedCountryCode !== '') setSelectedCountryCode('')
      isInitializedRef.current = true
      return
    }

    // 查找對應的國家
    const matchedCountry = countries.find(c => c.name === data.country)

    if (!matchedCountry) {
      logger.warn(`[useRegionData] 找不到國家: ${data.country}`)
      if (selectedCountryCode !== '') setSelectedCountryCode('')
      return
    }

    if (!matchedCountry.code) {
      logger.warn(`[useRegionData] 國家 ${data.country} 缺少 code`)
      if (selectedCountryCode !== '') setSelectedCountryCode('')
      return
    }

    // 同步 selectedCountry
    if (selectedCountry !== data.country) {
      logger.log(`[useRegionData] 同步 selectedCountry: ${data.country}`)
      setSelectedCountry(data.country)
    }

    // 同步 selectedCountryCode
    if (selectedCountryCode !== matchedCountry.code) {
      logger.log(`[useRegionData] 設定 countryCode: ${matchedCountry.code} for ${data.country}`)
      setSelectedCountryCode(matchedCountry.code)
    }

    isInitializedRef.current = true
  }, [countries, data.country, selectedCountry, selectedCountryCode])

  // 📦 計算衍生資料

  // 所有啟用的國家列表（按使用次數排序，常用的在前面）
  const allDestinations = React.useMemo(() => {
    const result = countries
      .filter(c => c.is_active)
      .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
      .map(c => ({
        id: c.id,
        code: c.code || '',
        name: c.name,
      }))
    logger.log(`[useRegionData] allDestinations 計算完成: ${result.length} 個國家`)
    return result
  }, [countries])

  // 國家名稱到代碼的對照表
  const countryNameToCode = React.useMemo(() => {
    const map: Record<string, string> = {}
    allDestinations.forEach(dest => {
      if (dest.code) {
        map[dest.name] = dest.code
      }
    })
    return map
  }, [allDestinations])

  // 根據選中的國家代碼取得城市列表
  const availableCities = React.useMemo<CityOption[]>(() => {
    if (!selectedCountryCode) {
      logger.log(COMP_EDITOR_LABELS.useRegionData_selectedCountryCode_為空_返回空城市列表)
      return []
    }

    // 根據 country code 找到對應的 country
    const country = countries.find(c => c.code === selectedCountryCode)

    if (!country) {
      logger.warn(`[useRegionData] 找不到 code=${selectedCountryCode} 的國家`)
      return []
    }

    // 返回該國家有機場代碼的城市（有 airport_code = 主要城市）
    // 按使用次數排序，常用的在前面
    const result = cities
      .filter(c => c.country_id === country.id && c.is_active && c.airport_code)
      .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
      .map(c => ({
        id: c.id,
        code: c.airport_code!,
        name: c.name,
      }))

    logger.log(
      `[useRegionData] availableCities 計算完成: ${result.length} 個城市 for ${country.name}`
    )
    return result
  }, [selectedCountryCode, countries, cities])

  // 📊 Debug 資訊（開發環境）
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      logger.log(COMP_EDITOR_LABELS.useRegionData_狀態更新, {
        'data.country': data.country,
        selectedCountry,
        selectedCountryCode,
        'countries.length': countries.length,
        'cities.length': cities.length,
        'availableCities.length': availableCities.length,
        isInitialized: isInitializedRef.current,
      })
    }
  }, [
    data.country,
    selectedCountry,
    selectedCountryCode,
    countries.length,
    cities.length,
    availableCities.length,
  ])

  return {
    selectedCountry,
    setSelectedCountry,
    selectedCountryCode,
    setSelectedCountryCode,
    allDestinations,
    availableCities,
    countryNameToCode,
  }
}
