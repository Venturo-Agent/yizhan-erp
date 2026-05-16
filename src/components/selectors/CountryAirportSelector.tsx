'use client'

import { useState, useMemo, useCallback } from 'react'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { FormDialog } from '@/components/dialog/form-dialog'
import { useAirports } from '@/app/(main)/tours/_hooks/useAirports'
import { useCountries, invalidateCountries } from '@/data' // 🔧 核心表架構
import { useCountryAirports } from '@/data/hooks/useCountryAirports'
import { SELECTORS_LABELS } from './constants/labels'
import { logger } from '@/lib/utils/logger'

const COMPONENT_LABELS = {
  ADD_COUNTRY: '新增國家',
  COUNTRY_NAME: '國家名稱',
  ENGLISH_NAME: '英文名稱',
} as const

// 判斷是否為台灣（支援多種寫法）
const _isTaiwanCountry = (country: string | undefined | null): boolean => {
  if (!country) return false
  const normalized = country.trim().toLowerCase()
  return normalized === '台灣' || normalized === 'taiwan' || normalized === '臺灣'
}

interface CountryAirportSelectorProps {
  /** 國家值（向下相容，優先用 countryName）*/
  country?: string
  /** 國家名稱（新版，建議使用） */
  countryName?: string
  /** 機場代碼值 */
  airportCode: string
  /** 國家變更回調（🔧 核心表架構：傳完整資料）*/
  onCountryChange: (data: { id: string; name: string; code: string }) => void
  /** 機場代碼變更回調 */
  onAirportChange: (airportCode: string, cityName: string) => void
  /** 是否在 Dialog 內使用（禁用 Portal） */
  disablePortal?: boolean
  /** 是否顯示國家標籤 */
  showLabels?: boolean
  /** 國家列表（可選，不傳則從 hook 取得） */
  countries?: Array<{ id: string; name: string; is_active: boolean }>
}

export function CountryAirportSelector({
  country,
  countryName,
  airportCode,
  onCountryChange,
  onAirportChange,
  disablePortal = false,
  showLabels = true,
  countries: externalCountries,
}: CountryAirportSelectorProps) {
  // 🔧 核心表架構：用 useCountries 取得完整資料
  const { items: countriesData } = useCountries()

  const {
    countries: hookCountries,
    countryNameToCode,
    getAirport,
    addAirport,
    loading,
  } = useAirports({ enabled: true })

  // 🔧 新架構：依國家查所有機場 + 陸路城市（同城多機場分開列）
  const currentCountryCode =
    countriesData.find(c => c.name === (countryName || country || ''))?.code ||
    countryNameToCode[countryName || country || '']
  const { options: countryAirportOptions } = useCountryAirports(currentCountryCode)

  // 向下相容：優先用 countryName，fallback 到 country
  const displayCountryName = countryName || country || ''

  // 新增國家 Dialog 狀態
  const [createCountryDialogOpen, setCreateCountryDialogOpen] = useState(false)
  const [newCountryName, setNewCountryName] = useState('')
  const [newCountryNameEn, setNewCountryNameEn] = useState('')
  const [newCountryCode, setNewCountryCode] = useState('')
  const [isCountrySubmitting, setIsCountrySubmitting] = useState(false)

  // 新增機場 Dialog 狀態
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newCityName, setNewCityName] = useState('')
  const [newIataCode, setNewIataCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 國家選項：優先用 countriesData（有完整 id），按 usage_count 排序（常用在前）
  const countryOptions = useMemo(() => {
    if (externalCountries) {
      return externalCountries
        .filter(c => c.is_active)
        .sort(
          (a, b) =>
            ((b as { usage_count?: number }).usage_count || 0) -
            ((a as { usage_count?: number }).usage_count || 0)
        )
        .map(c => ({ value: c.name, label: c.name }))
    }
    // 優先用 countriesData（有 id），fallback 到 hookCountries
    if (countriesData.length > 0) {
      return countriesData
        .filter(c => c.is_active)
        .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
        .map(c => ({ value: c.name, label: c.name }))
    }
    return hookCountries.map(c => ({ value: c, label: c }))
  }, [externalCountries, countriesData, hookCountries])

  // 🔧 新架構：該國所有機場 + 沒機場的城市（同城多機場分開列）
  const availableAirports = useMemo(() => {
    if (!displayCountryName) return []
    return countryAirportOptions.map(opt => ({ value: opt.value, label: opt.label }))
  }, [displayCountryName, countryAirportOptions])

  // 🔧 核心表架構：傳完整國家資料
  const handleCountryChange = useCallback(
    (newCountryName: string) => {
      // 從核心表取得完整資料
      const countryData = countriesData.find(c => c.name === newCountryName)

      if (!countryData) {
        logger.warn(`找不到國家資料: ${newCountryName}，使用 fallback`)
        // Fallback：仍然呼叫 onCountryChange，但用 countryNameToCode 取得 code
        const code = countryNameToCode[newCountryName] || ''
        onCountryChange({
          id: '', // 沒有 id，但至少有名稱
          name: newCountryName,
          code: code,
        })
        return
      }

      // 傳完整資料給父元件
      onCountryChange({
        id: countryData.id,
        name: countryData.name,
        code: countryData.code || '',
      })
    },
    [countriesData, countryNameToCode, onCountryChange]
  )

  // 處理快速新增國家
  const handleCreateCountry = useCallback(async (searchText: string) => {
    setNewCountryName(searchText)
    setNewCountryNameEn('')
    setNewCountryCode('')
    setCreateCountryDialogOpen(true)
    return null
  }, [])

  // 提交新增國家
  const handleCountryDialogSubmit = async () => {
    const name = newCountryName.trim()
    const code = newCountryCode.trim().toUpperCase()
    if (!name || code.length !== 2) return

    setIsCountrySubmitting(true)
    try {
      const { supabase } = await import('@/lib/supabase/client')
      const { data: created, error } = await supabase
        .from('countries')
        .insert({
          id: crypto.randomUUID(),
          name,
          name_en: newCountryNameEn.trim() || name,
          code,
          is_active: true,
          has_regions: false,
          display_order: 999,
        })
        .select('id, name, code')
        .single()

      if (error) {
        logger.error('Failed to create country:', error.message)
        return
      }

      if (created) {
        await invalidateCountries()
        onCountryChange({ id: created.id, name: created.name, code: created.code || '' })
      }
      setCreateCountryDialogOpen(false)
    } catch (err) {
      logger.error('Failed to create country:', err)
    } finally {
      setIsCountrySubmitting(false)
    }
  }

  // 處理機場代碼變更
  const handleAirportChange = useCallback(
    (code: string) => {
      const airport = getAirport(code)
      const cityName = airport?.city_name_zh || airport?.city_name_en || code
      onAirportChange(code, cityName)
    },
    [getAirport, onAirportChange]
  )

  // 處理快速新增機場（Combobox onCreate 回調）
  const handleCreateAirport = useCallback(async (searchText: string) => {
    setNewCityName(searchText)
    setNewIataCode('')
    setCreateDialogOpen(true)
    return null // 不自動選取，等 Dialog 提交後手動處理
  }, [])

  // 提交新增機場
  const handleDialogSubmit = async () => {
    const code = newIataCode.trim().toUpperCase()
    if (code.length !== 3) return

    const countryCode = countryNameToCode[displayCountryName]
    if (!countryCode) return

    setIsSubmitting(true)
    try {
      await addAirport({
        iata_code: code,
        city_name_zh: newCityName.trim(),
        country_code: countryCode,
      })
      handleAirportChange(code)
      setCreateDialogOpen(false)
    } catch {
      // addAirport 內部已記錄錯誤
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4">
        {/* 國家選擇 */}
        <div>
          {showLabels && (
            <label className="text-sm font-medium text-morandi-primary mb-2 block">
              {SELECTORS_LABELS.LABEL_5040}
            </label>
          )}
          <Combobox
            value={displayCountryName}
            onChange={handleCountryChange}
            options={countryOptions}
            placeholder={SELECTORS_LABELS.SELECT_7169}
            emptyMessage={loading ? '載入中...' : '找不到符合的國家'}
            showSearchIcon
            showClearButton
            disablePortal={disablePortal}
            onCreate={handleCreateCountry}
          />
        </div>

        {/* 城市（機場代碼）選擇 */}
        <div>
          {showLabels && (
            <label className="text-sm font-medium text-morandi-primary mb-2 block">
              {SELECTORS_LABELS.LABEL_5022}
            </label>
          )}
          <Combobox
            value={airportCode}
            onChange={handleAirportChange}
            options={availableAirports}
            placeholder={!displayCountryName ? SELECTORS_LABELS.PLEASE_SELECT_COUNTRY_FIRST : SELECTORS_LABELS.SEARCH_CITY_AIRPORT}
            emptyMessage={loading ? '載入中...' : '找不到符合的機場'}
            showSearchIcon
            showClearButton
            disabled={!displayCountryName}
            disablePortal={disablePortal}
            onCreate={displayCountryName ? handleCreateAirport : undefined}
          />
        </div>
      </div>

      {/* 新增國家 Dialog */}
      <FormDialog
        open={createCountryDialogOpen}
        onOpenChange={setCreateCountryDialogOpen}
        title={COMPONENT_LABELS.ADD_COUNTRY}
        onSubmit={handleCountryDialogSubmit}
        submitLabel="新增"
        loading={isCountrySubmitting}
        submitDisabled={!newCountryName.trim() || newCountryCode.trim().length !== 2}
        maxWidth="sm"
      >
        <div>
          <label className="text-sm font-medium text-morandi-primary mb-2 block">{COMPONENT_LABELS.COUNTRY_NAME}</label>
          <Input
            value={newCountryName}
            onChange={e => setNewCountryName(e.target.value)}
            placeholder={SELECTORS_LABELS.EXAMPLE_COUNTRY}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-morandi-primary mb-2 block">{COMPONENT_LABELS.ENGLISH_NAME}</label>
          <Input
            value={newCountryNameEn}
            onChange={e => setNewCountryNameEn(e.target.value)}
            placeholder={SELECTORS_LABELS.EXAMPLE_COUNTRY_EN}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-morandi-primary mb-2 block">
            國家代碼（ISO 2碼）
          </label>
          <Input
            value={newCountryCode}
            onChange={e =>
              setNewCountryCode(
                e.target.value
                  .toUpperCase()
                  .replace(/[^A-Z]/g, '')
                  .slice(0, 2)
              )
            }
            placeholder={SELECTORS_LABELS.EXAMPLE_COUNTRY_CODE}
            maxLength={2}
          />
          <p className="text-xs text-morandi-secondary mt-1">
            2 碼大寫英文，例如 JP（日本）、TH（泰國）
          </p>
        </div>
      </FormDialog>

      {/* 新增機場 Dialog */}
      <FormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        title={SELECTORS_LABELS.ADD_1468}
        subtitle={`國家：${country}`}
        onSubmit={handleDialogSubmit}
        submitLabel="新增"
        loading={isSubmitting}
        submitDisabled={newIataCode.trim().length !== 3}
        maxWidth="sm"
      >
        <div>
          <label className="text-sm font-medium text-morandi-primary mb-2 block">
            {SELECTORS_LABELS.LABEL_7192}
          </label>
          <Input value={newCityName} onChange={e => setNewCityName(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium text-morandi-primary mb-2 block">
            IATA 機場代碼
          </label>
          <Input
            value={newIataCode}
            onChange={e =>
              setNewIataCode(
                e.target.value
                  .toUpperCase()
                  .replace(/[^A-Z]/g, '')
                  .slice(0, 3)
              )
            }
            placeholder={SELECTORS_LABELS.EXAMPLE_7494}
            maxLength={3}
          />
          <p className="text-xs text-morandi-secondary mt-1">
            3 碼大寫英文，例如 XIY（西安咸陽機場）
          </p>
        </div>
      </FormDialog>
    </div>
  )
}
