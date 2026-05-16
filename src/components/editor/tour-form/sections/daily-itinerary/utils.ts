import { DailyItinerary } from '../../types'

/**
 * 計算 dayLabel 的函數 - 處理建議方案編號
 * 例：Day 1, Day 2, Day 2-B (建議方案), Day 3
 */
export function calculateDayLabels(itinerary: DailyItinerary[]): string[] {
  const labels: string[] = []
  let currentDayNumber = 0
  let alternativeCount = 0 // 當前建議方案的計數 (B=1, C=2, ...)

  for (let i = 0; i < itinerary.length; i++) {
    const day = itinerary[i]

    if (day.isAlternative) {
      // 這是建議方案，使用前一個正規天數的編號 + 字母
      alternativeCount++
      const suffix = String.fromCharCode(65 + alternativeCount) // B, C, D...
      labels.push(`Day ${currentDayNumber}-${suffix}`)
    } else {
      // 這是正規天數
      currentDayNumber++
      alternativeCount = 0 // 重置建議方案計數
      labels.push(`Day ${currentDayNumber}`)
    }
  }

  return labels
}
