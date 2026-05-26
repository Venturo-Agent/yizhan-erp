import { useMemo } from 'react'
import { logger } from '@/lib/utils/logger'
import { TourFormData, CityOption } from '../types'
import type { ImagePositionSettings } from '@/components/ui/image-position-editor'
// 拆分的模組
import { useCoverInfo } from './cover/hooks/useCoverInfo'
import { AirportImageLibrary } from './cover/AirportImageLibrary'
import { CoverInfoForm } from './cover/CoverInfoForm'

interface CoverInfoSectionProps {
  data: TourFormData
  user: {
    display_name?: string
    english_name?: string
    employee_number?: string
  } | null
  selectedCountry: string
  setSelectedCountry: (country: string) => void
  setSelectedCountryCode: (code: string) => void
  allDestinations: CityOption[]
  availableCities: CityOption[]
  countryNameToCode: Record<string, string>
  updateField: (field: string, value: unknown) => void
  updateCity: (city: string) => void
  onChange: (data: TourFormData) => void
}

export function CoverInfoSection({
  data,
  availableCities,
  updateField,
  onChange,
}: CoverInfoSectionProps) {
  const { coverStyleOptions, templatesLoading, handleCoverStyleChange } = useCoverInfo({
    data,
    onChange,
  })

  // 取得機場代碼（data.city 現在直接存城市代碼）
  // 向後兼容：如果是舊資料存城市名稱，嘗試反向查找
  const airportCode = useMemo(() => {
    if (!data.city) return ''
    // 如果 data.city 是城市代碼格式（2-4個大寫字母），直接使用
    if (/^[A-Z]{2,4}$/.test(data.city)) {
      return data.city
    }
    // 否則嘗試從城市名稱反向查找（向後兼容舊資料）
    const city = availableCities.find(c => c.name === data.city)
    return city?.code || ''
  }, [data.city, availableCities])

  // 處理圖片選擇
  const handleImageSelect = (url: string) => {
    logger.log('[CoverInfoSection] handleImageSelect:', { url })
    updateField('coverImage', url)
  }

  // 處理圖片上傳
  const handleImageUpload = (url: string) => {
    logger.log('[CoverInfoSection] handleImageUpload:', { url })
    // 同時更新 coverImage 和 coverImagePosition，避免 stale closure 問題
    onChange({
      ...data,
      coverImage: url,
      coverImagePosition: { x: 50, y: 50, scale: 1 },
    })
  }

  return (
    <div className="space-y-4">
      {/* 封面設定表單 - 直接攤開，不用彈窗 */}
      <div className="space-y-4">
        {/* 表單區塊 - 在 50% 寬度下，改用垂直排列 */}
        <CoverInfoForm
          data={data}
          updateField={updateField}
          onChange={onChange}
          coverStyleOptions={coverStyleOptions}
          onCoverStyleChange={handleCoverStyleChange}
          templatesLoading={templatesLoading}
        />

        {/* 封面圖片 - 使用新的機場圖片庫 */}
        <AirportImageLibrary
          airportCode={airportCode}
          selectedImage={data.coverImage}
          onImageSelect={handleImageSelect}
          onImageUpload={handleImageUpload}
          position={data.coverImagePosition as ImagePositionSettings}
          onPositionChange={pos => updateField('coverImagePosition', pos)}
        />
      </div>
    </div>
  )
}
