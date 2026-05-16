'use client'

import { useTranslations } from 'next-intl'
import { Check, Plane, X } from 'lucide-react'
import { DroppableZone } from './DroppableZone'
import { MealCombobox } from './MealCombobox'
import type { RestaurantItem } from './MealCombobox'
import type { DailyScheduleItem } from './DayRow'

// ============================================
// MealCell — 三餐欄位（早餐 / 午餐 / 晚餐）
//
// breakfast：has hotel-breakfast toggle
// lunch / dinner：has self + airline toggles
// ============================================

type MealKey = 'breakfast' | 'lunch' | 'dinner'

interface MealCellProps {
  mealKey: MealKey
  day: DailyScheduleItem
  idx: number
  isFirst: boolean
  cellClass: string
  restaurantOptions: RestaurantItem[]
  onPick: (mealKey: MealKey, r: { id: string; name: string }) => void
  onPlainText: (mealKey: MealKey, text: string) => void
  onClear: (mealKey: MealKey) => void
  onTogglePreset: (mealKey: 'lunch' | 'dinner', which: 'self' | 'airline') => void
  onToggleHotelBreakfast: () => void
}

export function MealCell({
  mealKey,
  day,
  idx,
  isFirst,
  cellClass,
  restaurantOptions,
  onPick,
  onPlainText,
  onClear,
  onTogglePreset,
  onToggleHotelBreakfast,
}: MealCellProps) {
  const t = useTranslations('tour')
  const placeholder =
    mealKey === 'breakfast'
      ? t('mealCellBreakfast')
      : mealKey === 'lunch'
        ? t('mealCellLunch')
        : t('mealCellDinner')

  const mealText = day.meals[mealKey]

  return (
    <td className={`px-0 py-0 ${cellClass} align-middle hover:bg-morandi-gold/10 transition-colors`}>
      <DroppableZone id={`meal-${mealKey}-drop-${idx}`} acceptType="restaurant">
        <div className="relative min-h-8 flex items-center">
          {/* Breakfast: hotel breakfast preset chip */}
          {mealKey === 'breakfast' && day.hotelBreakfast ? (
            <div className="flex items-center px-2">
              <div className="inline-flex items-center gap-1 bg-morandi-gold/10 text-morandi-gold border border-morandi-gold/30 rounded-full px-2 py-0.5 text-xs">
                <span>{t('itineraryHotelBreakfast')}</span>
              </div>
            </div>
          ) : /* Lunch/Dinner: self preset chip */
          (mealKey === 'lunch' && day.lunchSelf) || (mealKey === 'dinner' && day.dinnerSelf) ? (
            <div className="flex items-center px-2">
              <div className="inline-flex items-center gap-1 bg-morandi-gold/10 text-morandi-gold border border-morandi-gold/30 rounded-full px-2 py-0.5 text-xs">
                <span>{t('itineraryFreeService')}</span>
              </div>
            </div>
          ) : /* Lunch/Dinner: airline preset chip */
          (mealKey === 'lunch' && day.lunchAirline) ||
            (mealKey === 'dinner' && day.dinnerAirline) ? (
            <div className="flex items-center px-2">
              <div className="inline-flex items-center gap-1 bg-morandi-gold/10 text-morandi-gold border border-morandi-gold/30 rounded-full px-2 py-0.5 text-xs">
                <span>{t('itineraryInFlightMeal')}</span>
              </div>
            </div>
          ) : /* Filled meal chip */
          mealText ? (
            <div className="flex items-center px-2">
              <div className="inline-flex items-center gap-1 bg-status-warning/10 text-status-warning border border-status-warning/30 rounded-full px-2 py-0.5 text-xs">
                <span>{mealText}</span>
                <button
                  type="button"
                  onClick={() => onClear(mealKey)}
                  className="hover:text-destructive"
                >
                  <X size={10} />
                </button>
              </div>
            </div>
          ) : (
            /* Combobox when empty */
            <MealCombobox
              mealKey={mealKey}
              placeholder={placeholder}
              restaurants={restaurantOptions}
              onPick={r => onPick(mealKey, r)}
              onPlainText={t => onPlainText(mealKey, t)}
              extraRightPadding={mealKey !== 'breakfast' || !isFirst}
            />
          )}

          {/* Breakfast toggle (hotel) */}
          {mealKey === 'breakfast' && !isFirst && (
            <button
              type="button"
              onClick={onToggleHotelBreakfast}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 z-10"
              title={t('itineraryHotelBreakfast')}
            >
              <Check
                size={12}
                className={`transition-opacity ${day.hotelBreakfast ? 'text-morandi-gold opacity-100' : 'text-muted-foreground opacity-30 hover:opacity-60'}`}
              />
            </button>
          )}

          {/* Lunch / Dinner toggles (self + airline) */}
          {(mealKey === 'lunch' || mealKey === 'dinner') && (
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => onTogglePreset(mealKey, 'self')}
                title={t('itineraryFreeService')}
              >
                <Check
                  size={12}
                  className={`transition-opacity ${
                    (mealKey === 'lunch' ? day.lunchSelf : day.dinnerSelf)
                      ? 'text-morandi-gold opacity-100'
                      : 'text-muted-foreground opacity-30 hover:opacity-60'
                  }`}
                />
              </button>
              <button
                type="button"
                onClick={() => onTogglePreset(mealKey, 'airline')}
                title={t('itineraryInFlightMeal')}
              >
                <Plane
                  size={12}
                  className={`transition-opacity ${
                    (mealKey === 'lunch' ? day.lunchAirline : day.dinnerAirline)
                      ? 'text-morandi-gold opacity-100'
                      : 'text-muted-foreground opacity-30 hover:opacity-60'
                  }`}
                />
              </button>
            </div>
          )}
        </div>
      </DroppableZone>
    </td>
  )
}

