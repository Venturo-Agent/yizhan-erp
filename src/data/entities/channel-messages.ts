'use client'

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { ChannelMessage } from '@/types/channel.types'

/**
 * channel_messages entity
 *
 * Realtime：createEntityHook 內建 useRealtimeSync()、postgres_changes 自動接、
 * 訊息進來不用 refresh、Phase D 不用再寫 code。
 *
 * sender join：UI 層用 useEmployeesSlim 自己 dict join 出 sender_name，
 * 避免 RLS 跨表 join 撞牆。
 */

const channelMessageEntity = createEntityHook<ChannelMessage>('channel_messages', {
  list: {
    // 2026-05-15 補 recipient_employee_id（私訊收件人）
    select:
      'id,channel_id,sender_employee_id,sender_agent_id,recipient_employee_id,body,message_type,payload,reply_to_id,reply_count,last_reply_at,scheduled_at,is_pinned,reactions,attachments,is_active,revoked_at,created_at,edited_at',
    orderBy: { column: 'created_at', ascending: true },
  },
  slim: {
    select:
      'id,channel_id,sender_employee_id,sender_agent_id,body,message_type,reply_to_id,created_at',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.low,
})

export const useChannelMessages = channelMessageEntity.useList
export const createChannelMessage = channelMessageEntity.create
export const updateChannelMessage = channelMessageEntity.update
export const deleteChannelMessage = channelMessageEntity.delete
export const invalidateChannelMessages = channelMessageEntity.invalidate
