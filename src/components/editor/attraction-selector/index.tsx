'use client'

import React, { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { MapPin, Loader2, Map, X } from 'lucide-react'
import { TourCountry } from '../tour-form/types'
import { Attraction } from '@/app/(main)/library/attractions/_types'
import { AttractionSearchBar } from './AttractionSearchBar'
import { AttractionList } from './AttractionList'
import { useAttractionSearch } from './hooks/useAttractionSearch'

const COMPONENT_LABELS = {
  NO_DESCRIPTION: '暫無描述',
} as const
import { useCapabilities, CAPABILITIES } from '@/lib/permissions'
import { ATTRACTION_SELECTOR_LABELS } from './constants/labels'

// 使用 Next.js dynamic import 並禁用 SSR
const AttractionsMap = dynamic(
  () =>
    import('@/app/(main)/library/attractions/_components/AttractionsMap').then(
      mod => mod.AttractionsMap
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-morandi-gold" />
      </div>
    ),
  }
)

// 擴展型別（加入 join 查詢的欄位）
interface AttractionWithCity extends Attraction {
  city_name?: string
  region_name?: string
}

interface AttractionSelectorProps {
  isOpen: boolean
  onClose: () => void
  countryId?: string // 直接傳國家 ID（優先於 tourCountryName）
  tourCountries?: TourCountry[] // 用於預設選擇第一個國家（fallback）
  tourCountryName?: string // 行程的國家名稱（fallback，來自 CoverInfo）
  onSelect: (attractions: AttractionWithCity[]) => void
  dayTitle?: string // 當天的行程標題，用於智能建議
  existingIds?: string[] // 已選過的景點 ID（顯示鎖定狀態）
}

export function AttractionSelector({
  isOpen,
  onClose,
  countryId,
  tourCountries = [],
  tourCountryName = '',
  onSelect,
  dayTitle = '',
  existingIds = [],
}: AttractionSelectorProps) {
  // 已選過的景點 ID Set（用於快速查找）
  const existingIdsSet = useMemo(() => new Set(existingIds), [existingIds])

  // 使用自定義 Hook 管理搜尋邏輯
  const {
    selectedCountryId,
    searchQuery,
    attractions,
    suggestedAttractions,
    loading,
    countries,
    handleCountryChange,
    handleCityChange,
    setSearchQuery,
  } = useAttractionSearch({
    isOpen,
    countryId,
    tourCountryName,
    dayTitle,
  })

  // 權限檢查：是否能編輯資料庫（database.attractions 寫入權限）
  const { can } = useCapabilities()
  const canEditDatabase = can(CAPABILITIES.DATABASE_MANAGE_ATTRACTIONS)

  // 選擇狀態
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // 景點詳情狀態
  const [detailAttraction, setDetailAttraction] = useState<AttractionWithCity | null>(null)

  // 編輯景點：直接跳轉到資料庫頁面
  const handleEditAttraction = (attraction: AttractionWithCity) => {
    // 在新分頁打開景點編輯頁面
    window.open(`/library/attractions?edit=${attraction.id}`, '_blank')
  }

  // 地圖相關狀態
  const [selectedMapAttraction, setSelectedMapAttraction] = useState<AttractionWithCity | null>(
    null
  )
  const [showMap, setShowMap] = useState(false)

  // 拖拽模式
  const [dragMode, setDragMode] = useState(false)

  // 打開對話框時只清空勾選
  React.useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set())
      setSelectedMapAttraction(null)
      setShowMap(false)
    }
  }, [isOpen])

  // 切換選擇
  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  // 點擊景點查看地圖
  const handleViewOnMap = (attraction: AttractionWithCity) => {
    setSelectedMapAttraction(attraction)
    setShowMap(true)
  }

  // 確認選擇
  const handleConfirm = () => {
    const selected = attractions.filter(a => selectedIds.has(a.id))
    onSelect(selected)
    setSelectedIds(new Set())
    setSearchQuery('')
    onClose()
  }

  // 取消
  const handleCancel = () => {
    setSelectedIds(new Set())
    setSearchQuery('')
    setSelectedMapAttraction(null)
    setShowMap(false)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent
        level={1}
        className="w-[75rem] h-[43.75rem] max-w-[95vw] max-h-[90vh] flex flex-col p-0 gap-0"
      >
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-morandi-gold/10 to-transparent">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <MapPin className="text-morandi-gold" size="1.375em" />
              {ATTRACTION_SELECTOR_LABELS.SELECT_6272}
            </DialogTitle>
            {showMap && (
              <Button
                size="sm"
                variant={dragMode ? 'default' : 'outline'}
                onClick={() => setDragMode(!dragMode)}
                className={dragMode ? 'bg-morandi-gold hover:bg-morandi-gold-hover' : ''}
              >
                {dragMode ? '✓ 拖拽模式' : '啟用拖拽'}
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* 主要內容：左右分欄 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 左側：景點列表 */}
          <div className="w-1/2 flex flex-col border-r border-border">
            <AttractionSearchBar
              countries={countries}
              selectedCountryId={selectedCountryId}
              searchQuery={searchQuery}
              hideFilters={!!countryId}
              onCountryChange={handleCountryChange}
              onSearchChange={setSearchQuery}
            />

            {/* 景點列表 */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              <AttractionList
                attractions={attractions}
                suggestedAttractions={suggestedAttractions}
                selectedIds={selectedIds}
                existingIds={existingIdsSet}
                loading={loading}
                selectedCountryId={selectedCountryId}
                searchQuery={searchQuery}
                canEditDatabase={canEditDatabase}
                onToggleSelection={toggleSelection}
                onViewOnMap={handleViewOnMap}
                onViewDetail={setDetailAttraction}
                onEdit={handleEditAttraction}
                selectedMapAttractionId={selectedMapAttraction?.id}
              />
            </div>

            {/* 已選擇提示 */}
            {selectedIds.size > 0 && (
              <div className="px-4 pb-4">
                <div className="text-sm text-morandi-primary bg-morandi-gold/10 px-3 py-2 rounded-lg border border-morandi-gold/20 flex items-center gap-2">
                  <div className="w-5 h-5 bg-morandi-gold rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {selectedIds.size}
                  </div>
                  已選擇 {selectedIds.size} 個景點
                </div>
              </div>
            )}
          </div>

          {/* 右側：地圖區域 */}
          <div className="w-1/2 flex flex-col bg-muted">
            {!showMap ? (
              // 初始提示畫面
              <div className="flex-1 flex flex-col items-center justify-center text-morandi-secondary p-8">
                <Map size="3.5em" className="mb-4 opacity-30" />
                <p className="text-lg font-medium text-morandi-primary">
                  {ATTRACTION_SELECTOR_LABELS.LABEL_5582}
                </p>
                <p className="text-sm mt-2 text-center max-w-xs">
                  點擊景點右側的 <Map size="0.875em" className="inline mx-1" />{' '}
                  {ATTRACTION_SELECTOR_LABELS.LABEL_1526}
                </p>
              </div>
            ) : (
              // 地圖區域
              <>
                {/* 地圖標題 */}
                <div className="px-4 py-3 bg-card border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin size="1.125em" className="text-status-danger" />
                    <span className="font-medium text-morandi-primary">
                      {selectedMapAttraction?.name}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowMap(false)
                      setSelectedMapAttraction(null)
                    }}
                    className="h-7 px-2"
                  >
                    <X size="1em" />
                  </Button>
                </div>

                {/* 地圖 */}
                <div className="flex-1 relative min-h-[25rem]">
                  <AttractionsMap
                    attractions={attractions as Attraction[]}
                    selectedAttraction={selectedMapAttraction as Attraction}
                    radiusKm={5}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <DialogFooter className="shrink-0 px-6 py-3 border-t bg-muted/50 flex items-center justify-end gap-2">
          <Button variant="soft-gold" onClick={handleCancel} className="rounded-xl">
            {ATTRACTION_SELECTOR_LABELS.CANCEL}
          </Button>
          {selectedIds.size > 0 && (
            <Button variant="soft-gold" onClick={handleConfirm} className="rounded-xl">
              加入 {selectedIds.size} 個景點
            </Button>
          )}
        </DialogFooter>
      </DialogContent>

      {/* 景點詳情 Modal */}
      <Dialog
        open={detailAttraction !== null}
        onOpenChange={open => !open && setDetailAttraction(null)}
      >
        <DialogContent level={2} className="max-w-lg p-0 overflow-hidden rounded-2xl">
          {detailAttraction && (
            <>
              {/* 圖片 */}
              {detailAttraction.images?.[0] && (
                <div className="relative h-48">
                  <img
                    src={detailAttraction.images[0]}
                    alt={detailAttraction.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4 text-white">
                    <DialogTitle className="text-xl font-bold text-white">
                      {detailAttraction.name}
                    </DialogTitle>
                    {detailAttraction.city_name && (
                      <div className="text-sm text-white/80 mt-1 flex items-center gap-1">
                        <MapPin size="0.75em" />
                        {detailAttraction.city_name}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 內容 */}
              <div className="p-6">
                {!detailAttraction.images?.[0] && (
                  <DialogTitle className="text-xl font-bold mb-3">
                    {detailAttraction.name}
                  </DialogTitle>
                )}
                {detailAttraction.category && (
                  <div className="inline-block px-2 py-1 text-xs bg-morandi-container rounded mb-3">
                    {detailAttraction.category}
                  </div>
                )}
                {detailAttraction.description && (
                  <p className="text-sm leading-relaxed text-morandi-secondary">
                    {detailAttraction.description}
                  </p>
                )}
                {!detailAttraction.description && (
                  <p className="text-sm text-morandi-muted italic">
                    {COMPONENT_LABELS.NO_DESCRIPTION}
                  </p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
