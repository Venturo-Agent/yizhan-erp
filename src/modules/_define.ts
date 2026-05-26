/**
 * Module Single Source of Truth — defineModule helper
 *
 * 哲學：一個 module 一個檔、5 SSOT 從此衍生（features / module-tabs / capabilities / sidebar / seed）
 *
 * 解決：5/12 channels 踩過「做了 4 個 SSOT、漏 module-tabs.ts、HR /hr/roles 看不到」
 * 同類問題（5/13 audit 跑出 100 條 capability 散刻字串、3 個 SSOT 檔 drift）
 *
 * 跟 RLS helper procedure 同一個哲學：抽象掉重複、未來新 module 一個檔搞定。
 *
 * 用法：
 * ```ts
 * // src/modules/tours.ts
 * import { defineModule } from './_define'
 *
 * export const ToursModule = defineModule({
 *   code: 'tours',
 *   name: '旅遊團管理',
 *   category: 'basic',
 *   routes: ['/tours', '/tours/[code]'],
 *   tabs: [
 *     { code: 'overview', name: '總覽' },
 *     { code: 'itinerary', name: '行程' },
 *   ],
 *   exposedToHr: true,
 *   defaultRoles: ['admin', 'sales'],
 * })
 * ```
 *
 * Phase（漸進 migration）：
 * 1. ✅ Phase 1（5/13 本次）：modules/ 目錄立起來、13 個 module 寫完、audit:rls 切換從這裡看
 * 2. ⏸ Phase 2（下次）：codegen 同步 features.ts / module-tabs.ts / capabilities.ts
 * 3. ⏸ Phase 3（之後）：caller 改用 modules 直接 import、廢棄 3 個 SSOT 檔
 */

/**
 * 一個 tab（module 內的 sub-permission unit）
 *
 * tab 自動衍生 capability codes：
 *   `{module}.{tab}.read` + `{module}.{tab}.write`
 */
export interface ModuleTabConfig {
  code: string
  name: string
  description?: string
  /**
   * tab 層級功能分類（workspace 層級開關用）
   * - 'basic' / undefined：預設開
   * - 'premium'：預設關、付費後開
   * workspace_features 用 `{module}.{tab}` 格式存
   */
  category?: 'basic' | 'premium'
  /**
   * tab 衍生的 capability action 清單、預設 ['read', 'write']
   * 例：純讀 tab = ['read']
   */
  capabilities?: readonly ('read' | 'write')[]
  /**
   * 是否在 HR /hr/roles UI 隱藏此 tab（不影響 capability 衍生、不影響 seed）
   * 用途：tab 屬於「個人空間 / 標配」、不該讓 HR admin 配置、但 capability 仍要存在
   * 例：settings.personal tab 隱藏在 HR、但 settings.personal.{read,write} capability
   *     仍會被 seed 強制給所有 role
   */
  hiddenInHr?: boolean
}

/**
 * 一個 module（feature + capability + sidebar + route 的整合單位）
 */
export interface ModuleConfig {
  /** module 唯一識別碼（snake_case、跟 feature_code 對齊） */
  code: string
  /** 顯示名稱（中文業務語言） */
  name: string
  /** 說明（一句話） */
  description?: string
  /**
   * 租戶等級
   * - basic：月費基本含
   * - premium：付費加購（同月費 + 加價）
   * - enterprise：限漫途使用、跨 workspace 能力
   * - addon：附加服務（資料訂閱、AI 知識庫等可單獨販售的加值包、跟月費 module 分開）
   */
  category: 'basic' | 'premium' | 'enterprise' | 'addon'
  /** 路由清單（對應 src/app/(main)/<route>/page.tsx） */
  routes: readonly string[]
  /** Sub-permission tabs（HR /hr/roles 列出可勾項目） */
  tabs: readonly ModuleTabConfig[]
  /**
   * 是否暴露給租戶 HR 管權限（HR /hr/roles 列出此 module）
   * - true（預設）：列在 HR UI、admin 可勾權限給員工
   * - false：漫途專用 / 個人空間 / 不需 HR 控管
   *   例：dashboard / workspaces / shared_data_management / platform_integrations
   */
  exposedToHr?: boolean
  /**
   * seed migration 預設給哪些 role 開通
   * 例：['admin', 'manager']
   * 空陣列 / 不寫 = 不自動 seed、admin 手動勾
   */
  defaultRoles?: readonly string[]
  /**
   * Module 層級的 capability action（不分 tab 的整體權限）
   * 預設：tab 為空時 ['read', 'write']、tab 非空時 [](走 tab 細顆粒)
   * 自訂：明確列出 module-level action
   * 例：channels 有 read / write / manage、tours 有 read / write
   */
  moduleLevelCapabilities?: readonly string[]
  /**
   * 子功能 feature gate（不是 capability、是租戶層級「有沒有買這個 sub-feature」）
   *
   * 用途：module 整體開了、但內部某子能力可單獨計費（如 channels 內 HAPPY 機器人）
   * code 格式：`{module}.{sub}`、會衍生到 features.ts、workspace_features 表用
   *
   * 例：channels module 開了、但 channels.happy（HAPPY 機器人頻道）要付費加購
   */
  subFeatures?: readonly {
    code: string
    name: string
    description?: string
    category: 'basic' | 'premium' | 'enterprise' | 'addon'
  }[]
}

/**
 * 定義一個 module、保留 const 推斷
 *
 * 用 generic + identity 函數確保 TS 能推斷出最 narrow 的 type、
 * 衍生時 `module.tabs[N].code` 仍是 literal string union、不是 string。
 */
export function defineModule<const T extends ModuleConfig>(config: T): T {
  return config
}

// ─────────────────────────────────────────────────────────────────────────────
// 衍生函數（給 audit / future codegen 用）

/**
 * 從 module 衍生所有 capability codes
 *
 * 規則：
 * 1. tab 非空 → 每個 tab 衍生 `{module}.{tab}.{action}`（一般 tab：`.read` + `.write`）
 * 2. tab 為空 → module-level 衍生 `{module}.read` + `{module}.write`
 * 3. moduleLevelCapabilities 明確指定 → 用指定的
 */
export function deriveCapabilityCodes(m: ModuleConfig): string[] {
  const codes: string[] = []

  // Module-level capabilities
  const moduleActions =
    m.moduleLevelCapabilities ?? (m.tabs.length === 0 ? (['read', 'write'] as const) : [])
  for (const action of moduleActions) {
    codes.push(`${m.code}.${action}`)
  }

  // Tab-level capabilities
  for (const tab of m.tabs) {
    const actions = tab.capabilities ?? (['read', 'write'] as const)
    for (const action of actions) {
      codes.push(`${m.code}.${tab.code}.${action}`)
    }
  }

  return codes
}

/**
 * 從 module 衍生 feature definition（給 features.ts 用）
 */
export function deriveFeature(m: ModuleConfig) {
  return {
    code: m.code,
    name: m.name,
    description: m.description ?? '',
    category: m.category,
    routes: [...m.routes],
  }
}

/**
 * 從 module 衍生 module-tabs definition（給 module-tabs.ts 用、HR /hr/roles UI）
 * 只 export exposedToHr !== false 的 module
 * 過濾 hiddenInHr=true 的 tab（個人空間 / 標配、不該讓 HR admin 配置）
 */
export function deriveModuleTabsEntry(m: ModuleConfig) {
  return {
    code: m.code,
    name: m.name,
    description: m.description,
    tabs: m.tabs
      .filter(t => t.hiddenInHr !== true)
      .map(t => ({
        code: t.code,
        name: t.name,
        description: t.description,
        category: t.category,
      })),
  }
}
