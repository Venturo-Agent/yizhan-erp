// 組織管理共用型別定義 + 資料 fetcher

export type DimensionTable = 'brands' | 'branches' | 'departments'

export interface DimensionRow {
  id: string
  code: string
  name: string
  is_default: boolean
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
  /** 只有 departments 有、表示掛在哪個 branch 底下 */
  branch_id?: string | null
}

export const fetcher = async (url: string): Promise<DimensionRow[]> => {
  const res = await fetch(url)
  if (!res.ok) {
    const j = await res.json().catch(() => ({}))
    throw new Error((j as { error?: string }).error || '載入失敗')
  }
  const json = await res.json() as { data?: DimensionRow[] }
  return json.data ?? []
}
