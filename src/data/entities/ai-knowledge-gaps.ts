'use client'

/**
 * AI Knowledge Gaps Entity
 *
 * 對應 ai_knowledge_gaps 表（William 2026-05-28 拍板「白痴起點 + 訓練飛輪」）
 *
 * 使用方式：
 *   import { useAiKnowledgeGaps, updateAiKnowledgeGap } from '@/data'
 *   const { data, isLoading } = useAiKnowledgeGaps({ filter: { status: 'pending' } })
 *
 * 注意：
 *   - 不 export create（AI 自動寫入、走 tool execute → admin client）
 *   - update / delete 走 entity hook（業務 review 用）
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { BaseEntity } from '../core/types'

export type KnowledgeGapStatus = 'pending' | 'trained' | 'declined' | 'duplicated'

export interface AiKnowledgeGap extends BaseEntity {
  workspace_id: string
  conversation_id: string | null
  external_user_id: string | null
  customer_name: string | null
  question_text: string
  topic_hint: string | null
  ai_response: string | null
  status: KnowledgeGapStatus
  notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
}

const aiKnowledgeGapEntity = createEntityHook<AiKnowledgeGap>('ai_knowledge_gaps', {
  list: {
    select:
      'id,workspace_id,conversation_id,external_user_id,customer_name,question_text,topic_hint,ai_response,status,notes,reviewed_by,reviewed_at,created_at,updated_at',
    orderBy: { column: 'created_at', ascending: false },
    // 此表無 deleted_at 欄位、不過 filterSoftDeleted（false）
    filterSoftDeleted: false,
  },
  slim: {
    select: 'id,workspace_id,question_text,topic_hint,status,created_at',
  },
  detail: {
    select: '*',
  },
  cache: CACHE_PRESETS.low,
})

export const useAiKnowledgeGaps = aiKnowledgeGapEntity.useList
export const useAiKnowledgeGap = aiKnowledgeGapEntity.useDetail
export const updateAiKnowledgeGap = aiKnowledgeGapEntity.update
export const invalidateAiKnowledgeGaps = aiKnowledgeGapEntity.invalidate
