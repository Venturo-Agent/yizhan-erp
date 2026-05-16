'use client'

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { AiAgent } from '@/types/channel.types'

const aiAgentEntity = createEntityHook<AiAgent>('ai_agents', {
  list: {
    select:
      'id,workspace_id,code,name,avatar_url,description,scope,capabilities,status,created_at,updated_at',
    orderBy: { column: 'created_at', ascending: true },
  },
  slim: {
    select: 'id,code,name,avatar_url,scope,status',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.high,
})

export const useAiAgents = aiAgentEntity.useList
export const useAiAgentsSlim = aiAgentEntity.useListSlim
export const useAiAgent = aiAgentEntity.useDetail
export const invalidateAiAgents = aiAgentEntity.invalidate
