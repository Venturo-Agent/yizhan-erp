'use client'

/**
 * Travel Invoices Entity
 *
 * 對應 travel_invoices 表（電子收據模組 Phase 1）
 *
 * 使用方式：
 * import { useTravelInvoices, createTravelInvoice } from '@/data'
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { BaseEntity } from '../core/types'

export interface TravelInvoice extends BaseEntity {
  workspace_id: string
  invoice_number: string | null
  invoice_date: string | null
  source_type: 'payment' | 'order' | 'manual' | null
  source_id: string | null
  buyer_name: string | null
  buyer_email: string | null
  buyer_phone: string | null
  buyer_ban: string | null
  buyer_address: string | null
  seller_name: string
  seller_ban: string
  carrier_type: 'cloud' | 'phone' | 'citizen' | 'none'
  carrier_number: string | null
  taxable_amount: number
  tax_amount: number
  total_amount: number
  tax_type: 'taxed' | 'zero' | 'exempt' | 'special'
  status: 'pending' | 'issued' | 'void' | 'allowance'
  provider_invoice_id: string | null
  provider_response: Record<string, unknown> | null
  note: string | null
  issued_at: string | null
  issued_by: string | null
}

const travelInvoiceEntity = createEntityHook<TravelInvoice>('travel_invoices', {
  list: {
    select:
      'id,workspace_id,invoice_number,invoice_date,source_type,source_id,buyer_name,buyer_email,seller_name,seller_ban,total_amount,tax_type,status,issued_at,created_at,updated_at',
    orderBy: { column: 'created_at', ascending: false },
    filterSoftDeleted: true,
  },
  slim: {
    select:
      'id,workspace_id,invoice_number,invoice_date,buyer_name,total_amount,status,issued_at',
  },
  detail: {
    select: '*',
  },
  cache: CACHE_PRESETS.medium,
})

export const useTravelInvoices = travelInvoiceEntity.useList
export const useTravelInvoicesSlim = travelInvoiceEntity.useListSlim
export const useTravelInvoice = travelInvoiceEntity.useDetail

export const createTravelInvoice = travelInvoiceEntity.create
export const updateTravelInvoice = travelInvoiceEntity.update
export const deleteTravelInvoice = travelInvoiceEntity.delete
export const invalidateTravelInvoices = travelInvoiceEntity.invalidate
