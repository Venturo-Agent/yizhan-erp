/**
 * 狀態配置系統 - Barrel Export
 *
 * 所有狀態從此引入，各業務領域分檔管理：
 * - financial.ts: payment / disbursement / invoice / voucher / receipt / quote
 * - tour.ts: tour / order / tour_request / todo / esim
 * - types.ts: StatusConfig / StatusType 型別
 */

export type { StatusConfig, StatusType } from './types'

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

import type { StatusType } from './types'
import type { StatusConfig } from './types'
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

/**
 * 所有狀態配置的中央存儲（向後相容 STATUS_CONFIGS）
 */
export const STATUS_CONFIGS: Record<StatusType, Record<string, StatusConfig>> = {
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
export function getStatusConfig(type: StatusType, status: string): StatusConfig {
  const typeConfig = STATUS_CONFIGS[type]
  if (!typeConfig) {
    return STATUS_CONFIGS.payment.default
  }
  return typeConfig[status] || typeConfig.default || STATUS_CONFIGS.payment.default
}

/**
 * 獲取狀態顏色
 */
export function getStatusColor(type: StatusType, status: string): string {
  return getStatusConfig(type, status).color
}

/**
 * 獲取狀態標籤
 */
export function getStatusLabel(type: StatusType, status: string): string {
  return getStatusConfig(type, status).label
}

/**
 * 獲取狀態圖示
 */
export function getStatusIcon(type: StatusType, status: string): import('lucide-react').LucideIcon | undefined {
  return getStatusConfig(type, status).icon
}

/**
 * 獲取狀態背景色
 */
export function getStatusBgColor(type: StatusType, status: string): string | undefined {
  return getStatusConfig(type, status).bgColor
}

/**
 * 獲取狀態邊框色
 */
export function getStatusBorderColor(type: StatusType, status: string): string | undefined {
  return getStatusConfig(type, status).borderColor
}

/**
 * 獲取所有狀態選項（用於下拉選單）
 */
export function getStatusOptions(type: StatusType): Array<{ value: string; label: string }> {
  const typeConfig = STATUS_CONFIGS[type]
  if (!typeConfig) return []

  return Object.entries(typeConfig)
    .filter(([key]) => key !== 'default')
    .map(([value, config]) => ({
      value,
      label: config.label,
    }))
}
