/**
 * data/hooks 子層說明（2026-05-29 B11 邊界釐清）
 *
 * 本目錄的 hook **是紅線 F 的合理例外**：
 *   - 主資料路徑：data/entities/* via createEntityHook（直接 query 業務實體表）
 *   - 例外路徑（本目錄）：REST endpoint 或聚合視圖、createEntityHook 不適用：
 *       * REST endpoint 包裝（useRoles / useBranches / usePaymentMethodsCached
 *         / useMessagingConversations / usePaymentProviders）
 *       * RPC / 跨表彙總（useCountryUsage、走 lib/swr/createReportHook 風格）
 *       * 共享 ref 表的客製 transform（useCountryAirports）
 *
 * 所有 hook 都必須：
 *   - 用 @/data/hooks 統一 barrel 暴露（本檔）
 *   - 不在頁面 / component 散刻 useSWR
 *   - 切 workspace 自動隔離（cache key 帶 workspace_id）
 */

export { usePaymentMethodsCached } from './usePaymentMethods'
export { useRoles, type Role, type RoleReadScope } from './useRoles'
export { useBranches, type Branch } from './useBranches'

// 2026-05-29 B11 補：原本被頁面散 import / 散刻、現一律走 barrel
export { useMessagingConversations, CONVERSATIONS_URL } from './useMessagingConversations'
export type { ConversationItem, ChannelType } from './useMessagingConversations'
export { usePaymentProviders } from './usePaymentProviders'
export { useCountryAirports } from './useCountryAirports'
export { useCountryUsage } from './useCountryUsage'
