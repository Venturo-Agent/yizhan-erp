/**
 * 財務相關狀態配置
 * 涵蓋：payment（付款）、disbursement（出納）、invoice（發票）、
 *        voucher（會計傳票）、receipt（收據）、quote（報價單）
 */

import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileCheck,
  FileText,
  DollarSign,
  Truck,
} from 'lucide-react'
import type { StatusConfig } from './types'

// 付款 / 請款狀態（payment_requests.status）
// William 2026-05-21 拍板的 3 階段：
//   pending → 未付款（剛建立、會計尚未處理）
//   confirmed → 待付款（已勾入出納單、等出帳）
//   paid → 已付款（出納單完整出帳完）
export const paymentStatuses: Record<string, StatusConfig> = {
  pending: {
    color: 'text-morandi-secondary',
    label: '未付款',
    icon: Clock,
    bgColor: 'bg-morandi-secondary/15',
    borderColor: 'border-morandi-gold',
  },
  confirmed: {
    color: 'text-morandi-gold',
    label: '待付款',
    icon: FileCheck,
    bgColor: 'bg-morandi-gold/15',
    borderColor: 'border-morandi-gold',
  },
  paid: {
    color: 'text-morandi-green',
    label: '已付款',
    icon: CheckCircle,
    bgColor: 'bg-morandi-green/15',
    borderColor: 'border-morandi-green',
  },
  cancelled: {
    color: 'text-morandi-red',
    label: '已取消',
    icon: XCircle,
    bgColor: 'bg-morandi-red/15',
    borderColor: 'border-morandi-red',
  },
  default: {
    color: 'text-morandi-secondary',
    label: '未知狀態',
    icon: AlertCircle,
  },
}

// 出納單狀態（實際使用：pending → confirmed → paid）
export const disbursementStatuses: Record<string, StatusConfig> = {
  pending: {
    color: 'text-morandi-secondary',
    label: '待確認',
    icon: Clock,
    bgColor: 'bg-morandi-secondary/15',
  },
  confirmed: {
    color: 'text-morandi-green',
    label: '已確認',
    icon: CheckCircle,
    bgColor: 'bg-morandi-green/15',
  },
  paid: {
    color: 'text-morandi-primary',
    label: '已付款',
    icon: DollarSign,
    bgColor: 'bg-morandi-primary/15',
  },
  default: {
    color: 'text-morandi-secondary',
    label: '未知',
    icon: AlertCircle,
  },
}

// 發票狀態（含代轉發票）
export const invoiceStatuses: Record<string, StatusConfig> = {
  draft: {
    color: 'text-morandi-secondary',
    label: '草稿',
    icon: FileText,
    bgColor: 'bg-morandi-secondary/15',
  },
  pending: {
    color: 'text-morandi-secondary',
    label: '待處理',
    icon: Clock,
    bgColor: 'bg-morandi-secondary/15',
  },
  scheduled: {
    color: 'text-status-info',
    label: '預約中',
    icon: Clock,
    bgColor: 'bg-status-info/15',
  },
  issued: {
    color: 'text-morandi-green',
    label: '已開立',
    icon: CheckCircle,
    bgColor: 'bg-morandi-green/15',
  },
  voided: {
    color: 'text-morandi-red',
    label: '已作廢',
    icon: XCircle,
    bgColor: 'bg-morandi-red/15',
  },
  allowance: {
    color: 'text-status-info',
    label: '已折讓',
    icon: FileText,
    bgColor: 'bg-status-info/15',
  },
  failed: {
    color: 'text-morandi-red',
    label: '失敗',
    icon: AlertCircle,
    bgColor: 'bg-morandi-red/15',
  },
  approved: {
    color: 'text-morandi-green',
    label: '已核准',
    icon: CheckCircle,
    bgColor: 'bg-morandi-green/15',
  },
  paid: {
    color: 'text-morandi-primary',
    label: '已付款',
    icon: DollarSign,
    bgColor: 'bg-morandi-primary/15',
  },
  rejected: {
    color: 'text-morandi-red',
    label: '已駁回',
    icon: XCircle,
    bgColor: 'bg-morandi-red/15',
  },
  default: {
    color: 'text-morandi-secondary',
    label: '未知',
    icon: AlertCircle,
  },
}

// 會計傳票狀態
export const voucherStatuses: Record<string, StatusConfig> = {
  draft: {
    color: 'text-morandi-secondary',
    label: '草稿',
    icon: FileText,
    bgColor: 'bg-morandi-secondary/15',
    borderColor: 'border-morandi-gold',
  },
  posted: {
    color: 'text-morandi-green',
    label: '已過帳',
    icon: CheckCircle,
    bgColor: 'bg-morandi-green/15',
    borderColor: 'border-morandi-green',
  },
  reversed: {
    color: 'text-morandi-red',
    label: '已沖銷',
    icon: XCircle,
    bgColor: 'bg-morandi-red/15',
    borderColor: 'border-morandi-red',
  },
  locked: {
    color: 'text-morandi-primary',
    label: '已鎖定',
    icon: FileCheck,
    bgColor: 'bg-morandi-primary/15',
    borderColor: 'border-morandi-primary',
  },
  default: {
    color: 'text-morandi-secondary',
    label: '未知',
    icon: AlertCircle,
  },
}

// 收據狀態（資料庫存字串 '0'/'1'/'2'）
export const receiptStatuses: Record<string, StatusConfig> = {
  // 數字字串格式（資料庫存的格式）
  // 統一 soft pill 樣式（同 StatusBadge tone）：text-X + bg-X/15
  '0': {
    color: 'text-morandi-secondary',
    label: '待確認',
    icon: Clock,
    bgColor: 'bg-morandi-secondary/15',
  },
  '1': {
    color: 'text-morandi-green',
    label: '已確認',
    icon: CheckCircle,
    bgColor: 'bg-morandi-green/15',
  },
  '2': {
    color: 'text-morandi-red',
    label: '異常',
    icon: XCircle,
    bgColor: 'bg-morandi-red/15',
  },
  // 英文格式（相容舊程式碼）
  pending: {
    color: 'text-morandi-secondary',
    label: '待確認',
    icon: Clock,
    bgColor: 'bg-morandi-secondary/15',
  },
  // 5/15 William 拍板：客戶自助付款的「待對帳」跟 pending 對齊、同字眼同樣式
  pending_verify: {
    color: 'text-morandi-secondary',
    label: '待確認',
    icon: Clock,
    bgColor: 'bg-morandi-secondary/15',
  },
  confirmed: {
    color: 'text-morandi-green',
    label: '已確認',
    icon: CheckCircle,
    bgColor: 'bg-morandi-green/15',
  },
  rejected: {
    color: 'text-morandi-red',
    label: '已退回',
    icon: XCircle,
    bgColor: 'bg-morandi-red/15',
  },
  refunded: {
    color: 'text-morandi-red',
    label: '已退款',
    icon: XCircle,
    bgColor: 'bg-morandi-red/15',
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

// 報價單狀態（實際使用：draft → proposed → revised/進行中 → approved/rejected → converted）
export const quoteStatuses: Record<string, StatusConfig> = {
  draft: {
    color: 'text-morandi-secondary',
    label: '草稿',
    icon: FileText,
    bgColor: 'bg-morandi-secondary/15',
  },
  proposed: {
    color: 'text-morandi-secondary',
    label: '開團',
    icon: Clock,
    bgColor: 'bg-morandi-secondary/15',
  },
  revised: {
    color: 'text-status-info',
    label: '修改中',
    icon: FileText,
    bgColor: 'bg-status-info/15',
  },
  待出發: {
    color: 'text-status-info',
    label: '待出發',
    icon: Truck,
    bgColor: 'bg-status-info/15',
  },
  approved: {
    color: 'text-morandi-green',
    label: '已核准',
    icon: CheckCircle,
    bgColor: 'bg-morandi-green/15',
  },
  converted: {
    color: 'text-morandi-primary',
    label: '已轉單',
    icon: FileCheck,
    bgColor: 'bg-morandi-primary/15',
  },
  rejected: {
    color: 'text-morandi-red',
    label: '已拒絕',
    icon: XCircle,
    bgColor: 'bg-morandi-red/15',
  },
  default: {
    color: 'text-morandi-secondary',
    label: '未知',
    icon: AlertCircle,
  },
}
