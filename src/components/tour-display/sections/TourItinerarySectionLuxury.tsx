'use client'

import { motion } from 'framer-motion'
import { MutableRefObject, useState } from 'react'
import {
  LUXURY,
  DAY_COLORS,
  calculateDayLabels,
  calculateDayDate,
  isLastMainDay,
  ImageGalleryState,
  ActivityInfo,
} from './utils/itineraryLuxuryUtils'
import { formatDateShort } from '@/lib/utils/format-date'
import { ImageGalleryModal } from './modals/ImageGalleryModal'
import { ActivityDetailModal } from './modals/ActivityDetailModal'
import type { TourPageData } from '@/app/(main)/tours/_types/tour-display.types'
import { TOURS_LABELS } from './constants/labels'
import { DayCardDateColumn } from './itinerary/DayCardDateColumn'
import { DayCardContent } from './itinerary/DayCardContent'
import { DayCardSidebar } from './itinerary/DayCardSidebar'

interface TourItinerarySectionLuxuryProps {
  data: TourPageData
  viewMode: 'desktop' | 'mobile'
  activeDayIndex: number
  dayRefs: MutableRefObject<(HTMLDivElement | null)[]>
  handleDayNavigate: (index: number) => void
}

export function TourItinerarySectionLuxury({
  data,
  viewMode,
  dayRefs,
}: TourItinerarySectionLuxuryProps) {
  const dailyItinerary = Array.isArray(data.dailyItinerary) ? data.dailyItinerary : []
  const dayLabels = calculateDayLabels(dailyItinerary)
  const isMobile = viewMode === 'mobile'

  const [selectedActivity, setSelectedActivity] = useState<ActivityInfo | null>(null)

  // 圖片瀏覽器狀態 - 每張圖片可以有自己的標題和描述
  const [imageGallery, setImageGallery] = useState<ImageGalleryState | null>(null)

  // 開啟圖片瀏覽器
  const openImageGallery = (
    images: { url: string; title?: string; description?: string }[],
    startIndex: number
  ) => {
    setImageGallery({ images, currentIndex: startIndex })
  }

  // 切換上一張
  const prevImage = () => {
    if (!imageGallery) return
    setImageGallery({
      ...imageGallery,
      currentIndex:
        imageGallery.currentIndex > 0
          ? imageGallery.currentIndex - 1
          : imageGallery.images.length - 1,
    })
  }

  // 切換下一張
  const nextImage = () => {
    if (!imageGallery) return
    setImageGallery({
      ...imageGallery,
      currentIndex:
        imageGallery.currentIndex < imageGallery.images.length - 1
          ? imageGallery.currentIndex + 1
          : 0,
    })
  }

  return (
    <section
      id="itinerary"
      className={isMobile ? 'py-8' : 'py-16 pb-24'}
      style={{ backgroundColor: LUXURY.background }}
    >
      <div className={isMobile ? 'px-4' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'}>
        {/* 標題區塊 - 靠左對齊 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className={`flex items-center justify-between ${isMobile ? 'mb-8' : 'mb-16'} relative`}
        >
          <div>
            <h2
              className={`font-medium ${isMobile ? 'text-2xl' : 'text-4xl'}`}
              style={{
                color: LUXURY.text,
                fontFamily: LUXURY.font.serif,
              }}
            >
              {TOURS_LABELS.LABEL_5020}
            </h2>
          </div>
          {/* 裝飾線 */}
          {!isMobile && (
            <div
              className="absolute bottom-0 left-0 w-full h-px -z-10 translate-y-4"
              style={{ backgroundColor: '#E5E7EB' }}
            />
          )}
        </motion.div>

        {/* 每日行程卡片 */}
        <div className="space-y-12">
          {dailyItinerary.map((day, index) => {
            const dayColor = DAY_COLORS[index % DAY_COLORS.length]
            const dayNumber = dayLabels[index].replace('Day ', '')
            // 檢查圖片來源：1. day.images（需 showDailyImages=true） 2. activities 裡的 image
            const dayImages =
              day.showDailyImages === true && day.images && day.images.length > 0 ? day.images : []
            // 建構帶有標題和描述的圖片陣列
            const normalizedDayImages = dayImages.map((img, idx) => ({
              url: typeof img === 'string' ? img : img.url,
              title: day.activities?.[idx]?.title || '',
              description: day.activities?.[idx]?.description || '',
            }))
            const activityImagesWithInfo =
              day.activities
                ?.filter(a => a.image)
                .map(a => ({
                  url: a.image!,
                  title: a.title || '',
                  description: a.description || '',
                })) || []
            // 合併所有圖片來源
            const allImages =
              normalizedDayImages.length > 0 ? normalizedDayImages : activityImagesWithInfo
            const hasImages = allImages.length > 0

            // 計算日期顯示
            const numericDay = parseInt(dayNumber.split('-')[0], 10)
            const dateDisplay =
              formatDateShort(day.date) || calculateDayDate(data.departureDate, numericDay)

            return (
              <article
                key={`day-${index}`}
                id={`day-${index + 1}`}
                ref={el => {
                  dayRefs.current[index] = el as HTMLDivElement | null
                }}
              >
                <div
                  className="bg-card rounded-2xl overflow-hidden group border"
                  style={{ borderColor: LUXURY.hairline, boxShadow: LUXURY.shadow.md }}
                >
                  <div className={`grid ${isMobile ? 'grid-cols-1' : 'lg:grid-cols-12'} h-full`}>
                    {/* 左側：日期區塊 */}
                    <DayCardDateColumn
                      dayNumber={dayNumber}
                      dateDisplay={dateDisplay}
                      locationLabel={day.locationLabel}
                      city={data.city}
                      isAlternative={day.isAlternative}
                      dayColor={dayColor}
                      isMobile={isMobile}
                    />

                    {/* 中間：主要內容 */}
                    <DayCardContent
                      title={day.title}
                      description={day.description}
                      highlight={day.highlight}
                      isAlternative={day.isAlternative}
                      activities={day.activities}
                      allImages={allImages}
                      hasImages={hasImages}
                      isMobile={isMobile}
                      dayIndex={index}
                      openImageGallery={openImageGallery}
                      setSelectedActivity={setSelectedActivity}
                    />

                    {/* 右側：餐食與住宿 */}
                    <DayCardSidebar
                      meals={day.meals}
                      accommodation={day.accommodation}
                      accommodationRating={day.accommodationRating}
                      isSameAccommodation={day.isSameAccommodation}
                      isAlternative={day.isAlternative}
                      isLastDay={isLastMainDay(dailyItinerary, index)}
                      dayColor={dayColor}
                      isMobile={isMobile}
                    />
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </div>

      {/* Image Gallery Modal - 全螢幕圖片瀏覽器 */}
      <ImageGalleryModal
        imageGallery={imageGallery}
        onClose={() => setImageGallery(null)}
        onPrev={prevImage}
        onNext={nextImage}
        onSelectIndex={idx =>
          imageGallery && setImageGallery({ ...imageGallery, currentIndex: idx })
        }
      />

      {/* Activity Detail Modal - 景點詳情彈窗（保留給無圖片的景點列表點擊） */}
      <ActivityDetailModal activity={selectedActivity} onClose={() => setSelectedActivity(null)} />
    </section>
  )
}
