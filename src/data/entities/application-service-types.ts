'use client'

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { Database } from '@/lib/supabase/types'

type ApplicationServiceType = Database['public']['Tables']['application_service_types']['Row']

const applicationServiceTypeEntity = createEntityHook<ApplicationServiceType>(
  'application_service_types',
  {
    list: {
      select:
        'id,code,label,document_type_id,estimated_business_days,is_urgent,sort_order,is_active',
      orderBy: { column: 'sort_order', ascending: true },
    },
    slim: { select: 'id,code,label,document_type_id' },
    detail: { select: '*' },
    cache: CACHE_PRESETS.high,
  }
)

export const useApplicationServiceTypes = applicationServiceTypeEntity.useList
export const useApplicationServiceType = applicationServiceTypeEntity.useDetail
export const useApplicationServiceTypesSlim = applicationServiceTypeEntity.useListSlim
export const invalidateApplicationServiceTypes = applicationServiceTypeEntity.invalidate
export const createApplicationServiceType = applicationServiceTypeEntity.create
export const updateApplicationServiceType = applicationServiceTypeEntity.update
export const deleteApplicationServiceType = applicationServiceTypeEntity.delete
export type { ApplicationServiceType }
