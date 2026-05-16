// Shared types for workspace stores

export interface Workspace {
  id: string
  name: string
  code?: string | null
  type?: string | null
  description?: string | null
  icon?: string | null
  is_active: boolean | null
  contract_seal_image_url?: string | null // 合約專用章圖片 URL
  created_by?: string | null
  created_at?: string | null
  updated_at?: string | null
  max_employees?: number | null
}
