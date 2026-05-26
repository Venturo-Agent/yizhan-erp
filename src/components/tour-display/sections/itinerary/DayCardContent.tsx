'use client'

import { Star, ArrowRight } from 'lucide-react'
import { LUXURY, ActivityInfo } from '../utils/itineraryLuxuryUtils'
import { TOURS_LABELS } from '../constants/labels'

interface NormalizedImage {
  url: string
  title?: string
  description?: string
}

interface Activity {
  title?: string
  description?: string
  image?: string
}

interface DayCardContentProps {
  title?: string
  description?: string
  highlight?: string
  isAlternative?: boolean
  activities?: Activity[]
  allImages: NormalizedImage[]
  hasImages: boolean
  isMobile: boolean
  dayIndex: number
  openImageGallery: (images: NormalizedImage[], startIndex: number) => void
  setSelectedActivity: (activity: ActivityInfo | null) => void
}

export function DayCardContent({
  title,
  description,
  highlight,
  isAlternative,
  activities,
  allImages,
  hasImages,
  isMobile,
  dayIndex,
  openImageGallery,
  setSelectedActivity,
}: DayCardContentProps) {
  return (
    <div
      className={`${isMobile ? 'p-6' : 'lg:col-span-7 p-8 lg:p-10'} border-r`}
      style={{ borderColor: '#f0f0f0' }}
    >
      {/* 標題區 */}
      <div className="flex items-start justify-between mb-6">
        <h3
          className={`font-bold ${isMobile ? 'text-xl' : 'text-2xl'}`}
          style={{
            color: LUXURY.text,
            fontFamily: "'Noto Sans TC', sans-serif",
          }}
        >
          {title ||
            `${TOURS_LABELS.DAY_ITINERARY_PREFIX}${dayIndex + 1}${TOURS_LABELS.DAY_ITINERARY_SUFFIX}`}
        </h3>
        {isAlternative && (
          <span
            className="px-2 py-1 text-xs rounded-full"
            style={{
              backgroundColor: `${LUXURY.secondary}20`,
              color: LUXURY.secondary,
            }}
          >
            {TOURS_LABELS.LABEL_1234}
          </span>
        )}
      </div>

      {/* 特別安排 */}
      {highlight && (
        <div
          className="flex items-start gap-3 mb-6 p-4 rounded-lg border-l-4"
          style={{
            backgroundColor: `${LUXURY.secondary}08`,
            borderColor: LUXURY.secondary,
          }}
        >
          <Star className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: LUXURY.secondary }} />
          <div>
            <span
              className="text-xs font-bold uppercase tracking-wider block mb-1"
              style={{ color: LUXURY.secondary }}
            >
              Special Arrangement
            </span>
            <p className="text-sm font-medium whitespace-pre-line" style={{ color: LUXURY.text }}>
              {highlight}
            </p>
          </div>
        </div>
      )}

      {/* 描述 */}
      {description && (
        <p
          className={`leading-loose mb-8 font-light whitespace-pre-line ${isMobile ? 'text-sm' : ''}`}
          style={{
            color: LUXURY.muted,
            fontFamily: "'Noto Sans TC', sans-serif",
          }}
        >
          {description}
        </p>
      )}

      {/* 圖片區 - 有圖片時顯示圖片，無圖片時顯示景點列表 */}
      {hasImages ? (
        <div className="mb-6">
          {/* 單張圖片：手機上下排列，桌面左圖右文 */}
          {allImages.length === 1 && (
            <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-6`}>
              {/* 圖片 */}
              <div
                className={`relative ${isMobile ? 'h-48' : 'h-56'} overflow-hidden rounded-md cursor-pointer group/img`}
                onClick={() => openImageGallery(allImages, 0)}
              >
                <img
                  src={allImages[0].url}
                  alt={allImages[0].title || TOURS_LABELS.ITINERARY_IMAGE}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors" />
              </div>
              {/* 說明 */}
              <div
                className={`flex flex-col justify-center ${isMobile ? 'p-4' : 'p-5'}`}
                style={{ backgroundColor: LUXURY.background }}
              >
                <h4
                  className="text-lg font-medium mb-3"
                  style={{
                    color: LUXURY.primary,
                    fontFamily: LUXURY.font.serif,
                  }}
                >
                  Highlight
                </h4>
                <ul className="space-y-2 mb-4">
                  {activities?.map((activity, actIdx) => (
                    <li
                      key={actIdx}
                      className="flex items-center gap-2 text-sm cursor-pointer hover:opacity-80"
                      style={{ color: LUXURY.muted }}
                      onClick={() =>
                        setSelectedActivity({
                          title: activity.title || '',
                          description: activity.description,
                          image: activity.image,
                        })
                      }
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: LUXURY.secondary }}
                      />
                      {activity.title}
                    </li>
                  ))}
                </ul>
                {activities?.[0]?.description && (
                  <p
                    className="text-xs leading-relaxed border-t border-border pt-3"
                    style={{
                      color: LUXURY.muted,
                      borderColor: '#e5e5e5',
                    }}
                  >
                    {activities[0].description}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 多張圖片：橫向排列，最多顯示3張 */}
          {allImages.length >= 2 && (
            <>
              <div
                className={`grid gap-4 ${allImages.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}
              >
                {allImages.slice(0, 3).map((img, imgIdx) => (
                  <div
                    key={imgIdx}
                    className="relative h-44 overflow-hidden rounded-md cursor-pointer group/img"
                    onClick={() => openImageGallery(allImages, imgIdx)}
                  >
                    <img
                      src={img.url}
                      alt={img.title || ''}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute bottom-3 left-3">
                      <span
                        className="text-white text-xs font-bold uppercase tracking-wider"
                        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                      >
                        {img.title}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* 簡短說明 + 點擊提示 */}
              <div
                className="mt-4 p-4 rounded-lg cursor-pointer hover:bg-opacity-80 transition-colors"
                style={{ backgroundColor: LUXURY.background }}
                onClick={() => openImageGallery(allImages, 0)}
              >
                <div className="flex flex-wrap gap-2 mb-2">
                  {activities?.slice(0, 3).map((activity, idx) => (
                    <span
                      key={idx}
                      className="text-xs font-medium px-2 py-1 rounded-full"
                      style={{
                        backgroundColor: `${LUXURY.secondary}20`,
                        color: LUXURY.secondary,
                      }}
                    >
                      {activity.title}
                    </span>
                  ))}
                </div>
                {activities?.[0]?.description && (
                  <p className="text-sm line-clamp-2 mb-2" style={{ color: LUXURY.muted }}>
                    {activities[0].description}
                  </p>
                )}
                <span
                  className="text-xs flex items-center gap-1"
                  style={{ color: LUXURY.secondary }}
                >
                  {TOURS_LABELS.CLICK_DETAIL} <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </>
          )}

          {/* 如果超過3張，顯示查看更多按鈕 */}
          {allImages.length > 3 && (
            <button
              className="mt-3 text-sm font-medium flex items-center gap-1 hover:opacity-80 transition-opacity"
              style={{ color: LUXURY.secondary }}
              onClick={() => openImageGallery(allImages, 3)}
            >
              <span>
                {TOURS_LABELS.VIEW_MORE_PREFIX}
                {allImages.length - 3}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        /* 無圖片時：顯示 Highlight 景點列表 */
        activities &&
        activities.length > 0 && (
          <div className="p-5 rounded-md mb-4" style={{ backgroundColor: LUXURY.background }}>
            <h4
              className="text-base font-medium mb-3"
              style={{
                color: LUXURY.primary,
                fontFamily: LUXURY.font.serif,
              }}
            >
              Highlight
            </h4>
            <ul className="space-y-3">
              {activities.map((activity, actIdx) => (
                <li
                  key={actIdx}
                  className="cursor-pointer hover:opacity-80"
                  onClick={() =>
                    setSelectedActivity({
                      title: activity.title || '',
                      description: activity.description,
                      image: activity.image,
                    })
                  }
                >
                  <div className="flex items-center gap-2 text-sm" style={{ color: LUXURY.text }}>
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: LUXURY.secondary }}
                    />
                    <span className="font-medium">{activity.title}</span>
                  </div>
                  {activity.description && (
                    <p className="text-xs mt-1 ml-4 line-clamp-2" style={{ color: LUXURY.muted }}>
                      {activity.description}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )
      )}
    </div>
  )
}
