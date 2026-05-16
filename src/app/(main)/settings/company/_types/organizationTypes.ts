/**
 * organizationTypes.ts
 * 組織管理（品牌 / 分公司 / 部門）共用型別 + fetcher
 * 從 OrganizationSection.tsx 抽出、供 DimensionSection 和 BranchesWithDepartments 共用
 */

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
    throw new Error(j.error || '載入失敗')
  }
  const json = await res.json()
  return json.data ?? []
}
