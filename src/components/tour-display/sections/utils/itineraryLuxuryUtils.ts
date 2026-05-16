'use client'

import { TourFormData } from '@/components/editor/tour-form/types'

// Luxury 配色（從 tokens 檔 re-export、向後相容舊 import 路徑）
export { LUXURY } from './luxuryTokens'

// Day 卡片背景色循環（7天不重複）
export const DAY_COLORS = [
  '#2C5F4D', // 深綠
  '#8F4F4F', // 酒紅
  '#4A6FA5', // 靛藍
  '#6B5B4F', // 摩卡棕
  '#5D6D7E', // 石板灰
  '#7D5A50', // 赤褐
  '#3D5A45', // 森林綠
]

// 計算 dayLabel
export function calculateDayLabels(itinerary: TourFormData['dailyItinerary']): string[] {
  const labels: string[] = []
  let currentDayNumber = 0
  let alternativeCount = 0

  for (let i = 0; i < itinerary.length; i++) {
    const day = itinerary[i]
    if (day.isAlternative) {
      alternativeCount++
      const suffix = String.fromCharCode(65 + alternativeCount)
      labels.push(`Day ${currentDayNumber}-${suffix}`)
    } else {
      currentDayNumber++
      alternativeCount = 0
      labels.push(`Day ${currentDayNumber}`)
    }
  }
  return labels
}

// 根據出發日期和實際天數（非 index）計算該天的日期
// actualDayNumber 是從 1 開始的實際天數，建議行程不增加天數
export function calculateDayDate(
  departureDate: string | undefined,
  actualDayNumber: number
): string {
  if (!departureDate || isNaN(actualDayNumber) || actualDayNumber < 1) return ''
  try {
    const date = new Date(departureDate)
    if (isNaN(date.getTime())) return ''
    // actualDayNumber 從 1 開始，所以 Day 1 = 出發日，Day 2 = 出發日 +1
    date.setDate(date.getDate() + (actualDayNumber - 1))
    const month = date.getMonth()
    const day = date.getDate()
    if (isNaN(month) || isNaN(day)) return ''
    const months = [
      'JAN',
      'FEB',
      'MAR',
      'APR',
      'MAY',
      'JUN',
      'JUL',
      'AUG',
      'SEP',
      'OCT',
      'NOV',
      'DEC',
    ]
    return `${months[month]} ${day}`
  } catch {
    return ''
  }
}

// 獲取星期幾縮寫
export function getDayOfWeek(dateStr: string | undefined): string {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return days[date.getDay()]
  } catch {
    return ''
  }
}

// 判斷是否為實際的最後一天（考慮替代行程）
export function isLastMainDay(
  itinerary: TourFormData['dailyItinerary'],
  currentIndex: number
): boolean {
  // 找出最後一個「非替代行程」的索引
  let lastMainDayIndex = -1
  for (let i = itinerary.length - 1; i >= 0; i--) {
    if (!itinerary[i].isAlternative) {
      lastMainDayIndex = i
      break
    }
  }

  // 如果當前是最後一個主行程，則為最後一天
  if (currentIndex === lastMainDayIndex) return true

  // 如果當前是替代行程，檢查其對應的主行程是否為最後一天
  // 替代行程（如 Day 3-B）跟隨在主行程（Day 3）之後，也視為最後一天
  if (itinerary[currentIndex].isAlternative) {
    // 向前找到對應的主行程
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (!itinerary[i].isAlternative) {
        return i === lastMainDayIndex
      }
    }
  }

  return false
}

// 圖片資訊介面
interface ImageInfo {
  url: string
  title?: string
  description?: string
}

// 圖片瀏覽器狀態介面
export interface ImageGalleryState {
  images: ImageInfo[]
  currentIndex: number
}

// 活動資訊介面
export interface ActivityInfo {
  title: string
  description?: string
  image?: string
}
