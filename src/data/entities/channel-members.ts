'use client'

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { ChannelMember } from '@/types/channel.types'

const channelMemberEntity = createEntityHook<ChannelMember>('channel_members', {
  list: {
    select: 'id,channel_id,employee_id,role,joined_at,last_read_at',
    orderBy: { column: 'joined_at', ascending: true },
  },
  slim: {
    select: 'id,channel_id,employee_id,role,last_read_at',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.low,
  // channel_members 沒 updated_by column（member 自己 update last_read_at、不需 audit owner）
  skipAuditFields: true,
})

export const useChannelMembers = channelMemberEntity.useList
export const createChannelMember = channelMemberEntity.create
export const updateChannelMember = channelMemberEntity.update
export const deleteChannelMember = channelMemberEntity.delete
export const invalidateChannelMembers = channelMemberEntity.invalidate
