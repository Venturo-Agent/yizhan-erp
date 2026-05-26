/**
 * 建立租戶 Dialog — 共用型別
 */

import type { PlanId } from '@/lib/permissions/subscription-plans'

export type { PlanId }

export interface DimensionRow {
  code: string
  name: string
  /** 只有 branches 用、8 碼數字 */
  tax_id?: string
}

export type Industry = 'tourism' | 'beauty' | 'general'
export type TourismSubIndustry = 'travel_agency' | 'tour_bus' | 'local_agency'
export type BeautySubIndustry = 'massage' | 'hair_salon' | 'nails'
export type SubIndustry = TourismSubIndustry | BeautySubIndustry | null

export interface FormData {
  // 公司基本
  name: string
  code: string
  taxId: string
  maxEmployees: string

  // 產業分類
  industry: Industry | ''
  subIndustry: SubIndustry

  // 訂閱方案
  subscriptionPlan: PlanId

  // 其他可選功能（建立時現場決定、union 進方案 features）
  // 方案已含的 chip 鎖住、用戶不能取消（避免「勾了 calendar 但 BASE 還是強制開」的 UX 不一致）
  optionalFeatures: string[]

  // 品牌
  brands: DimensionRow[]

  // 組織
  isMultiBranch: boolean
  branches: DimensionRow[]

  // admin
  employeeNumber: string
  adminName: string
  adminEmail: string
}

export interface LoginInfo {
  workspaceCode: string
  employeeNumber: string
  email: string
  password: string
}

export const INITIAL_FORM: FormData = {
  name: '',
  code: '',
  taxId: '',
  maxEmployees: '5',
  industry: '',
  subIndustry: null,
  subscriptionPlan: 'lite',
  optionalFeatures: [],
  brands: [],
  isMultiBranch: false,
  branches: [],
  employeeNumber: 'E001',
  adminName: '',
  adminEmail: '',
}
