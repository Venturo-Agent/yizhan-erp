/**
 * Suppliers feature types
 */

import type { Supplier } from '@/types/supplier.types'

export type { Supplier }

export interface SupplierFormData {
  supplier_code: string
  name: string
  country: string
  region: string
  cities: string[]
  type: 'hotel' | 'restaurant' | 'bus_company' | 'airline' | 'attraction' | 'other'
  contact: {
    contact_person: string
    phone: string
    email: string
    address: string
    website: string
  }
  status: 'active' | 'inactive'
  note: string
}

export interface SupplierFilters {
  searchQuery: string
  statusFilter?: 'active' | 'inactive'
  typeFilter?: 'hotel' | 'restaurant' | 'bus_company' | 'airline' | 'attraction' | 'other'
  countryFilter?: string
}
