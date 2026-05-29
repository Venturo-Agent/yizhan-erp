/**
 * organizationTypes.ts
 * 組織管理（品牌 / 分公司）共用型別 + fetcher
 * 從 OrganizationSection.tsx 抽出、供 DimensionSection 和 BranchesSection 共用
 */

export type DimensionTable = 'brands' | 'branches'

export interface DimensionRow {
  id: string
  code: string
  name: string
  is_default: boolean
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
  /** 只有 branches 有、8 碼數字 */
  tax_id?: string | null
  /** 只有 branches 有：'headquarters'（總部 placeholder）/ 'branch'（真分公司） */
  type?: string | null
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
