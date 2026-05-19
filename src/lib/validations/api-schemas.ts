/**
 * API Route Zod Schemas
 *
 * 集中管理 API 輸入驗證 schema，確保前後端一致
 */

import { z } from 'zod'

// ==========================================
// 密碼複雜度 schema
// 5/17 William 拍板：原本 SEC-006/SEC-003 要求 12 字 + 字母 + 數字、業務改密碼太煩
// 放寬到至少 6 字（不限字母 / 數字）、Supabase Auth Dashboard 那邊同步調整
// ==========================================

export const passwordComplexitySchema = z
  .string()
  .min(6, '密碼至少需要 6 個字元')
  .max(128, '密碼不能超過 128 個字元')

// ==========================================
// 認證模組
// ==========================================

export const changePasswordSchema = z.object({
  employee_number: z.string().optional(), // 可選，API 會用 session 的 employeeId
  workspace_code: z.string().optional(),
  // 5/17 William 拍板：首次登入（must_change_password=true）不需舊密碼、避免大家輸 12345678 很蠢
  // API 內判斷 must_change_password、true 就 skip 舊密碼驗證
  current_password: z.string().optional(),
  new_password: passwordComplexitySchema,
})

// ==========================================
// 合約
// ==========================================

export const signContractSchema = z.object({
  contractId: z.string().uuid('contractId 必須是 UUID 格式'),
  // 簽名 base64 data URL、最大 ~5MB（避免大檔撐爆 DB）
  signature: z
    .string()
    .min(1, '缺少簽名')
    .max(5 * 1024 * 1024, '簽名圖過大')
    .regex(/^data:image\/(png|jpeg|jpg|svg\+xml);base64,/, '簽名格式錯誤'),
  signerPhone: z.string().max(50).optional(),
  signerAddress: z.string().max(500).optional(),
  signerIdNumber: z.string().max(50).optional(),
})

export const createContractSchema = z.object({
  // 必填：orderId（合約綁訂單）。tour_id 後端從 order.tour_id 推導
  orderId: z.string().uuid('orderId 必須是 UUID 格式'),
  // memberIds optional：不傳 = 自動帶該訂單全部團員
  memberIds: z.array(z.string().uuid()).optional(),
  // 合約類型 optional：不傳 = 後端依 country 自動判斷
  template: z.enum(['domestic', 'international', 'individual_international']).optional(),
  signerType: z.enum(['individual', 'company']).default('individual'),
  signerName: z.string().min(1, '請填寫簽署人姓名').max(100),
  signerIdNumber: z.string().max(50).optional(),
  signerPhone: z.string().max(50).optional(),
  signerAddress: z.string().max(500).optional(),
  companyName: z.string().max(200).optional(),
  companyTaxId: z.string().max(20).optional(),
  companyRepresentative: z.string().max(100).optional(),
  companyAddress: z.string().max(500).optional(),
  emergencyContactName: z.string().max(100).optional(),
  emergencyContactRelation: z.string().max(50).optional(),
  emergencyContactPhone: z.string().max(50).optional(),
  contractData: z.record(z.string(), z.unknown()).optional(),
  createdBy: z.string().uuid().optional(),
  includeMemberList: z.boolean().default(false),
  includeItinerary: z.boolean().default(false),
})

// ==========================================
// 認證模組（擴充）
// ==========================================

export const syncEmployeeSchema = z.object({
  employee_id: z.string().min(1, '缺少員工 ID'),
  user_id: z.string().min(1, '缺少 User ID'),
  workspace_id: z.string().optional(),
  access_token: z.string().optional(),
})

export const resetEmployeePasswordSchema = z.object({
  employee_id: z.string().min(1, '缺少員工 ID'),
  new_password: passwordComplexitySchema,
})

export const validateLoginSchema = z.object({
  email: z.string().min(1, '請填寫 Email').email('Email 格式不正確'),
  password: z.string().min(1, '請填寫密碼'),
  code: z.string().min(1, '請填寫代號'),
})

// ==========================================
// Gemini 圖片生成
// ==========================================

export const generateImageSchema = z.object({
  prompt: z.string().min(1, '請提供 Prompt'),
  style: z.string().optional(),
  aspectRatio: z.string().default('16:9'),
})

// ==========================================
// OCR 批次重處理
// ==========================================

export const batchReprocessSchema = z.object({
  table: z.enum(['all', 'customers', 'order_members']).default('all'),
  limit: z.number().int().positive().max(100).default(10),
})

// ==========================================
// 頻道成員
// ==========================================

export const addChannelMembersSchema = z.object({
  employeeIds: z.array(z.string()).min(1, '至少選擇一位成員'),
  role: z.string().default('member'),
})

export const removeChannelMemberSchema = z.object({
  memberId: z.string().min(1, '缺少成員 ID'),
})

// ==========================================
// Bot 通知
// ==========================================

export const botNotificationRequestSchema = z.object({
  recipient_id: z.string().min(1, '缺少收件人 ID'),
  message: z.string().min(1, '訊息不能為空'),
  type: z.enum(['info', 'warning', 'error']).default('info'),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

// ==========================================
// 行程生成
// ==========================================

export const generateItineraryRequestSchema = z.object({
  cityId: z.string().optional(),
  countryId: z.string().optional(),
  destination: z.string().optional(),
  numDays: z.number().int().min(1).max(30, '天數必須在 1-30 天之間'),
  departureDate: z.string().min(1, '請提供出發日期'),
  outboundFlight: z.object({ arrivalTime: z.string().optional() }).optional(),
  returnFlight: z.object({ departureTime: z.string().optional() }).optional(),
  arrivalTime: z.string().optional(),
  departureTime: z.string().optional(),
  accommodations: z.array(z.unknown()).optional(),
  style: z.string().optional(),
  theme: z.string().optional(),
})

// ==========================================
// AI 景點補充
// ==========================================

export const suggestAttractionSchema = z.object({
  name: z.string().min(1, '請提供景點名稱'),
  city: z.string().optional(),
  country: z.string().optional(),
  category: z.string().optional(),
  existingData: z
    .object({
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      duration_minutes: z.number().optional(),
      ticket_price: z.string().optional(),
      opening_hours: z.string().optional(),
      description: z.string().optional(),
    })
    .optional(),
})

// ==========================================
// AI 圖片編輯
// ==========================================

export const editImageSchema = z.object({
  imageUrl: z.string().min(1, '請提供圖片 URL'),
  action: z.string().optional(),
  customPrompt: z.string().optional(),
})

// ==========================================
// 圖片代理
// ==========================================

export const fetchImageSchema = z.object({
  url: z.string().url('無效的 URL'),
})

// ==========================================
// Bot 開票狀態
// ==========================================

export const ticketStatusPostSchema = z.object({
  workspace_id: z.string().uuid('workspace_id 需為 UUID'),
  channel_id: z.string().optional(),
  notify_sales: z.boolean().default(true),
  days: z.number().int().positive().default(14),
})

export const ticketStatusPatchSchema = z.object({
  workspace_id: z.string().uuid('workspace_id 需為 UUID'),
  member_ids: z.array(z.string()).optional(),
  order_id: z.string().optional(),
  flight_self_arranged: z.boolean(),
})

// ==========================================
// 租戶 / 員工 / 任務
// ==========================================

export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(2).max(20).regex(/^[A-Za-z0-9_-]+$/, 'code 只允許英數 / _ / -'),
  type: z.enum(['travel_agency', 'tour_operator', 'other']).optional(),
  adminName: z.string().min(1).max(50).optional(),
  adminEmail: z.string().email().max(255).optional(),
  adminEmployeeNumber: z.string().min(1).max(20).optional(),
})

export const createEmployeeSchema = z.object({
  // employee_number 由 server 內呼叫 generate_employee_number RPC 配發
  // 不再讓 client 配號（避免 client commit counter 後、server INSERT 失敗造成跳號）
  chinese_name: z.string().min(1).max(50),
  english_name: z.string().max(100).optional().nullable(),
  display_name: z.string().max(50).optional().nullable(),
  // email：強制必填、SSOT、API 直接寫進 auth.users.email + employees.email
  // 規格：[[Logan-Workspace/audit/2026-05-11-員工-email-SSOT.md]]
  email: z.string().email('email 格式錯誤').max(255),
  phone: z.string().max(30).optional().nullable(),
  password: passwordComplexitySchema,
  role_id: z.string().uuid().optional().nullable(),
  status: z.enum(['active', 'inactive', 'on_leave']).optional(),
  hire_date: z.string().optional().nullable(),
  // Phase A 加：scope 欄位（branch）
  branch_id: z.string().uuid().optional().nullable(),
  // 不收受信任欄位（must_change_password / workspace_id / user_id 由 server 強塞）
})

// 分公司 CRUD（對齊既有 schema：name / code / display_order / is_active / is_default / tax_id）
export const createBranchSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().max(50).optional().nullable(),
  display_order: z.number().int().optional(),
  /** 分公司統一編號、8 碼數字、必填（DB CHECK 已建） */
  tax_id: z.string().regex(/^\d{8}$/, '統一編號必須為 8 碼數字'),
})

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']).optional(),
  assignees: z.array(z.string().uuid()).max(20).optional(),
})

// ==========================================
// 財務設定（payment-methods / bank-accounts）
// ==========================================

// POST：新建 payment_method。name/code/type required、其他 optional。
// 跟 UPDATE 對稱、whitelist 嚴格、防 spread attack（William review 2026-05-11 補）
export const createPaymentMethodSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(50),
  type: z.enum(['receipt', 'payment']),
  description: z.string().max(500).optional().nullable(),
  placeholder: z.string().max(200).optional().nullable(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
  debit_account_id: z.string().uuid().optional().nullable(),
  credit_account_id: z.string().uuid().optional().nullable(),
  fee_account_id: z.string().uuid().optional().nullable(),
  fee_percent: z.number().min(0).max(100).optional().nullable(),
  fee_fixed: z.number().min(0).optional().nullable(),
  // 種類 enum（分類用、各 kind 邏輯未來再接）
  kind: z.enum(['wire_transfer', 'card', 'cash', 'check', 'other']).optional().nullable(),
})

export const updatePaymentMethodSchema = z.object({
  id: z.string().uuid(),
  // whitelist：name/code/type/description/placeholder/is_active/sort_order/科目綁定/手續費
  // 拒收 is_system / workspace_id / created_at / id 重複等敏感欄位
  name: z.string().min(1).max(100).optional(),
  code: z.string().min(1).max(50).optional(),
  type: z.enum(['receipt', 'payment']).optional(),
  description: z.string().max(500).optional().nullable(),
  placeholder: z.string().max(200).optional().nullable(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
  debit_account_id: z.string().uuid().optional().nullable(),
  credit_account_id: z.string().uuid().optional().nullable(),
  fee_account_id: z.string().uuid().optional().nullable(),
  fee_percent: z.number().min(0).max(100).optional().nullable(),
  fee_fixed: z.number().min(0).optional().nullable(),
  // 種類 enum（分類用、各 kind 邏輯未來再接）
  kind: z.enum(['wire_transfer', 'card', 'cash', 'check', 'other']).optional().nullable(),
})

export const upsertBankAccountSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  bank_code: z.string().max(3).optional().nullable(), // FK to ref_banks.bank_code（onboarding fix pack）
  bank_name: z.string().max(100).optional().nullable(),
  account_number: z.string().max(50).optional().nullable(),
  is_default: z.boolean().optional(),
  account_id: z.string().uuid().optional().nullable(),
  is_disbursement_eligible: z.boolean().optional(),
})

export const autoCreateVoucherSchema = z.object({
  source_type: z.enum(['payment_request', 'receipt', 'disbursement_order']),
  source_id: z.string().uuid(),
  workspace_id: z.string().uuid(),
})

// ==========================================
// 錯誤日誌
// ==========================================

export const logErrorSchema = z
  .object({
    message: z.string().optional(),
    stack: z.string().optional(),
    componentStack: z.string().optional(),
    url: z.string().optional(),
  })
  .passthrough()
