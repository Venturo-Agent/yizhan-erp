/**
 * 狀態配置共用型別
 */

import type { LucideIcon } from 'lucide-react'

/**
 * 狀態配置介面
 */
export interface StatusConfig {
  color: string
  label: string
  icon?: LucideIcon
  bgColor?: string
  borderColor?: string
}

/**
 * 狀態配置類型
 */
export type StatusType =
  | 'payment'
  | 'disbursement'
  | 'todo'
  | 'invoice'
  | 'tour'
  | 'order'
  | 'esim'
  | 'voucher'
  | 'receipt'
  | 'quote'
  | 'tour_request'
