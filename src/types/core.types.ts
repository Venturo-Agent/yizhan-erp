export interface BaseEntity {
  id: string
  created_at?: string | null
  updated_at?: string | null
}

export interface PageRequest {
  page: number
  pageSize: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  search?: string
}

export interface PageResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

type CrudActions<T> = {
  create: (data: Omit<T, keyof BaseEntity>) => Promise<T>
  update: (id: string, data: Partial<T>) => Promise<T>
  delete: (id: string) => Promise<boolean>
  refresh: () => Promise<void>
}

export interface UseEntityResult<T> {
  data: T[]
  totalCount: number
  loading: boolean
  error: string | null
  actions: CrudActions<T>
}

interface UseEntityDetailsResult<T> {
  entity: T | null
  loading: boolean
  error: string | null
}
