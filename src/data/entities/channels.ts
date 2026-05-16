'use client'

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { Channel } from '@/types/channel.types'

const channelEntity = createEntityHook<Channel>('channels', {
  list: {
    select:
      'id,workspace_id,type,tour_id,agent_id,name,description,created_by,is_system,is_archived,archived_at,created_at,updated_at,is_official,post_permission',
    orderBy: { column: 'updated_at', ascending: false },
  },
  slim: {
    select: 'id,type,tour_id,agent_id,name,is_system,is_archived,is_official,post_permission',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.low,
})

export const useChannels = channelEntity.useList
export const useChannel = channelEntity.useDetail
export const createChannel = channelEntity.create
export const updateChannel = channelEntity.update
export const deleteChannel = channelEntity.delete
export const invalidateChannels = channelEntity.invalidate
