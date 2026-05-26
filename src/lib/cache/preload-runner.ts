/**
 * Preload Runner — 首次登入預載執行器（stub）
 *
 * 配 ADR-0005 / refactor-backlog #2
 *
 * 介面 stub 階段：
 *   - 介面 freeze：runPreload / getCacheVersion / PreloadProgress / PreloadResult
 *   - 不實際抓資料、預設回 ok=true
 *   - D+1 之後接 caller 時、只填內部實作、介面不變
 *
 * 實作藍圖（D+1）：
 *   1. iterate PRELOAD_SHAPES
 *   2. 每個 shape：
 *      - build query: supabase.from(table).select(select)
 *      - filter='workspace' → enforceWorkspaceScope({ workspaceId })
 *      - 否則直接 fetch
 *      - set_cache(buildPreloadCacheKey(shape, ctx), data) 寫進 IDB
 *      - onProgress({ total, completed, current })
 *   3. 全跑完 → 寫 cacheVersion 進 IDB（key = 'preload:meta:version'）
 *   4. 回 PreloadResult（ok / errors / cacheVersion）
 *
 * 失敗策略（D+1 再決）：
 *   - 單一 shape 失敗 → 不中斷、記進 errors[]、繼續跑下一個
 *   - 全失敗 → ok=false、PreloadGate 應顯示 retry
 */

import { PRELOAD_SHAPES } from './preload-config'

// ============================================
// SupabaseLike — 鬆耦合、避免直接咬 @supabase/supabase-js 型別
// ============================================

/**
 * 最小可用的 Supabase client 介面
 *
 * runner 只需要 .from(table).select(cols)、後續 chain 由 enforceWorkspaceScope 處理。
 * 用 minimal interface 是為了：
 *   1. 測試好 mock（不需整包 createClient）
 *   2. 之後換 client（admin / typed-client）也不用改 runner
 */
export interface SupabaseLike {
  from: (table: string) => {
    select: (cols: string) => unknown
  }
}

// ============================================
// Public Types
// ============================================

/**
 * 預載進度回報
 *
 * onProgress 觸發時機：每個 shape 開始抓 + 抓完都會 callback 一次。
 *   - current = undefined  → 全部完成
 *   - current = 'suppliers' → 正在抓 suppliers
 */
export interface PreloadProgress {
  total: number
  completed: number
  /** 當前在抓哪個 table、undefined 表示已全部完成 */
  current?: string
}

/**
 * 預載結果
 *
 * cacheVersion：semver-style 字串、寫進 IDB 留作下次比對。
 * errors：單一 shape 失敗收進來、整體不算失敗（除非全掛）。
 */
export interface PreloadResult {
  ok: boolean
  cacheVersion: string
  errors?: Array<{ table: string; message: string }>
}

/**
 * runPreload 選項
 */
export interface PreloadOptions {
  /** 進度 callback、UI 顯示進度條時用 */
  onProgress?: (p: PreloadProgress) => void
  /** 跳過某些 shape（debug / 灰度上線用）*/
  skipTables?: string[]
}

/**
 * runPreload 必要 context
 */
export interface PreloadContext {
  workspaceId: string
}

// ============================================
// Constants
// ============================================

/**
 * 當前 stub 版本號
 *
 * D+1 接通實作時、改用 schema-derived version（如 git sha + shape hash）。
 */
const STUB_CACHE_VERSION = 'v0.1.0-stub'

// ============================================
// Public API
// ============================================

/**
 * 跑首次登入預載
 *
 * Stub：不實作 fetch、直接回 ok=true。但介面已 freeze、caller 可開始寫整合 code。
 *
 * D+1 接通時、實作會：
 *   1. iterate PRELOAD_SHAPES（用 skipTables 過濾）
 *   2. 每個 shape build query、套 enforceWorkspaceScope（filter='workspace' 時）
 *   3. fetch → set_cache(buildPreloadCacheKey(shape, ctx), data)
 *   4. onProgress 回報
 *   5. 寫 cacheVersion meta
 *   6. 回 PreloadResult
 *
 * @param supabase  Supabase client（or 最小 mock）
 * @param ctx       含 workspaceId、提供給 workspace-scoped shape
 * @param options   onProgress / skipTables
 */
export async function runPreload(
  supabase: SupabaseLike,

  ctx: PreloadContext,
  options?: PreloadOptions
): Promise<PreloadResult> {
  // 介面層自我檢查：caller 給的選項至少不會 throw
  const skipSet = new Set(options?.skipTables ?? [])
  const shapesToRun = PRELOAD_SHAPES.filter(s => !skipSet.has(s.table))

  // Stub 階段：不實際抓資料、但仍尊重 onProgress 介面
  // 模擬「全部完成」的單次 callback、讓 caller 能驗 UI flow
  if (options?.onProgress) {
    options.onProgress({
      total: shapesToRun.length,
      completed: shapesToRun.length,
      current: undefined,
    })
  }

  return {
    ok: true,
    cacheVersion: STUB_CACHE_VERSION,
  }
}

/**
 * 讀目前 IDB 內記錄的 cacheVersion
 *
 * 用途：下次登入時比對 server 端 latest version、決定要不要走增量同步補丁。
 *
 * Stub：永遠回 null（沒寫過）。
 *
 * D+1 實作：
 *   const entry = await get_cache<string>(CACHE_VERSION_KEY)
 *   return entry?.data ?? null
 */
export async function getCacheVersion(): Promise<string | null> {
  return null
}
