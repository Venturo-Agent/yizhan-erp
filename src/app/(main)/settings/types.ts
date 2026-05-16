export interface PasswordData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export interface CacheInfo {
  dbExists: boolean
  tableCount: number
}
