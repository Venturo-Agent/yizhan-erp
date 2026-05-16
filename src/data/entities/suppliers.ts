'use client'

/**
 * Suppliers Entity
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { Supplier } from '@/stores/types'

// 5/13 dev 環境發現：suppliers entity hook SELECT 跟 DB schema 大幅 drift、17 個欄位 hook 內有 DB 沒
// 全清對齊 DB 真實 column（不含 password_hash、敏感不該 list 抓）
const supplierEntity = createEntityHook<Supplier>('suppliers', {
  list: {
    select:
      'id,code,name,short_name,supplier_type_code,contact_person,phone,mobile,email,line_id,wechat_id,country,city,address,bank_name,bank_branch,bank_account,bank_account_name,is_domestic,bank_code,swift_code,is_active,workspace_id,created_at,updated_at,created_by,updated_by,tax_id,notes,usage_count',
    // 預設按使用次數降序（常用排前）、同 usage 按 name asc
    orderBy: { column: 'usage_count', ascending: false },
    // 5/13 dev 發現 suppliers 表沒 deleted_at column、不支援 soft delete
    // 之後決定要不要加 deleted_at（schema 改動 + caller migration）
    filterSoftDeleted: false,
  },
  slim: {
    select:
      'id,code,name,short_name,contact_person,phone,mobile,email,is_domestic,bank_code,bank_name,bank_account,bank_account_name,usage_count',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.low,
})

export const useSuppliers = supplierEntity.useList
export const useSuppliersSlim = supplierEntity.useListSlim
const _useSupplier = supplierEntity.useDetail
const _useSuppliersPaginated = supplierEntity.usePaginated
const _useSupplierDictionary = supplierEntity.useDictionary

export const createSupplier = supplierEntity.create
export const updateSupplier = supplierEntity.update
export const deleteSupplier = supplierEntity.delete
export const invalidateSuppliers = supplierEntity.invalidate
