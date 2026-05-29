/**
 * 狀態配置系統 - Barrel Export（全站 status SSOT 入口）
 *
 * 所有狀態從此引入：
 * - financial.ts: payment / disbursement / invoice / voucher / receipt / quote 的 StatusConfig
 * - tour.ts: tour / order / tour_request / todo / esim 的 StatusConfig
 * - labels.ts: 全 type label SSOT（STATUS_LABEL_MAP + getStatusLabelFor）
 * - tone.ts: 全 type tone SSOT（STATUS_TONE_MAP + getStatusTone）
 * - types.ts: StatusConfig 型別
 *
 * 2026-05-29 B7：收斂 3 套 SSOT（status/ + lib/constants/status-maps + lib/design/status-tone-map）
 * 統一到 lib/status/、消除文案漂移風險。
 */

export type { StatusConfig } from './types'
export type { StatusType } from './labels'

export {
  paymentStatuses,
  disbursementStatuses,
  invoiceStatuses,
  voucherStatuses,
  receiptStatuses,
  quoteStatuses,
} from './financial'

export {
  tourStatuses,
  orderStatuses,
  tourRequestStatuses,
  todoStatuses,
  esimStatuses,
} from './tour'

export { STATUS_LABEL_MAP, getStatusLabelFor } from './labels'
export { STATUS_TONE_MAP, getStatusTone } from './tone'

import type { StatusConfig } from './types'
import type { StatusType } from './labels'
import {
  paymentStatuses,
  disbursementStatuses,
  invoiceStatuses,
  voucherStatuses,
  receiptStatuses,
  quoteStatuses,
} from './financial'
import {
  tourStatuses,
  orderStatuses,
  tourRequestStatuses,
  todoStatuses,
  esimStatuses,
} from './tour'
import { getStatusLabelFor } from './labels'

/**
 * 核心 11 個 type 的 StatusConfig（含 icon / bgColor / borderColor / color）
 *
 * 額外 type（payment_request / check / employee / contract / ai_agent /
 * invoice_batch / itinerary / kb_sailing / workspace_billing / generic）
 * 只走 label + tone、走 getStatusLabelFor + getStatusTone
 */
type CoreStatusType =
  | 'payment'
  | 'disbursement'
  | 'invoice'
  | 'voucher'
  | 'receipt'
  | 'quote'
  | 'tour'
  | 'order'
  | 'tour_request'
  | 'todo'
  | 'esim'

export const STATUS_CONFIGS: Record<CoreStatusType, Record<string, StatusConfig>> = {
  payment: paymentStatuses,
  disbursement: disbursementStatuses,
  invoice: invoiceStatuses,
  voucher: voucherStatuses,
  receipt: receiptStatuses,
  quote: quoteStatuses,
  tour: tourStatuses,
  order: orderStatuses,
  tour_request: tourRequestStatuses,
  todo: todoStatuses,
  esim: esimStatuses,
}

/**
 * 獲取狀態配置
 */
export function getStatusConfig(type: CoreStatusType, status: string): StatusConfig {
  const typeConfig = STATUS_CONFIGS[type]
  if (!typeConfig) {
    return STATUS_CONFIGS.payment.default
  }
  return typeConfig[status] || typeConfig.default || STATUS_CONFIGS.payment.default
}

/**
 * 獲取狀態顏色
 */
export function getStatusColor(type: CoreStatusType, status: string): string {
  return getStatusConfig(type, status).color
}

/**
 * 獲取狀態標籤
 *
 * 委派至 STATUS_LABEL_MAP（全 type label SSOT）、保持 status-cells.tsx 既有 API 相容
 */
export function getStatusLabel(type: StatusType, status: string): string {
  return getStatusLabelFor(type, status)
}

/**
 * 獲取狀態圖示
 */
export function getStatusIcon(
  type: CoreStatusType,
  status: string
): import('lucide-react').LucideIcon | undefined {
  return getStatusConfig(type, status).icon
}

/**
 * 獲取狀態背景色
 */
export function getStatusBgColor(type: CoreStatusType, status: string): string | undefined {
  return getStatusConfig(type, status).bgColor
}

/**
 * 獲取狀態邊框色
 */
export function getStatusBorderColor(type: CoreStatusType, status: string): string | undefined {
  return getStatusConfig(type, status).borderColor
}

/**
 * 獲取所有狀態選項（用於下拉選單）
 */
export function getStatusOptions(type: CoreStatusType): Array<{ value: string; label: string }> {
  const typeConfig = STATUS_CONFIGS[type]
  if (!typeConfig) return []

  return Object.entries(typeConfig)
    .filter(([key]) => key !== 'default')
    .map(([value, config]) => ({
      value,
      label: config.label,
    }))
}
