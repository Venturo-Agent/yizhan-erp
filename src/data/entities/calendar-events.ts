'use client'

/**
 * Calendar Events Entity
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { CalendarEvent } from '@/types/calendar.types'

const calendarEventEntity = createEntityHook<CalendarEvent>('calendar_events', {
  workspaceScoped: true, // 2026-05-29 B11：從 WORKSPACE_SCOPED_TABLES fallback 名單搬進顯式宣告
  list: {
    select:
      'id,title,description,start,end,all_day,type,color,visibility,related_tour_id,related_order_id,attendees,reminder_minutes,recurring,recurring_until,owner_id,created_at,updated_at,created_by,updated_by,workspace_id',
    orderBy: { column: 'start', ascending: true },
  },
  slim: {
    select: 'id,title,start,end,type,color,visibility,all_day',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.medium,
})

export const useCalendarEvents = calendarEventEntity.useList
const _useCalendarEventsSlim = calendarEventEntity.useListSlim
const _useCalendarEvent = calendarEventEntity.useDetail
const _useCalendarEventsPaginated = calendarEventEntity.usePaginated
const _useCalendarEventDictionary = calendarEventEntity.useDictionary

export const createCalendarEvent = calendarEventEntity.create
export const updateCalendarEvent = calendarEventEntity.update
export const deleteCalendarEvent = calendarEventEntity.delete
export const invalidateCalendarEvents = calendarEventEntity.invalidate
