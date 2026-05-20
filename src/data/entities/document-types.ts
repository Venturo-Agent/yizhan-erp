'use client'

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { Database } from '@/lib/supabase/types'

type DocumentType = Database['public']['Tables']['document_types']['Row']

const documentTypeEntity = createEntityHook<DocumentType>('document_types', {
  list: {
    select: 'id,code,label,group_label,sort_order,is_active',
    orderBy: { column: 'sort_order', ascending: true },
  },
  slim: { select: 'id,code,label,group_label' },
  detail: { select: '*' },
  cache: CACHE_PRESETS.high,
})

export const useDocumentTypes = documentTypeEntity.useList
export const useDocumentType = documentTypeEntity.useDetail
export const useDocumentTypesSlim = documentTypeEntity.useListSlim
export const invalidateDocumentTypes = documentTypeEntity.invalidate
export type { DocumentType }
