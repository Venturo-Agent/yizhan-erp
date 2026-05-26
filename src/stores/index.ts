/**
 * Stores 統一匯出（Zustand-based）
 *
 * 此檔案使用 Zustand Store（舊架構、向後相容）
 * 新功能優先使用 @/data（SWR-based 統一資料層）
 */

import { createStore } from './core/create-store'

// 從 @/types 匯入（使用 types/ 目錄下的標準定義）
import type { Tour, Order, Employee } from '@/types'

// 從本地 types 匯入
import type { Quote } from './types'

// Supplier 從標準 types 匯入
import type {} from '@/types/supplier.types'

// ============================================
// 仍有引用的 createStore Stores
// ============================================

/**
 * 旅遊團 Store
 * 🔒 啟用 Workspace 隔離
 * listFields: 列表頁只抓需要的欄位（詳情頁 fetchById 仍 select('*')）
 */
export const useTourStore = createStore<Tour>({
  tableName: 'tours',
  codePrefix: 'T',
  workspaceScoped: true,
  listFields:
    'id,code,name,status,departure_date,return_date,max_participants,current_participants,workspace_id,created_at',
})

/**
 * 訂單 Store
 * 🔒 啟用 Workspace 隔離
 * listFields: 列表頁只抓需要的欄位（詳情頁 fetchById 仍 select('*')）
 */
export const useOrderStore = createStore<Order>({
  tableName: 'orders',
  workspaceScoped: true,
  listFields:
    'id,order_number,tour_id,tour_name,contact_person,payment_status,total_amount,paid_amount,remaining_amount,member_count,workspace_id,created_at',
})

/**
 * 報價單 Store
 * 🔒 啟用 Workspace 隔離
 * listFields: 列表頁只抓需要的欄位（詳情頁 fetchById 仍 select('*')）
 */
export const useQuoteStore = createStore<Quote>({
  tableName: 'quotes',
  codePrefix: 'Q',
  workspaceScoped: true,
  listFields: 'id,tour_id,name,total_cost,group_size,status,workspace_id,created_at',
})

/**
 * 員工 Store
 * ⚠️ 不啟用 Workspace 隔離（全局共享基礎資料）
 */
const _useEmployeeStore = createStore<Employee>({
  tableName: 'employees',
  workspaceScoped: false,
})

// ============================================
// 地區型別 re-export（供既有 import 使用）
// ============================================

// ============================================
// 保留的特殊 Stores（認證、UI 狀態）
// ============================================

export { useAuthStore } from './auth-store'

// ============================================
// 進階 Stores
// ============================================

export { useCalendarStore } from './calendar-store'
export { useWorkspaceStore } from './workspace'

// ============================================
// 型別匯出（方便使用）
// ============================================

// 財務收款系統型別
export type { Receipt, ReceiptItem } from '@/types/receipt.types'

// ============================================
// Store 同步系統
// ============================================
