/**
 * 建立租戶 Dialog — 共用型別
 */

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

  // 功能勾選（建立時現場決定要開哪些功能、預設全關、系統必要功能後端自動開）
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
  optionalFeatures: [],
  brands: [],
  isMultiBranch: false,
  branches: [],
  employeeNumber: 'E001',
  adminName: '',
  adminEmail: '',
}
