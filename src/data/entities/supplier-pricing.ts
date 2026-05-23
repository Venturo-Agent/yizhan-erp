'use client'

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { Database } from '@/lib/supabase/types'

type SupplierPricing = Database['public']['Tables']['supplier_pricing']['Row']

const supplierPricingEntity = createEntityHook<SupplierPricing>('supplier_pricing', {
  list: {
    select:
      'id,workspace_id,supplier_id,application_service_type_id,price,effective_from,superseded_at,notes,created_at',
    orderBy: { column: 'effective_from', ascending: false },
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.medium,
})

export const useSupplierPricings = supplierPricingEntity.useList
export const useSupplierPricing = supplierPricingEntity.useDetail
export const invalidateSupplierPricings = supplierPricingEntity.invalidate
export const createSupplierPricing = supplierPricingEntity.create
export const updateSupplierPricing = supplierPricingEntity.update
export const deleteSupplierPricing = supplierPricingEntity.delete
export type { SupplierPricing }
