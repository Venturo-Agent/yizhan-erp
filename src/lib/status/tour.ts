/**
 * 行程 / 訂單 / 需求單 相關狀態配置
 * 涵蓋：tour（團體）、order（訂單）、tour_request（需求單）、
 *        todo（待辦）、esim（eSIM 網卡）
 */

import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileCheck,
  FileText,
  Package,
  Truck,
} from 'lucide-react'
import type { StatusConfig } from './types'

// 團體狀態（key = DB 英文值、label = UI 中文顯示）
export const tourStatuses: Record<string, StatusConfig> = {
  template: {
    color: 'text-morandi-muted',
    label: '模板',
    icon: FileText,
    bgColor: 'bg-morandi-container',
    borderColor: 'border-morandi-muted/30',
  },
  proposal: {
    color: 'text-morandi-secondary',
    label: '提案',
    icon: FileText,
    bgColor: 'bg-morandi-secondary/15',
    borderColor: 'border-morandi-gold/30',
  },
  upcoming: {
    color: 'text-morandi-green',
    label: '待出發',
    icon: Truck,
    bgColor: 'bg-morandi-green/15',
    borderColor: 'border-morandi-green/30',
  },
  ongoing: {
    color: 'text-morandi-green',
    label: '進行中',
    icon: Truck,
    bgColor: 'bg-morandi-green/15',
    borderColor: 'border-morandi-green',
  },
  returned: {
    color: 'text-morandi-red',
    label: '未結團',
    icon: Clock,
    bgColor: 'bg-morandi-red/15',
    borderColor: 'border-morandi-red/30',
  },
  closed: {
    color: 'text-morandi-secondary',
    label: '已結團',
    icon: FileCheck,
    bgColor: 'bg-morandi-container',
    borderColor: 'border-morandi-muted/30',
  },
  default: {
    color: 'text-morandi-secondary',
    label: '未知',
    icon: AlertCircle,
    bgColor: 'bg-morandi-container',
    borderColor: 'border-morandi-muted/30',
  },
}

// 訂單狀態（注意：訂單主要使用 payment_status，此為 order.status）
export const orderStatuses: Record<string, StatusConfig> = {
  pending: {
    color: 'text-morandi-secondary',
    label: '待確認',
    icon: Clock,
    bgColor: 'bg-morandi-secondary/15',
  },
  confirmed: {
    color: 'text-morandi-primary',
    label: '已確認',
    icon: CheckCircle,
    bgColor: 'bg-morandi-primary/15',
  },
  completed: {
    color: 'text-morandi-green',
    label: '已完成',
    icon: FileCheck,
    bgColor: 'bg-morandi-green/15',
  },
  cancelled: {
    color: 'text-morandi-red',
    label: '已取消',
    icon: XCircle,
    bgColor: 'bg-morandi-red/15',
  },
  default: {
    color: 'text-morandi-secondary',
    label: '未知',
    icon: AlertCircle,
  },
}

// 需求單狀態
export const tourRequestStatuses: Record<string, StatusConfig> = {
  pending: {
    color: 'text-morandi-secondary',
    label: '待處理',
    icon: Clock,
    bgColor: 'bg-morandi-secondary/15',
  },
  draft: {
    color: 'text-morandi-muted',
    label: '草稿',
    icon: Package,
    bgColor: 'bg-morandi-container',
  },
  in_progress: {
    color: 'text-morandi-primary',
    label: '處理中',
    icon: Package,
    bgColor: 'bg-morandi-primary/15',
  },
  replied: {
    color: 'text-status-info',
    label: '已回復',
    icon: FileText,
    bgColor: 'bg-status-info/15',
  },
  confirmed: {
    color: 'text-morandi-green',
    label: '已確認',
    icon: CheckCircle,
    bgColor: 'bg-morandi-green/15',
  },
  completed: {
    color: 'text-morandi-primary',
    label: '已完成',
    icon: FileCheck,
    bgColor: 'bg-morandi-primary/15',
  },
  cancelled: {
    color: 'text-morandi-red',
    label: '已取消',
    icon: XCircle,
    bgColor: 'bg-morandi-red/15',
  },
  default: {
    color: 'text-morandi-secondary',
    label: '未知',
    icon: AlertCircle,
  },
}

// 待辦事項狀態
export const todoStatuses: Record<string, StatusConfig> = {
  pending: {
    color: 'text-morandi-secondary',
    label: '待處理',
    icon: Clock,
    bgColor: 'bg-morandi-secondary/15',
  },
  in_progress: {
    color: 'text-morandi-primary',
    label: '待出發',
    icon: Package,
    bgColor: 'bg-morandi-primary/15',
  },
  completed: {
    color: 'text-morandi-green',
    label: '已完成',
    icon: CheckCircle,
    bgColor: 'bg-morandi-green/15',
  },
  cancelled: {
    color: 'text-morandi-secondary',
    label: '已取消',
    icon: XCircle,
    bgColor: 'bg-morandi-secondary/15',
  },
  default: {
    color: 'text-morandi-secondary',
    label: '未知',
    icon: AlertCircle,
  },
}

// eSIM 網卡狀態
export const esimStatuses: Record<string, StatusConfig> = {
  0: {
    color: 'text-morandi-secondary',
    label: '待確認',
    icon: Clock,
    bgColor: 'bg-morandi-secondary/15',
  },
  1: {
    color: 'text-morandi-green',
    label: '已確認',
    icon: CheckCircle,
    bgColor: 'bg-morandi-green/15',
  },
  2: {
    color: 'text-morandi-red',
    label: '錯誤',
    icon: XCircle,
    bgColor: 'bg-morandi-red/15',
  },
  default: {
    color: 'text-morandi-secondary',
    label: '未知',
    icon: AlertCircle,
  },
}
