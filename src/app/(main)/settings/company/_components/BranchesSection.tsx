'use client'
/**
 * BranchesSection — 分公司管理（純展示 + 刪除）
 *
 * 2026-05-28 William 拍板：
 * - 從公司設定頁拿掉「組織管理」wrapper、分公司獨立卡片
 * - 沒有分公司就整個 section 不顯示
 * - 移除新增 / 編輯 / 設預設 / 展開 form（之後編輯改 dialog 時再做）
 * - 保留：列表展示（名稱 / 代號 / 統編）+ 刪除（讓客戶清錯誤資料、預設防呆保留）
 *
 * 註：新增 / 編輯 API（POST / PUT /api/organization/branches）保留供未來 dialog 用、暫無 UI 入口。
 */

import React from 'react'
import useSWR from 'swr'
import { Card } from '@/components/ui/card'
import { Building2, Network, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { confirm } from '@/lib/ui/alert-dialog'
import { fetcher, type DimensionRow } from '../_types/organizationTypes'
import { apiMutate } from '@/lib/swr/api-mutate'
import { ActionCell } from '@/components/table-cells'

export function BranchesSection() {
  const {
    data: branches = [],
    mutate: mutateBranches,
    isLoading: branchesLoading,
  } = useSWR<DimensionRow[]>('/api/organization/branches', fetcher, { revalidateOnFocus: false })

  const handleDeleteBranch = async (row: DimensionRow) => {
    if (row.is_default) {
      toast.error('預設分公司不可刪除')
      return
    }
    const ok = await confirm(`確定刪除分公司「${row.name}」？`, {
      title: '刪除分公司',
      type: 'warning',
    })
    if (!ok) return
    try {
      const res = await apiMutate(`/api/organization/branches?id=${row.id}`, {
        method: 'DELETE',
        invalidate: ['/api/organization/branches'],
      })
      if (!res.ok) throw new Error(res.error || '刪除失敗')
      toast.success('已刪除')
      await mutateBranches()
    } catch (e) {
      logger.error('[Organization] delete branch error:', e)
      toast.error(e instanceof Error ? e.message : '刪除失敗')
    }
  }

  // 沒有分公司（或還在載入）→ 整個 section 不顯示
  if (branchesLoading || branches.length === 0) return null

  return (
    <Card className="rounded-xl shadow-sm border border-border p-6">
      <div className="flex items-center gap-3 text-base font-semibold text-morandi-primary mb-4">
        <Network className="h-5 w-5 text-morandi-gold" />
        分公司管理
        <span className="text-sm font-normal text-morandi-muted">（{branches.length}）</span>
      </div>

      <div className="space-y-3">
        {branches.map(branch => (
          <Card key={branch.id} className="border border-morandi-gold/15 rounded-lg p-4 bg-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-morandi-gold" />
                <div>
                  <div className="font-semibold text-morandi-primary">
                    {branch.name}
                    <span className="ml-2 text-xs font-mono text-morandi-muted">{branch.code}</span>
                  </div>
                  {branch.tax_id && (
                    <div className="text-xs text-morandi-muted font-mono">
                      統編：{branch.tax_id}
                    </div>
                  )}
                </div>
              </div>
              <ActionCell
                actions={[
                  {
                    icon: Trash2,
                    label: branch.is_default ? '預設分公司不可刪除' : '刪除分公司',
                    onClick: () => handleDeleteBranch(branch),
                    variant: 'danger',
                    disabled: branch.is_default,
                  },
                ]}
              />
            </div>
          </Card>
        ))}
      </div>
    </Card>
  )
}
