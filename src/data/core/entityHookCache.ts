'use client'

/**
 * entityHookCache — IndexedDB 快取 + 使用者 context 工具函式
 *
 * 從 createEntityHook.ts 抽出、三類 module-level helper：
 * 1. generateUUID       — 兼容瀏覽器的 UUID v4 生成
 * 2. getCurrentUserContext — 從 localStorage 讀 workspace/user context
 * 3. useIdbFallback     — 通用 IDB 快取 fallback hook
 *
 * 全部 pure（不依賴任何 factory closure）、可獨立測試。
 */

import { useState, useEffect } from 'react'
import { get_cache } from '@/lib/cache/indexeddb-cache'
import type { UserRole } from '@/lib/rbac-config'

// ============================================
// UUID v4 生成（兼容瀏覽器）
// ============================================

export function generateUUID(): string {
  // 優先用原生 API
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  // Fallback: 手動生成 UUID v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// ============================================
// Workspace / User context（從 localStorage 讀）
// ============================================

/**
 * 取得當前使用者的 workspace_id 和 role
 *
 * userRole 僅供 SWR cache scoping、不用於權限決策。
 */
export function getCurrentUserContext(): {
  workspaceId: string | null
  userRole: UserRole | null
  userId: string | null
} {
  if (typeof window === 'undefined') return { workspaceId: null, userRole: null, userId: null }
  try {
    const authData = localStorage.getItem('auth-storage')
    if (authData) {
      const parsed = JSON.parse(authData)
      const user = parsed?.state?.user
      return {
        workspaceId: user?.workspace_id || null,
        userRole: 'staff' as UserRole,
        userId: user?.id || null,
      }
    }
  } catch {
    // 忽略解析錯誤
  }
  return { workspaceId: null, userRole: null, userId: null }
}

// ============================================
// useIdbFallback — 從 IndexedDB 載入快取作為 SWR fallback
// ============================================

/**
 * 通用 IDB fallback hook。
 *
 * cache_key 為 null 時不發讀取請求（skip pattern）。
 * 成功讀到快取 → 回傳 data；miss / error → 回傳 undefined。
 */
export function useIdbFallback<D>(cache_key: string | null): D | undefined {
  const [fallback, setFallback] = useState<D | undefined>(undefined)

  useEffect(() => {
    if (!cache_key) return
    let cancelled = false
    get_cache<D>(cache_key)
      .then(entry => {
        if (!cancelled && entry) {
          setFallback(entry.data)
        }
      })
      .catch(() => {
        /* cache miss is non-critical */
      })
    return () => {
      cancelled = true
    }
  }, [cache_key])

  return fallback
}

// ============================================
// Workspace 隔離配置（SSOT — fallback list）
// ============================================

/**
 * 需要 workspace 隔離的表格列表
 *
 * SSOT 註：理論上 entity config 自帶 workspaceScoped 才是 SSOT、本名單為 fallback。
 * 漸進式遷移：新 entity 請在 createEntityHook(...) config 內顯式設 workspaceScoped: true，
 * 不要再加進這個 list；本 list 隨時間萎縮、最終只剩 cross-tenant whitelist（如 workspaces）。
 */
export const WORKSPACE_SCOPED_TABLES = [
  // === 核心業務 ===
  'tours',
  'orders',
  'order_members',
  'customers',
  // === 行程與報價 ===
  'quotes',
  'itineraries',
  // === 財務管理 ===
  'payment_requests',
  'payment_request_items',
  'disbursement_orders',
  'receipts',
  // === 會計模組 ===
  'chart_of_accounts',
  'journal_vouchers',
  'confirmations',
  // === 其他業務 ===
  'todos',
  'calendar_events',
  'notes',
  // === 企業客戶（B2B）===
  'companies',
  'company_contacts',
  // === 金流串接 log ===
  // === PNR 系統 ===
  'pnrs',
  'pnr_records',
  'pnr_fare_history',
  'pnr_fare_alerts',
  'pnr_flight_status_history',
  'flight_status_subscriptions',
  'pnr_queue_items',
  'pnr_schedule_changes',
  'pnr_ai_queries',
  // === 其他 ===
  'airport_images',
  'request_responses',
  'request_response_items',
  // === 資料庫（景點/飯店等、Venturo schema 上是 per-workspace、不是 cross-tenant 公用主檔）===
  'countries',
  'cities',
  'regions',
  'ref_airports',
  'attractions',
  'hotels',
  'restaurants',
  'suppliers',
  // === 獎金系統 ===
  'tour_bonus_settings',
  'workspace_bonus_defaults',
  // === 核心表 ===
  'tour_itinerary_items',
]

/**
 * 表格對應的 code prefix（用於自動生成編號）
 *
 * A1（5/13 拍板）：orders.code 砍、order_number 為 SSOT、caller 自己用 generateOrderNumber RPC。
 */
export const TABLE_CODE_PREFIX: Record<string, string> = {
  tours: 'T',
  itineraries: 'I',
  // orders: 'O',  ← 移除、否則 createEntityHook 會 auto 生 code + INSERT 炸 42703
  customers: 'C',
  quotes: 'Q',
  payment_requests: 'PR',
  disbursement_orders: 'DO',
  receipt_orders: 'RO',
}

