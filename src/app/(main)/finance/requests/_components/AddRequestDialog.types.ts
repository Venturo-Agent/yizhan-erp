import { PaymentItemCategory } from '@/stores/types'
import { type DialogLevel } from '@/components/ui/dialog'
import { PaymentRequest } from '@/stores/types'

// ─────────────────────────────────────────────────────────────────────────────
// Labels
// ─────────────────────────────────────────────────────────────────────────────

export const COMPONENT_LABELS = {
  ALERT_SAVE_SUCCESS: '儲存成功',
  ALERT_SAVE_FAILED: '儲存失敗，請稍後再試',
  CONFIRM_LEAVE_DIRTY: '有未儲存的修改，確定要離開嗎？',
  CONFIRM_LEAVE_TITLE: '未儲存的修改',
  ALERT_NEED_CATEGORY: '請選擇類別',
  ALERT_NEED_COMPANY_ITEM: '請至少新增一個請款項目（含費用類型 + 金額）',
  ALERT_SPLIT_PREFIX: '已依日期自動拆分為 ',
  ALERT_SPLIT_SUFFIX: ' 張請款單',
  REQUEST_PREFIX: '請款單 ',
  SAME_BATCH: '同批次請款單',
  COL_ORDER: '訂單',
  COL_PAY_METHOD: '付款方式',
  COL_DATE_LABEL: '請款日期',
  PLACEHOLDER_PICK_TOUR_FIRST: '先選團',
  PLACEHOLDER_ORDER_OPT: '選擇訂單（選填）',
  PLACEHOLDER_CATEGORY: '類別',
  PLACEHOLDER_SUPPLIER_OPT: '供應商（選填）',
  PLACEHOLDER_PAY_METHOD: '付款方式',
  TOUR_LABEL: '團號',
  ORDER_LABEL: '訂單',
  CATEGORY_HINT: '類別 / 供應商 / 付款方式為整批共用、任一 row 改動會套用到所有 row。',
  DELETE: '刪除',
  SAVING: '儲存中...',
  SAVE: '儲存',
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Category config
// ─────────────────────────────────────────────────────────────────────────────

export const CATEGORY_CONFIG: Record<string, { icon: string; color: string }> = {
  住宿: { icon: '🏨', color: 'text-status-info' },
  accommodation: { icon: '🏨', color: 'text-status-info' },
  交通: { icon: '🚌', color: 'text-status-success' },
  transportation: { icon: '🚌', color: 'text-status-success' },
  活動: { icon: '🎫', color: 'text-morandi-secondary' },
  ticket: { icon: '🎫', color: 'text-morandi-secondary' },
  activity: { icon: '🎫', color: 'text-morandi-secondary' },
  餐食: { icon: '🍽️', color: 'text-status-warning' },
  meal: { icon: '🍽️', color: 'text-status-warning' },
  其他: { icon: '📦', color: 'text-morandi-secondary' },
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** 批量請款的團分配 */
export interface TourAllocation {
  tour_id: string
  tour_code: string
  tour_name: string
  order_id?: string
  order_number?: string
  allocated_amount: number
}

export type RequestMode = 'tour' | 'batch' | 'company'

export interface AddRequestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  /** 預設團 ID（從快速請款按鈕傳入） */
  defaultTourId?: string
  /** 預設訂單 ID（從快速請款按鈕傳入） */
  defaultOrderId?: string
  /** 編輯模式：傳入既有請款單 */
  editingRequest?: PaymentRequest | null
  /** 只讀模式：隱藏編輯/刪除按鈕 */
  readOnly?: boolean
  /** Dialog 巢狀層級（預設 1；嵌進其他 level=1 dialog 時要設 2）*/
  level?: DialogLevel
}

// 重新導出以簡化 import（PaymentItemCategory 在多處用到）
export type { PaymentItemCategory }
