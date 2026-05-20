'use client'

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { Database } from '@/lib/supabase/types'

type CustomerDocument = Database['public']['Tables']['customer_documents']['Row']

const customerDocumentEntity = createEntityHook<CustomerDocument>('customer_documents', {
  list: {
    select:
      'id,workspace_id,customer_id,document_type_id,document_number,document_name,document_name_print,status,is_primary,valid_from,expires_on,image_url,created_at,updated_at',
    orderBy: { column: 'created_at', ascending: false },
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.medium,
})

export const useCustomerDocuments = customerDocumentEntity.useList
export const useCustomerDocument = customerDocumentEntity.useDetail
export const invalidateCustomerDocuments = customerDocumentEntity.invalidate
export const createCustomerDocument = customerDocumentEntity.create
export const updateCustomerDocument = customerDocumentEntity.update
export const deleteCustomerDocument = customerDocumentEntity.delete
export type { CustomerDocument }
