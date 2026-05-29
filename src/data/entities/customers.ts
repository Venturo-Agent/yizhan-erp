'use client'

/**
 * Customers Entity
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { Customer } from '@/stores/types'

const customerEntity = createEntityHook<Customer>('customers', {
  workspaceScoped: true, // 2026-05-29 B11：從 WORKSPACE_SCOPED_TABLES fallback 名單搬進顯式宣告
  list: {
    // 排除 passport_image_url 以避免載入大量 base64 圖片資料
    // 護照圖片只在詳情頁面需要時才載入
    // 2026-05-15 補 passport_name_print / avatar_url / emergency_contact / sex / nationality / 會員系統 / LINE 連結
    // passport_image_url 仍排除（base64 體積大、留 detail 才撈）
    select:
      'id,code,name,english_name,nickname,phone,alternative_phone,email,address,city,country,national_id,passport_number,passport_name,passport_name_print,passport_expiry,birth_date,gender,sex,nationality,company,tax_id,member_type,is_vip,vip_level,source,referred_by,notes,is_active,total_orders,total_spent,last_order_date,verification_status,dietary_restrictions,avatar_url,emergency_contact,total_points,linked_at,linked_method,online_user_id,line_user_id,workspace_id,created_at,updated_at,created_by,updated_by',
    orderBy: { column: 'created_at', ascending: false },
    filterSoftDeleted: true,
  },
  slim: {
    select:
      'id,code,name,phone,email,birth_date,gender,is_vip,passport_name,passport_number,passport_expiry,national_id',
  },
  detail: { select: '*' }, // 詳情頁才載入完整資料（包含 passport_image_url）
  cache: CACHE_PRESETS.medium,
})

export const useCustomers = customerEntity.useList
export const useCustomersSlim = customerEntity.useListSlim
const _useCustomer = customerEntity.useDetail
export const useCustomersPaginated = customerEntity.usePaginated
const _useCustomerDictionary = customerEntity.useDictionary

export const createCustomer = customerEntity.create
export const updateCustomer = customerEntity.update
export const deleteCustomer = customerEntity.delete
export const invalidateCustomers = customerEntity.invalidate
