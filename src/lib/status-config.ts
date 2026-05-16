/**
 * 統一的狀態配置系統
 * 集中管理所有狀態的顏色、標籤和圖示
 *
 * 此檔為向後相容 re-export 層。
 * 實際定義見 @/lib/status/（按業務領域分檔）：
 * - financial.ts: payment / disbursement / invoice / voucher / receipt / quote
 * - tour.ts: tour / order / tour_request / todo / esim
 * - types.ts: StatusConfig / StatusType 型別
 */

export type { StatusConfig, StatusType } from './status/types'

export {
  STATUS_CONFIGS,
  getStatusConfig,
  getStatusColor,
  getStatusLabel,
  getStatusIcon,
  getStatusBgColor,
  getStatusBorderColor,
  getStatusOptions,
} from './status/index'
