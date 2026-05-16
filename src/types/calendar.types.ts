/**
 * 行事曆類型定義
 */

import type { BaseEntity } from './base.types'

/**
 * CalendarEvent 類型
 * 欄位與 Supabase calendar_events 表格對應
 */
export interface CalendarEvent extends BaseEntity {
  title: string
  description?: string | null
  start: string // ISO date string
  end: string // ISO date string
  all_day: boolean | null // DB 欄位允許 null
  type: CalendarEventType
  color?: string | null
  // 可見性
  visibility: CalendarVisibility
  // 關聯資料
  related_tour_id?: string | null
  related_order_id?: string | null
  // 參與者
  attendees?: string[] | null // employee IDs
  // 提醒
  reminder_minutes?: number | null
  // 重複事件
  recurring?: CalendarRecurring | null
  recurring_until?: string | null
  // 擁有者
  owner_id: string
}

/**
 * 行事曆事件類型
 * 注意：DB 存儲為 string，需要類型守衛
 */
export type CalendarEventType = 'tour' | 'meeting' | 'task' | 'reminder' | 'other'

/**
 * 行事曆可見性
 */
export type CalendarVisibility = 'personal' | 'company'

/**
 * 行事曆重複類型
 */
export type CalendarRecurring = 'daily' | 'weekly' | 'monthly' | 'yearly'

/**
 * 類型守衛：檢查是否為有效的 CalendarEventType
 */
export function isCalendarEventType(value: string): value is CalendarEventType {
  return ['tour', 'meeting', 'task', 'reminder', 'other'].includes(value)
}

/**
 * 類型守衛：檢查是否為有效的 CalendarVisibility
 */
export function isCalendarVisibility(value: string): value is CalendarVisibility {
  return ['personal', 'company'].includes(value)
}

/**
 * 類型守衛：檢查是否為有效的 CalendarRecurring
 */
export function isCalendarRecurring(value: string | null): value is CalendarRecurring {
  if (!value) return false
  return ['daily', 'weekly', 'monthly', 'yearly'].includes(value)
}

export type CreateCalendarEventData = Omit<CalendarEvent, keyof BaseEntity>
export type UpdateCalendarEventData = Partial<CreateCalendarEventData>
