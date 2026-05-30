/**
 * 狀態配置共用型別
 *
 * StatusType union 在 labels.ts（label SSOT 的真實 source）
 */

import type { LucideIcon } from 'lucide-react'

/**
 * 狀態配置介面（icon + 色彩 token）
 */
export interface StatusConfig {
  color: string
  label: string
  icon?: LucideIcon
  bgColor?: string
  borderColor?: string
}

// StatusType 改放 labels.ts、為了 type-check 相容、re-export 出來
export type { StatusType } from './labels'
