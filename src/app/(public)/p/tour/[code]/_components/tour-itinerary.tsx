'use client'

/**
 * 公開行程頁面 - 日程時間軸內容
 */

import { MapPin, Utensils, Hotel, Camera, Ship, TreePine, Building } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { DailyItinerary } from './tour-types'

interface TourItineraryProps {
  dailyItinerary: DailyItinerary[]
}

function getActivityIcon(icon?: string) {
  switch (icon) {
    case '🍽️':
    case '🍴':
      return <Utensils className="w-5 h-5" />
    case '🏨':
    case '🛏️':
      return <Hotel className="w-5 h-5" />
    case '📷':
    case '📸':
      return <Camera className="w-5 h-5" />
    case '🚢':
    case '⛵':
      return <Ship className="w-5 h-5" />
    case '🌳':
    case '🌲':
      return <TreePine className="w-5 h-5" />
    case '🏛️':
    case '🏢':
      return <Building className="w-5 h-5" />
    default:
      return <MapPin className="w-5 h-5" />
  }
}

export function TourItinerary({ dailyItinerary }: TourItineraryProps) {
  const t = useTranslations('publicPage')

  if (dailyItinerary.length === 0) {
    return (
      <section className="text-center py-16">
        <MapPin className="w-12 h-12 mx-auto text-morandi-muted mb-4" />
        <h2 className="text-xl font-bold text-morandi-muted mb-2">{t('tourPlanning')}</h2>
        <p className="text-morandi-muted">{t('tourPlanningDesc')}</p>
      </section>
    )
  }

  return (
    <div className="space-y-24 md:space-y-32">
      {dailyItinerary.map((day, index) => (
        <section key={index} id={`day${index + 1}`} className="relative pl-12 scroll-mt-48">
          {/* Timeline */}
          <div className="absolute left-0 top-0 bottom-0 w-px bg-morandi-container ml-4"></div>
          <div className="absolute left-0 top-2 w-8 h-8 rounded-full bg-public-accent flex items-center justify-center">
            <span className="text-white text-xs font-bold">
              {String(index + 1).padStart(2, '0')}
            </span>
          </div>

          {/* Day Title */}
          <h2 className="text-2xl md:text-3xl font-bold text-public-primary mb-8 tracking-tight">
            {day.title}
          </h2>

          <div className="space-y-12">
            {/* Activities */}
            {day.activities &&
              day.activities.map((activity, actIdx) => (
                <div key={actIdx} className="group">
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-public-secondary">
                      {getActivityIcon(activity.icon)}
                    </span>
                    <span className="text-sm font-bold tracking-widest text-public-secondary uppercase">
                      {activity.icon || '景點'}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold mb-4">{activity.title}</h3>
                  {activity.description && (
                    <p className="text-morandi-primary leading-relaxed">
                      {activity.description}
                    </p>
                  )}
                </div>
              ))}

            {/* Meals */}
            {day.meals && (day.meals.breakfast || day.meals.lunch || day.meals.dinner) && (
              <div className="p-6 bg-morandi-gold/10 rounded-xl border border-morandi-gold/20">
                <div className="flex items-center gap-3 mb-3">
                  <Utensils className="w-5 h-5 text-morandi-gold" />
                  <span className="text-sm font-bold text-morandi-primary uppercase tracking-widest">
                    餐食安排
                  </span>
                </div>
                <div className="text-sm text-morandi-primary space-y-1">
                  {day.meals.breakfast && <p>早餐：{day.meals.breakfast}</p>}
                  {day.meals.lunch && <p>午餐：{day.meals.lunch}</p>}
                  {day.meals.dinner && <p>晚餐：{day.meals.dinner}</p>}
                </div>
              </div>
            )}

            {/* Accommodation */}
            {day.accommodation && (
              <div className="p-6 bg-morandi-container/50 rounded-xl">
                <div className="flex items-center gap-4">
                  <Hotel className="w-5 h-5 text-morandi-muted" />
                  <span className="text-morandi-primary font-medium">
                    住宿：{day.accommodation}
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>
      ))}
    </div>
  )
}
