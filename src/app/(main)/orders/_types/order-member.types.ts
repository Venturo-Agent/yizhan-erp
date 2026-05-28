/**
 * 訂單成員相關類型定義
 * 從 OrderMembersExpandable.tsx 拆分出來
 */

import type { Json } from '@/lib/supabase/types'

// ============================================
// 核心類型
// ============================================

export interface OrderMember {
  id: string
  order_id: string
  customer_id?: string | null
  identity?: string | null
  chinese_name?: string | null
  passport_name?: string | null
  passport_name_print?: string | null
  birth_date?: string | null
  age?: number | null
  id_number?: string | null
  gender?: string | null
  passport_number?: string | null
  passport_expiry?: string | null
  special_meal?: string | null
  pnr?: string | null
  ticket_number?: string | null
  ticketing_deadline?: string | null
  flight_cost?: number | null
  hotel_1_name?: string | null
  hotel_1_checkin?: string | null
  hotel_1_checkout?: string | null
  hotel_2_name?: string | null
  hotel_2_checkin?: string | null
  hotel_2_checkout?: string | null
  checked_in?: boolean | null
  checked_in_at?: string | null
  transport_cost?: number | null
  misc_cost?: number | null
  total_payable?: number | null
  deposit_amount?: number | null
  balance_amount?: number | null
  deposit_receipt_no?: string | null
  balance_receipt_no?: string | null
  remarks?: string | null
  cost_price?: number | null
  selling_price?: number | null
  profit?: number | null
  passport_image_url?: string | null
  flight_self_arranged?: boolean | null
  // 關聯的顧客驗證狀態（從 join 查詢取得）
  customer_verification_status?: string | null
  // 團體模式額外欄位
  order_code?: string | null
  // 排序順序
  sort_order?: number | null
  // 自訂費用（jsonb 欄位）
  custom_costs?: Json | null
}

// ============================================
// 護照上傳相關
// ============================================

export interface ProcessedFile {
  file: File
  preview: string
  originalName: string
  isPdf: boolean
}

// ============================================
// 自訂費用欄位
// ============================================

export interface CustomCostField {
  id: string
  name: string
  values: Record<string, string> // memberId -> value
}

// ============================================
// 匯出欄位設定
// ============================================

export interface ExportColumnsConfig {
  identity: boolean
  chinese_name: boolean
  passport_name: boolean
  birth_date: boolean
  gender: boolean
  id_number: boolean
  passport_number: boolean
  passport_expiry: boolean
  special_meal: boolean
  remarks: boolean
  // 金額相關欄位放最後
  total_payable: boolean
  deposit_amount: boolean
  balance: boolean
}

export const DEFAULT_EXPORT_COLUMNS: ExportColumnsConfig = {
  identity: false,
  chinese_name: true,
  passport_name: true,
  birth_date: true,
  gender: true,
  id_number: false,
  passport_number: true,
  passport_expiry: true,
  special_meal: true,
  remarks: false,
  // 金額相關欄位預設關閉
  total_payable: false,
  deposit_amount: false,
  balance: false,
}

// ============================================
// Props 類型
// ============================================

export interface OrderMembersExpandableProps {
  orderId?: string
  tourId: string
  workspaceId: string
  onClose?: () => void
  mode?: 'order' | 'tour'
  /** 是否嵌入在其他組件中（如訂單展開），嵌入時不顯示外框 */
  embedded?: boolean
  /** 強制顯示 PNR 欄位（PNR 配對後自動開啟） */
  forceShowPnr?: boolean
  /** Tour 物件（用於列印功能） */
  tour?: import('@/stores/types').Tour
  /** 控制 PNR 配對 Dialog 顯示狀態（由父組件控制） */
  showPnrMatchDialog?: boolean
  /** PNR 配對 Dialog 狀態變更回調 */
  onPnrMatchDialogChange?: (show: boolean) => void
  /** PNR 配對成功回調 */
  onPnrMatchSuccess?: () => void
  /** 彈窗模式（embedded=false）的頂部標題文字（如「成員管理 訂單號」）；toolbar 用它取代「團員名單」。團詳情 inline 不傳、維持原樣 */
  headerLabel?: string
}

interface _MemberRowProps {
  member: OrderMember
  index: number
  isEditMode: boolean
  showPnrColumn: boolean
  departureDate: string | null
  roomAssignment?: string
  vehicleAssignment?: string
  pnrValue?: string
  customCostFields: CustomCostField[]
  orderCount: number
  onUpdate: (memberId: string, field: keyof OrderMember, value: string | number | null) => void
  onDelete: (memberId: string) => void
  onEdit: (member: OrderMember, mode: 'verify' | 'edit') => void
  onPreview: (member: OrderMember) => void
  onPnrChange: (memberId: string, value: string) => void
  onCustomCostChange: (fieldId: string, memberId: string, value: string) => void
}

interface _MemberEditDialogProps {
  member: OrderMember | null
  isOpen: boolean
  mode: 'verify' | 'edit'
  formData: Partial<OrderMember>
  isSaving: boolean
  onClose: () => void
  onSave: () => void
  onFormChange: (field: keyof OrderMember, value: string | null) => void
}

interface _PassportUploadZoneProps {
  processedFiles: ProcessedFile[]
  isUploading: boolean
  isDragging: boolean
  isProcessing: boolean
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onDragOver: (e: React.DragEvent<HTMLLabelElement>) => void
  onDragLeave: (e: React.DragEvent<HTMLLabelElement>) => void
  onDrop: (e: React.DragEvent<HTMLLabelElement>) => void
  onRemoveFile: (index: number) => void
  onBatchUpload: () => void
}

interface _AddMemberDialogProps {
  isOpen: boolean
  memberCount: number | ''
  onClose: () => void
  onConfirm: () => void
  onCountChange: (count: number | '') => void
}

interface _ExportDialogProps {
  isOpen: boolean
  columns: ExportColumnsConfig
  members: OrderMember[]
  onClose: () => void
  onColumnsChange: (columns: ExportColumnsConfig) => void
  onExport: () => void
}
