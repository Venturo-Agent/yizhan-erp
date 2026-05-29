/**
 * Stores 統一匯出（Zustand-based）
 *
 * 此檔案使用 Zustand Store（舊架構、向後相容）
 * 新功能優先使用 @/data（SWR-based 統一資料層）
 *
 * 2026-05-29 B11：移除 useOrderStore（0 caller、純孤兒）；
 *   useTourStore / useQuoteStore 仍被對應 service 用同步 getState() 取資料，
 *   屬於 BaseService<T> + sync StoreOperations 架構、不能單純 swap 成 entity hook，
 *   遷移需要先把 BaseService 改成 async-friendly、再逐步搬 caller，這條另案處理。
 */

import { createStore } from './core/create-store'

// 從 @/types 匯入（使用 types/ 目錄下的標準定義）
import type { Tour } from '@/types'

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
 *
 * caller：src/app/(main)/tours/_services/tour.service.ts（同步 getState() 用）
 */
export const useTourStore = createStore<Tour>({
  tableName: 'tours',
  codePrefix: 'T',
  workspaceScoped: true,
  listFields:
    'id,code,name,status,departure_date,return_date,max_participants,current_participants,workspace_id,created_at',
})

/**
 * 報價單 Store
 * 🔒 啟用 Workspace 隔離
 * listFields: 列表頁只抓需要的欄位（詳情頁 fetchById 仍 select('*')）
 *
 * caller：src/app/(main)/orders/_quotes/_services/quote.service.ts（同步 getState() 用、5 處）
 */
export const useQuoteStore = createStore<Quote>({
  tableName: 'quotes',
  codePrefix: 'Q',
  workspaceScoped: true,
  listFields: 'id,tour_id,name,total_cost,group_size,status,workspace_id,created_at',
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
