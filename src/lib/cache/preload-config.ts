/**
 * Preload Config — 首次登入預載清單 SSOT
 *
 * 配 ADR-0005 / refactor-backlog #2（cache + 資料層架構）
 *
 * Shape-based 預載清單（抄 ElectricSQL 的 shape 概念）：
 *   - 用戶登入後一次撈完所有不太變的主檔（regions / countries / roles ...）
 *   - 塞進 IndexedDB（L2 cache）
 *   - 之後 ERP 任何下拉選單瞬秒
 *
 * 分類：
 *   - 公共主檔（無 filter）：ref_countries / ref_cities → 跨 workspace 共用
 *   - 全域 RLS 主檔（無 filter）：roles / role_capabilities / company_settings
 *   - workspace 主檔（filter='workspace'）：suppliers / attractions / restaurants / hotels / tour_templates
 *
 * D+1 接通時、preload-runner 會把 filter='workspace' 的 shape 自動套
 * enforceWorkspaceScope({ workspaceId })。
 */

// ============================================
// Types
// ============================================

/**
 * 單一預載 shape 定義
 *
 * @property table        Postgres 表名 / view 名
 * @property select       PostgREST select 字串、限定欄位避免 .select('*') 黑魔法
 * @property filter       'workspace' = 自動套 enforceWorkspaceScope；undefined = 跨 workspace 公共主檔
 * @property staleAfter   IDB 內這份資料的 TTL window；過了 → preload-runner 會重抓
 */
export interface PreloadShape {
  table: string
  select: string
  /**
   * 'workspace' = caller 在 runner 內必填 workspaceId、自動套 .eq('workspace_id', ws)
   *
   * 之後可擴：'employee' / 'role' 之類更細的 scope，但 D-day 先這兩種。
   */
  filter?: 'workspace'
  staleAfter: StaleAfter
}

/**
 * Stale window 列舉、字面量限定避免亂寫
 *
 * - '6h'  ：業務面主檔（suppliers / attractions / hotels / restaurants）每天會變一點
 * - '1d'  ：HR / 公司層設定（roles / role_capabilities / company_settings / tour_templates）
 * - '7d'  ：地理層級主檔（cities）
 * - '30d' ：國家代碼之類幾乎不變的東西
 */
export type StaleAfter = '6h' | '1d' | '7d' | '30d'

// ============================================
// Constants
// ============================================

/**
 * Stale window → 毫秒對照表
 *
 * 內部用、export 出去主要給 preload-runner 跟 test 引用。
 */
export const STALE_AFTER_MS: Record<StaleAfter, number> = {
  '6h': 6 * 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
}

// ============================================
// SSOT: 預載清單
// ============================================

/**
 * 首次登入要預載的 shape 清單
 *
 * 改這份 = 改 preload 行為、所有 caller（PreloadGate / preload-runner）跟著走。
 *
 * 規則：
 *   1. 列表 = Frequency × Shape × Stale tier
 *   2. 每加一條前先評估「這真的不太變嗎」、變動頻繁的不該進來
 *   3. select 字串避免 '*'、明確列欄位（除 company_settings 整包就那麼幾欄）
 *   4. workspace 隔離 → filter: 'workspace'、其他 = 公共
 */
export const PRELOAD_SHAPES: PreloadShape[] = [
  // --- 公共主檔（跨 workspace、不需 filter）---
  {
    table: 'ref_countries',
    select: 'code, name, sub_region',
    staleAfter: '30d',
  },
  {
    table: 'ref_cities',
    select: 'id, name, country_code',
    staleAfter: '7d',
  },

  // --- 全域 HR / 設定主檔（RLS 自動 scope、不需明加 filter）---
  {
    table: 'roles',
    select: 'id, name, capabilities',
    staleAfter: '1d',
  },
  {
    table: 'role_capabilities',
    select: 'role_id, capability_code, granted',
    staleAfter: '1d',
  },
  {
    table: 'company_settings',
    select: '*',
    staleAfter: '1d',
  },

  // --- Workspace 主檔（caller 必填 workspaceId）---
  {
    table: 'suppliers',
    select: 'id, name, type, contact',
    filter: 'workspace',
    staleAfter: '6h',
  },
  {
    table: 'attractions',
    select: 'id, name, region_id, photo_url',
    filter: 'workspace',
    staleAfter: '6h',
  },
  {
    table: 'restaurants',
    select: 'id, name, region_id',
    filter: 'workspace',
    staleAfter: '6h',
  },
  {
    table: 'hotels',
    select: 'id, name, region_id',
    filter: 'workspace',
    staleAfter: '6h',
  },
  {
    table: 'tour_templates',
    select: 'id, name, region_id, days',
    filter: 'workspace',
    staleAfter: '1d',
  },
]

// ============================================
// Helpers
// ============================================

/**
 * 把 staleAfter 字面量轉成毫秒
 *
 * 用例：
 *   const ms = staleAfterToMs('6h')  // 21_600_000
 *   if (Date.now() - cached.timestamp > ms) refresh()
 */
export function staleAfterToMs(s: StaleAfter): number {
  return STALE_AFTER_MS[s]
}

/**
 * 算 IDB 寫入時要用的 cache key
 *
 * 命名約定：`preload:<workspace|public>:<table>`
 *   - 公共 shape → `preload:public:ref_countries`
 *   - workspace shape → `preload:ws_<workspaceId>:suppliers`
 *
 * 這樣 invalidate_cache_pattern('preload:ws_xxx:') 可一鍵清掉某 workspace 的所有 preload。
 */
export function buildPreloadCacheKey(shape: PreloadShape, ctx: { workspaceId?: string }): string {
  if (shape.filter === 'workspace') {
    if (!ctx.workspaceId) {
      throw new Error(`[preload-config] shape "${shape.table}" 需 workspaceId、但 ctx 沒給`)
    }
    return `preload:ws_${ctx.workspaceId}:${shape.table}`
  }
  return `preload:public:${shape.table}`
}
