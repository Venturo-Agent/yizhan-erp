import React, { useState, useRef, useMemo } from 'react'
import { logger } from '@/lib/utils/logger'
import { TourFormData, HotelInfo } from '../types'

const COMPONENT_LABELS = {
  HOTEL_AUTO_FILL_HINT: '飯店資訊會從旅遊團行程自動帶入',
  NO_DESCRIPTION: '尚無描述',
} as const
import { Plus, X, Image as GripVertical, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { alert } from '@/lib/ui/alert-dialog'
import { COMP_EDITOR_LABELS } from '../../constants/labels'
import { useHotels } from '@/data/entities/hotels'

interface HotelSectionProps {
  data: TourFormData
  updateField: (field: string, value: unknown) => void
}

export function HotelSection({ data, updateField }: HotelSectionProps) {
  const hotels = data.hotels || []

  // 從 hotels 表取得 SSOT 資料（描述、圖片）
  const { items: hotelEntities } = useHotels()
  const hotelLookup = useMemo(() => {
    const map = new Map<string, { description: string; images: string[] }>()
    for (const h of hotelEntities) {
      if (h.name) {
        map.set(h.name.trim().toLowerCase(), {
          description: h.description || '',
          images: (h.images as string[]) || [],
        })
      }
    }
    return map
  }, [hotelEntities])

  // 有飯店資料時自動開啟顯示
  React.useEffect(() => {
    if (hotels.length > 0 && !data.showHotels) {
      updateField('showHotels', true)
    }
  }, [hotels.length])
  const [uploadingImage, setUploadingImage] = useState<{
    hotelIndex: number
    imageIndex: number
  } | null>(null)
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})
  const [draggedImage, setDraggedImage] = useState<{
    hotelIndex: number
    imageIndex: number
  } | null>(null)
  const [dragOverImage, setDragOverImage] = useState<{
    hotelIndex: number
    imageIndex: number
  } | null>(null)

  const _addHotel = () => {
    updateField('hotels', [
      ...hotels,
      {
        name: '',
        description: '',
        images: [],
      },
    ])
  }

  const updateHotel = (index: number, field: keyof HotelInfo, value: string | string[]) => {
    const updated = [...hotels]
    updated[index] = { ...updated[index], [field]: value }
    updateField('hotels', updated)
  }

  const removeHotel = (index: number) => {
    updateField(
      'hotels',
      hotels.filter((_, i) => i !== index)
    )
  }

  // 取得飯店圖片陣列（同時支援 images 多張 / image 單張）
  const getHotelImages = (hotel: HotelInfo): string[] => {
    if (hotel.images && hotel.images.length > 0) {
      return hotel.images
    }
    // fallback：只有 image 單張欄位時
    if (hotel.image) {
      return [hotel.image]
    }
    return []
  }

  // 上傳圖片（單張）
  const _handleImageUpload = async (hotelIndex: number, imageIndex: number, file: File) => {
    if (!file.type.startsWith('image/')) {
      void alert(COMP_EDITOR_LABELS.請選擇圖片檔案, 'warning')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      void alert(COMP_EDITOR_LABELS.圖片大小不可超過_5MB, 'warning')
      return
    }

    setUploadingImage({ hotelIndex, imageIndex })

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `hotel-${hotelIndex}-${imageIndex}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`
      const filePath = `tour-hotel-images/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('workspace-files')
        .upload(filePath, file)

      if (uploadError) {
        logger.error(COMP_EDITOR_LABELS.上傳失敗, uploadError)
        void alert(COMP_EDITOR_LABELS.圖片上傳失敗, 'error')
        return
      }

      const { data: urlData } = supabase.storage.from('workspace-files').getPublicUrl(filePath)

      const hotel = hotels[hotelIndex]
      const currentImages = [...getHotelImages(hotel)]

      if (imageIndex >= currentImages.length) {
        currentImages.push(urlData.publicUrl)
      } else {
        currentImages[imageIndex] = urlData.publicUrl
      }

      updateHotel(hotelIndex, 'images', currentImages)
    } catch (error) {
      logger.error(COMP_EDITOR_LABELS.上傳錯誤, error)
      void alert(COMP_EDITOR_LABELS.上傳過程發生錯誤, 'error')
    } finally {
      setUploadingImage(null)
    }
  }

  // 批量上傳多張圖片
  const handleMultipleImageUpload = async (hotelIndex: number, files: FileList) => {
    const hotel = hotels[hotelIndex]
    const currentImages = [...getHotelImages(hotel)]
    const remainingSlots = 4 - currentImages.length

    if (remainingSlots <= 0) {
      void alert(COMP_EDITOR_LABELS.已達到最大圖片數量_4_張, 'warning')
      return
    }

    const imageFiles = Array.from(files)
      .filter(file => file.type.startsWith('image/'))
      .slice(0, remainingSlots)

    if (imageFiles.length === 0) {
      void alert(COMP_EDITOR_LABELS.請選擇圖片檔案, 'warning')
      return
    }

    setUploadingImage({ hotelIndex, imageIndex: currentImages.length })

    try {
      const uploadedUrls: string[] = []

      await Promise.all(
        imageFiles.map(async (file, idx) => {
          const fileExt = file.name.split('.').pop()
          const fileName = `hotel-${hotelIndex}-${currentImages.length + idx}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`
          const filePath = `tour-hotel-images/${fileName}`

          const { error: uploadError } = await supabase.storage
            .from('workspace-files')
            .upload(filePath, file)

          if (uploadError) {
            logger.error(`上傳第 ${idx + 1} 張失敗:`, uploadError)
            return
          }

          const { data: urlData } = supabase.storage.from('workspace-files').getPublicUrl(filePath)

          uploadedUrls[idx] = urlData.publicUrl
        })
      )

      const successfulUrls = uploadedUrls.filter(Boolean)
      if (successfulUrls.length > 0) {
        updateHotel(hotelIndex, 'images', [...currentImages, ...successfulUrls])
      }

      if (successfulUrls.length < imageFiles.length) {
        void alert(
          `${successfulUrls.length} 張圖片上傳成功，${imageFiles.length - successfulUrls.length} 張失敗`,
          'warning'
        )
      }
    } catch (error) {
      logger.error(COMP_EDITOR_LABELS.批量上傳錯誤, error)
      void alert(COMP_EDITOR_LABELS.上傳過程發生錯誤, 'error')
    } finally {
      setUploadingImage(null)
    }
  }

  // 移除圖片
  const handleRemoveImage = (hotelIndex: number, imageIndex: number) => {
    const hotel = hotels[hotelIndex]
    const currentImages = [...getHotelImages(hotel)]
    currentImages.splice(imageIndex, 1)
    updateHotel(hotelIndex, 'images', currentImages)
  }

  // 新增圖片
  const handleAddImageSlot = (hotelIndex: number) => {
    const inputKey = `hotel-${hotelIndex}-new`
    fileInputRefs.current[inputKey]?.click()
  }

  // 拖曳排序
  const handleImageDragStart = (hotelIndex: number, imageIndex: number) => {
    setDraggedImage({ hotelIndex, imageIndex })
  }

  const handleImageDragOver = (e: React.DragEvent, hotelIndex: number, imageIndex: number) => {
    e.preventDefault()
    if (draggedImage && draggedImage.hotelIndex === hotelIndex) {
      setDragOverImage({ hotelIndex, imageIndex })
    }
  }

  const handleImageDrop = (hotelIndex: number, targetIndex: number) => {
    if (!draggedImage || draggedImage.hotelIndex !== hotelIndex) {
      setDraggedImage(null)
      setDragOverImage(null)
      return
    }

    const sourceIndex = draggedImage.imageIndex
    if (sourceIndex === targetIndex) {
      setDraggedImage(null)
      setDragOverImage(null)
      return
    }

    const hotel = hotels[hotelIndex]
    const currentImages = [...getHotelImages(hotel)]
    const [movedImage] = currentImages.splice(sourceIndex, 1)
    currentImages.splice(targetIndex, 0, movedImage)

    updateHotel(hotelIndex, 'images', currentImages)
    setDraggedImage(null)
    setDragOverImage(null)
  }

  const handleImageDragEnd = () => {
    setDraggedImage(null)
    setDragOverImage(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-morandi-primary border-b-2 border-morandi-gold pb-2 flex-1">
          {COMP_EDITOR_LABELS.飯店資訊}
        </h2>
      </div>

      <div className="bg-morandi-container/20 p-4 rounded-lg space-y-3">
        {hotels.length === 0 && (
          <div className="text-center py-8 bg-card rounded-lg border-2 border-dashed border-morandi-container">
            <p className="text-sm text-morandi-secondary mb-2">{COMP_EDITOR_LABELS.ADD_3223}</p>
            <p className="text-xs text-morandi-muted">{COMPONENT_LABELS.HOTEL_AUTO_FILL_HINT}</p>
          </div>
        )}

        {hotels.map((hotel, hotelIndex) => {
          // 從 hotels 表查找匹配的飯店（SSOT）
          const matchedHotel = hotel.name?.trim()
            ? hotelLookup.get(hotel.name.trim().toLowerCase())
            : undefined
          // 若有匹配，使用 SSOT 的描述和圖片；否則使用本地資料
          const displayDescription = matchedHotel?.description || hotel.description
          const images = matchedHotel?.images?.length ? matchedHotel.images : getHotelImages(hotel)
          const isFromSSOT = !!matchedHotel
          const canAddMore = !isFromSSOT && images.length < 4

          return (
            <div
              key={hotelIndex}
              className="bg-card p-4 rounded-lg border border-morandi-container space-y-3 relative"
            >
              <button
                type="button"
                onClick={() => removeHotel(hotelIndex)}
                className="absolute top-3 right-3 p-1 text-morandi-red hover:bg-morandi-red/10 rounded transition-colors"
                title={COMP_EDITOR_LABELS.移除此飯店}
              >
                <X size="1em" />
              </button>

              <div className="pr-8">
                <h4 className="font-bold text-morandi-secondary mb-3">
                  {COMP_EDITOR_LABELS.飯店} {hotelIndex + 1}
                </h4>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-morandi-primary mb-1">
                      {COMP_EDITOR_LABELS.LABEL_7447}
                    </label>
                    <input
                      type="text"
                      value={hotel.name}
                      onChange={e => updateHotel(hotelIndex, 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-morandi-container rounded-lg focus:outline-none focus:ring-2 focus:ring-morandi-gold/50 focus:border-morandi-gold"
                      placeholder={COMP_EDITOR_LABELS.例如_福岡海鷹希爾頓酒店}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-morandi-primary mb-1">
                      {COMP_EDITOR_LABELS.LABEL_6867}
                      {isFromSSOT && (
                        <span className="ml-2 text-xs text-morandi-muted font-normal">
                          （來自飯店資料庫，唯讀）
                        </span>
                      )}
                    </label>
                    {isFromSSOT ? (
                      <div className="w-full px-3 py-2 border border-morandi-container/50 rounded-lg bg-morandi-container/10 min-h-[5rem] text-morandi-secondary text-sm whitespace-pre-wrap">
                        {displayDescription || (
                          <span className="text-morandi-muted italic">{COMPONENT_LABELS.NO_DESCRIPTION}</span>
                        )}
                      </div>
                    ) : (
                      <textarea
                        value={hotel.description}
                        onChange={e => updateHotel(hotelIndex, 'description', e.target.value)}
                        className="w-full px-3 py-2 border border-morandi-container rounded-lg focus:outline-none focus:ring-2 focus:ring-morandi-gold/50 focus:border-morandi-gold min-h-[5rem]"
                        placeholder={COMP_EDITOR_LABELS.介紹飯店特色_位置_設施等}
                      />
                    )}
                  </div>

                  {/* 圖片區域 */}
                  <div>
                    <label className="block text-sm font-medium text-morandi-primary mb-2">
                      飯店圖片 ({images.length}
                      {isFromSSOT ? '' : '/4'})
                      {isFromSSOT && (
                        <span className="ml-2 text-xs text-morandi-muted font-normal">
                          （來自飯店資料庫，唯讀）
                        </span>
                      )}
                    </label>

                    {/* 圖片網格 */}
                    <div className="grid grid-cols-4 gap-2">
                      {/* 圖片列表 */}
                      {images.map((imageUrl, imageIndex) => (
                        <div
                          key={imageIndex}
                          draggable={!isFromSSOT}
                          onDragStart={
                            !isFromSSOT
                              ? () => handleImageDragStart(hotelIndex, imageIndex)
                              : undefined
                          }
                          onDragOver={
                            !isFromSSOT
                              ? (e: React.DragEvent) =>
                                  handleImageDragOver(e, hotelIndex, imageIndex)
                              : undefined
                          }
                          onDrop={
                            !isFromSSOT ? () => handleImageDrop(hotelIndex, imageIndex) : undefined
                          }
                          onDragEnd={!isFromSSOT ? handleImageDragEnd : undefined}
                          className={`relative aspect-square rounded-lg overflow-hidden border-2 group ${
                            isFromSSOT
                              ? 'border-morandi-container/50 cursor-default'
                              : dragOverImage?.hotelIndex === hotelIndex &&
                                  dragOverImage?.imageIndex === imageIndex
                                ? 'border-morandi-gold cursor-move'
                                : 'border-morandi-container cursor-move'
                          }`}
                        >
                          <img
                            src={imageUrl}
                            alt={`${hotel.name || COMP_EDITOR_LABELS.飯店} 圖片 ${imageIndex + 1}`}
                            className="w-full h-full object-cover"
                          />
                          {!isFromSSOT && (
                            <>
                              {/* 拖曳把手 */}
                              <div className="absolute top-1 left-1 p-1 bg-black/50 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                <GripVertical size="0.75em" className="text-white" />
                              </div>
                              {/* 刪除按鈕 */}
                              <button
                                type="button"
                                onClick={() => handleRemoveImage(hotelIndex, imageIndex)}
                                className="absolute top-1 right-1 p-1 bg-status-danger rounded text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-status-danger"
                              >
                                <X size="0.75em" />
                              </button>
                            </>
                          )}
                          {/* 序號 */}
                          <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/50 rounded text-white text-xs">
                            {imageIndex + 1}
                          </div>
                        </div>
                      ))}

                      {/* 新增圖片按鈕（僅非 SSOT 時顯示） */}
                      {canAddMore && (
                        <div
                          onClick={() => handleAddImageSlot(hotelIndex)}
                          onDragOver={e => {
                            e.preventDefault()
                            e.stopPropagation()
                          }}
                          onDrop={e => {
                            e.preventDefault()
                            const files = e.dataTransfer.files
                            if (files.length > 0) {
                              void handleMultipleImageUpload(hotelIndex, files)
                            }
                          }}
                          className="aspect-square rounded-lg border-2 border-dashed border-morandi-container hover:border-morandi-gold hover:bg-morandi-gold/5 transition-colors cursor-pointer flex flex-col items-center justify-center"
                        >
                          {uploadingImage?.hotelIndex === hotelIndex ? (
                            <Loader2 size="1.25em" className="text-morandi-gold animate-spin" />
                          ) : (
                            <>
                              <Plus size="1.25em" className="text-morandi-secondary mb-1" />
                              <span className="text-xs text-morandi-secondary">
                                {COMP_EDITOR_LABELS.新增}
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 隱藏的 file input（僅非 SSOT 時需要） */}
                    {!isFromSSOT && (
                      <input
                        ref={el => {
                          fileInputRefs.current[`hotel-${hotelIndex}-new`] = el
                        }}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={e => {
                          if (e.target.files && e.target.files.length > 0) {
                            void handleMultipleImageUpload(hotelIndex, e.target.files)
                            e.target.value = ''
                          }
                        }}
                        className="hidden"
                      />
                    )}

                    <p className="mt-2 text-xs text-morandi-secondary">
                      {isFromSSOT
                        ? '圖片由飯店資料庫統一管理'
                        : '可拖曳排序 · 支援拖放上傳 · 建議使用 16:9 高解析度圖片 · 單張不超過 5MB'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
