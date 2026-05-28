/**
 * 行程表格式化工具
 * 共用於 usePackageItinerary 和 tour-itinerary-tab
 */

import type { DailyScheduleItem, PreviewDayData } from './types'
import type { FlightInfo } from '@/types/flight.types'
import { formatDate } from '@/lib/utils/format-date'

const COMPONENT_LABELS = {
  TH_DATE: '日期',
  TH_CONTENT: '行程內容',
  TH_BREAKFAST: '早餐',
  TH_LUNCH: '午餐',
  TH_DINNER: '晚餐',
  TH_ACCOMMODATION: '住宿',
} as const

// ============================================
// 每日行程格式化
// ============================================

interface FormatDailyOptions {
  dailySchedule: DailyScheduleItem[]
  startDate: string | null
  getPreviousAccommodation: (index: number) => string
  /** 是否包含 isSameAccommodation 欄位 */
  includeSameAccommodation?: boolean
}

/**
 * 格式化每日行程為存儲/API 格式
 */
export function formatDailyItinerary({
  dailySchedule,
  startDate,
  getPreviousAccommodation,
  includeSameAccommodation = false,
}: FormatDailyOptions) {
  return dailySchedule.map((day, idx) => {
    let dateLabel = ''
    if (startDate) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + idx)
      const weekdays = ['日', '一', '二', '三', '四', '五', '六']
      dateLabel = `${date.getMonth() + 1}/${date.getDate()} (${weekdays[date.getDay()]})`
    }

    // 標題直接用使用者填的行程標題（route，已含景點名稱）；
    // 沒填時用中性的「今日行程標題」、不再加「抵達目的地/返回台灣」前綴
    const title = day.route?.trim() || '今日行程標題'
    const breakfast = day.hotelBreakfast ? '飯店早餐' : day.meals.breakfast
    const lunch = day.lunchSelf ? '敬請自理' : day.meals.lunch
    const dinner = day.dinnerSelf ? '敬請自理' : day.meals.dinner
    let accommodation = day.accommodation || ''
    if (day.sameAsPrevious) {
      accommodation = getPreviousAccommodation(idx) || '續住'
    }

    const formattedActivities = (day.activities || []).map(act => ({
      icon: '',
      title: act.title,
      description: '',
      startTime: act.startTime,
      endTime: act.endTime,
      ...(act.attractionId ? { attraction_id: act.attractionId } : {}),
    }))

    const base = {
      dayLabel: `Day ${day.day}`,
      date: dateLabel,
      title,
      highlight: '',
      description: '',
      activities: formattedActivities,
      recommendations: [],
      meals: { breakfast, lunch, dinner },
      accommodation: day.sameAsPrevious
        ? `續住 (${getPreviousAccommodation(idx) || ''})`
        : accommodation,
      images: [],
    }

    if (includeSameAccommodation) {
      return { ...base, isSameAccommodation: day.sameAsPrevious || false }
    }

    return base
  })
}

// ============================================
// 預覽資料
// ============================================

/**
 * 產生預覽用的每日資料
 */
export function getPreviewDailyData(
  dailySchedule: DailyScheduleItem[],
  startDate: string | null
): PreviewDayData[] {
  return dailySchedule.map((day, idx) => {
    let dateLabel = ''
    if (startDate) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + idx)
      const weekdays = ['日', '一', '二', '三', '四', '五', '六']
      dateLabel = `${date.getMonth() + 1}/${date.getDate()} (${weekdays[date.getDay()]})`
    }
    // 標題直接用使用者填的行程標題（route，已含景點名稱）；
    // 沒填時用中性的「今日行程標題」、不再加「抵達目的地/返回台灣」前綴
    const title = day.route?.trim() || '今日行程標題'
    const breakfast = day.hotelBreakfast ? '飯店早餐' : day.meals.breakfast
    const lunch = day.lunchSelf ? '敬請自理' : day.meals.lunch
    const dinner = day.dinnerSelf ? '敬請自理' : day.meals.dinner
    let accommodation = day.accommodation || ''
    if (day.sameAsPrevious && idx > 0) {
      for (let i = idx - 1; i >= 0; i--) {
        if (!dailySchedule[i].sameAsPrevious && dailySchedule[i].accommodation) {
          accommodation = dailySchedule[i].accommodation
          break
        }
      }
      if (!accommodation) accommodation = '續住'
    }
    return {
      dayLabel: `Day ${day.day}`,
      date: dateLabel,
      title,
      note: day.note || undefined,
      meals: { breakfast, lunch, dinner },
      accommodation: idx === dailySchedule.length - 1 ? '' : accommodation,
    }
  })
}

// ============================================
// 列印 HTML
// ============================================

interface PrintOptions {
  title: string
  companyName: string
  destination: string
  startDate: string | null
  isDomestic: boolean
  outboundFlight: FlightInfo | null
  returnFlight: FlightInfo | null
  dailyData: PreviewDayData[]
}

/**
 * 產生列印用的 HTML
 */
export function generatePrintHtml({
  title,
  companyName,
  destination,
  startDate,
  isDomestic,
  outboundFlight,
  returnFlight,
  dailyData,
}: PrintOptions): string {
  const flightHtml =
    !isDomestic && (outboundFlight || returnFlight)
      ? `
    <div class="info-grid" style="margin-top: 8px;">
      ${outboundFlight ? `<div><span class="info-label">去程航班：</span>${outboundFlight.airline} ${outboundFlight.flightNumber} (${outboundFlight.departureAirport} ${outboundFlight.departureTime} → ${outboundFlight.arrivalAirport} ${outboundFlight.arrivalTime})</div>` : ''}
      ${returnFlight ? `<div><span class="info-label">回程航班：</span>${returnFlight.airline} ${returnFlight.flightNumber} (${returnFlight.departureAirport} ${returnFlight.departureTime} → ${returnFlight.arrivalAirport} ${returnFlight.arrivalTime})</div>` : ''}
    </div>`
      : ''

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title || '行程表'}</title>
      <style>
        @page { size: A4; margin: 10mm; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; }
        .header { border-bottom: 2px solid #c9aa7c; padding-bottom: 16px; margin-bottom: 24px; }
        .title { font-size: 24px; font-weight: bold; color: #3a3633; margin-bottom: 4px; }
        .company { text-align: right; color: #c9aa7c; font-weight: 600; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 16px; font-size: 14px; }
        .info-label { color: #8b8680; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 16px; }
        th { background: #c9aa7c; color: white; padding: 8px; text-align: left; border: 1px solid #c9aa7c; }
        td { padding: 8px; border: 1px solid #e8e5e0; }
        tr:nth-child(even) { background: #f6f4f1; }
        .day-label { font-weight: 600; color: #c9aa7c; }
        .day-date { font-size: 11px; color: #8b8680; }
        .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e8e5e0; text-align: center; font-size: 12px; color: #8b8680; }
      </style>
    </head>
    <body>
      <div class="header">
        <div style="display: flex; justify-content: space-between;">
          <div><div class="title">${title || '行程表'}</div></div>
          <div class="company">${companyName}</div>
        </div>
        <div class="info-grid">
          <div><span class="info-label">目的地：</span>${destination}</div>
          <div><span class="info-label">出發日期：</span>${startDate || '-'}</div>
          <div><span class="info-label">行程天數：</span>${dailyData.length} 天</div>
        </div>
        ${flightHtml}
      </div>
      <table>
        <thead>
          <tr>
            <th style="width: 80px;">${COMPONENT_LABELS.TH_DATE}</th>
            <th>${COMPONENT_LABELS.TH_CONTENT}</th>
            <th style="width: 70px; text-align: center;">${COMPONENT_LABELS.TH_BREAKFAST}</th>
            <th style="width: 70px; text-align: center;">${COMPONENT_LABELS.TH_LUNCH}</th>
            <th style="width: 70px; text-align: center;">${COMPONENT_LABELS.TH_DINNER}</th>
            <th style="width: 120px;">${COMPONENT_LABELS.TH_ACCOMMODATION}</th>
          </tr>
        </thead>
        <tbody>
          ${dailyData
            .map(
              day => `
            <tr>
              <td>
                <div class="day-label">${day.dayLabel}</div>
                <div class="day-date">${day.date}</div>
              </td>
              <td>${day.title}</td>
              <td style="text-align: center; font-size: 12px;">${day.meals.breakfast || '-'}</td>
              <td style="text-align: center; font-size: 12px;">${day.meals.lunch || '-'}</td>
              <td style="text-align: center; font-size: 12px;">${day.meals.dinner || '-'}</td>
              <td style="font-size: 12px;">${day.accommodation || '-'}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
      <div class="footer">
        本行程表由 ${companyName} 提供 | 列印日期：${formatDate(new Date())}
      </div>
    </body>
    </html>
  `
}
