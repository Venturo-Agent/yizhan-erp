'use client'

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { Database } from '@/lib/supabase/types'

type CustomerDocumentApplication =
  Database['public']['Tables']['customer_document_applications']['Row']

const customerDocumentApplicationEntity = createEntityHook<CustomerDocumentApplication>(
  'customer_document_applications',
  {
    list: {
      select:
        'id,workspace_id,customer_document_id,application_service_type_id,status,standard_price,actual_price,fee_charged,submitted_at,collected_at,rejected_at,returned_to_customer_at,supplier_id,tour_id,order_id,order_member_id,notes,created_at,updated_at',
      orderBy: { column: 'created_at', ascending: false },
    },
    detail: { select: '*' },
    cache: CACHE_PRESETS.low,
  }
)

export const useCustomerDocumentApplications = customerDocumentApplicationEntity.useList
export const useCustomerDocumentApplication = customerDocumentApplicationEntity.useDetail
export const invalidateCustomerDocumentApplications = customerDocumentApplicationEntity.invalidate
export const createCustomerDocumentApplication = customerDocumentApplicationEntity.create
export const updateCustomerDocumentApplication = customerDocumentApplicationEntity.update
export const deleteCustomerDocumentApplication = customerDocumentApplicationEntity.delete
export type { CustomerDocumentApplication }
