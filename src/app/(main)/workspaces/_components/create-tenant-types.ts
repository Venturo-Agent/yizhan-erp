/**
 * 建立租戶 Dialog — 共用型別
 */

export interface DimensionRow {
  code: string
  name: string
}

export interface FormData {
  // 公司基本
  name: string
  code: string
  taxId: string
  maxEmployees: string

  // 品牌
  brands: DimensionRow[]

  // 組織
  isMultiBranch: boolean
  branches: DimensionRow[]
  isMultiDepartment: boolean
  departments: DimensionRow[]

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
  maxEmployees: '',
  brands: [],
  isMultiBranch: false,
  branches: [],
  isMultiDepartment: false,
  departments: [],
  employeeNumber: 'E001',
  adminName: '',
  adminEmail: '',
}
