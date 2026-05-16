import { z } from 'zod'

// ==========================================
// Proposal
// ==========================================

/** 新增提案（含第一個版本） */
export const createProposalSchema = z.object({
  versionName: z.string().min(1, '版本名稱為必填'),
})

/** 編輯提案 */
export const updateProposalSchema = z.object({
  title: z.string().optional(),
  expectedStartDate: z.string().optional(),
})

// ==========================================
// Tour
// ==========================================

export const createTourSchema = z
  .object({
    name: z.string().min(1, '請填寫團名'),
    departure_date: z.string().min(1, '請選擇出發日期'),
    return_date: z.string().min(1, '請選擇回程日期'),
  })
  .refine(
    data => {
      if (!data.departure_date || !data.return_date) return true
      return new Date(data.departure_date) <= new Date(data.return_date)
    },
    { message: '回程日期不可早於出發日期', path: ['return_date'] }
  )

// ==========================================
// Payment Request (from advance items)
// ==========================================

export const createPaymentRequestSchema = z.object({
  selectedTourId: z.string().min(1, '請選擇關聯旅遊團'),
  amount: z.number().positive('金額必須大於 0'),
})

// ==========================================
// Disbursement Order
// ==========================================

export const createDisbursementSchema = z.object({
  selectedRequestIds: z.array(z.string()).min(1, '請選擇至少一張請款單'),
  disbursementDate: z.string().min(1, '請選擇出納日期'),
})

// ==========================================
// Manual Request (AddManualRequestDialog)
// ==========================================

export const addManualRequestSchema = z.object({
  title: z.string().min(1, '請填寫項目說明'),
  category: z.string().min(1, '請選擇類別'),
})

// ==========================================
// Package
// ==========================================

export const createPackageSchema = z.object({
  version_name: z.string().min(1, '版本名稱為必填'),
})

// Type exports
type CreateProposalInput = z.infer<typeof createProposalSchema>
type CreateTourInput = z.infer<typeof createTourSchema>
type CreatePaymentRequestInput = z.infer<typeof createPaymentRequestSchema>
type CreateDisbursementInput = z.infer<typeof createDisbursementSchema>
type AddManualRequestInput = z.infer<typeof addManualRequestSchema>
