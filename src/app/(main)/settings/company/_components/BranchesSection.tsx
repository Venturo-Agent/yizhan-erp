'use client'
/**
 * BranchesSection
 * 組織管理 — 分公司 CRUD（不含部門、5/18 dept 拆掉、之後 nested 重設計）
 */

import React, { useState } from 'react'
import useSWR from 'swr'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Building2,
  Network,
  SquarePen,
  Trash2,
  Star,
} from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { confirm } from '@/lib/ui/alert-dialog'
import { fetcher, type DimensionRow } from '../_types/organizationTypes'
import { apiMutate } from '@/lib/swr/api-mutate'

interface BranchFormState {
  open: boolean
  editingId: string | null
  code: string
  name: string
  taxId: string
  isDefault: boolean
}

export function BranchesSection() {
  const { data: branches = [], mutate: mutateBranches, isLoading: branchesLoading } = useSWR<DimensionRow[]>(
    '/api/organization/branches',
    fetcher,
    { revalidateOnFocus: false }
  )

  const [branchForm, setBranchForm] = useState<BranchFormState | null>(null)

  const startCreateBranch = () =>
    setBranchForm({
      open: true,
      editingId: null,
      code: '',
      name: '',
      taxId: '',
      isDefault: false,
    })
  const startEditBranch = (row: DimensionRow) =>
    setBranchForm({
      open: true,
      editingId: row.id,
      code: row.code,
      name: row.name,
      taxId: row.tax_id ?? '',
      isDefault: row.is_default,
    })
  const cancelBranchForm = () => setBranchForm(null)

  const submitBranchForm = async () => {
    if (!branchForm) return
    if (!branchForm.code.trim() || !branchForm.name.trim()) {
      toast.error('代號與名稱必填')
      return
    }
    if (!/^\d{8}$/.test(branchForm.taxId.trim())) {
      toast.error('分公司統一編號必須為 8 碼數字')
      return
    }
    try {
      const isUpdate = !!branchForm.editingId
      const body: Record<string, unknown> = {
        ...(isUpdate ? { id: branchForm.editingId } : {}),
        code: branchForm.code.trim().toUpperCase(),
        name: branchForm.name.trim(),
        tax_id: branchForm.taxId.trim(),
        is_default: branchForm.isDefault,
      }
      const res = await apiMutate('/api/organization/branches', {
        method: isUpdate ? 'PUT' : 'POST',
        body,
        invalidate: ['/api/organization/branches'],
      })
      if (!res.ok) {
        throw new Error(res.error || '儲存失敗')
      }
      toast.success(isUpdate ? '已更新分公司' : '已新增分公司')
      cancelBranchForm()
      await mutateBranches()
    } catch (e) {
      logger.error('[Organization] save branch error:', e)
      toast.error(e instanceof Error ? e.message : '儲存失敗')
    }
  }

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
      if (!res.ok) {
        throw new Error(res.error || '刪除失敗')
      }
      toast.success('已刪除')
      await mutateBranches()
    } catch (e) {
      logger.error('[Organization] delete branch error:', e)
      toast.error(e instanceof Error ? e.message : '刪除失敗')
    }
  }

  return (
    <Card className="rounded-xl shadow-sm border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 text-base font-semibold text-morandi-primary">
          <Network className="h-5 w-5 text-morandi-gold" />
          分公司管理
          <span className="text-sm font-normal text-morandi-muted">（{branches.length}）</span>
        </div>
        <Button variant="soft-gold" size="sm" onClick={startCreateBranch} type="button">
          <Building2 className="h-4 w-4 mr-1" />
          新增分公司
        </Button>
      </div>

      {branchForm?.open && (
        <div className="bg-morandi-container/10 rounded-md p-4 mb-4 space-y-3">
          <div className="text-sm font-medium text-morandi-primary">
            {branchForm.editingId ? '編輯分公司' : '新增分公司'}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">代號</Label>
              <Input
                value={branchForm.code}
                onChange={e => setBranchForm({ ...branchForm, code: e.target.value.toUpperCase() })}
                placeholder="英數（例：HQ / TPE）"
                className="font-mono mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">名稱</Label>
              <Input
                value={branchForm.name}
                onChange={e => setBranchForm({ ...branchForm, name: e.target.value })}
                placeholder="分公司名稱"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">統一編號</Label>
              <Input
                value={branchForm.taxId}
                onChange={e =>
                  setBranchForm({
                    ...branchForm,
                    taxId: e.target.value.replace(/\D/g, '').slice(0, 8),
                  })
                }
                placeholder="8 碼數字"
                maxLength={8}
                inputMode="numeric"
                className="font-mono mt-1"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={branchForm.isDefault}
              onChange={e => setBranchForm({ ...branchForm, isDefault: e.target.checked })}
              className="h-4 w-4"
            />
            設為預設分公司（之前的預設會被自動取消）
          </label>
          <div className="flex gap-2">
            {/* 2026-05-16 QDF R52：對齊按鈕順序規則（取消左、主操作右）*/}
            <Button variant="ghost" size="sm" onClick={cancelBranchForm} type="button">
              取消
            </Button>
            <Button variant="soft-gold" size="sm" onClick={submitBranchForm} type="button">
              儲存
            </Button>
          </div>
        </div>
      )}

      {branchesLoading ? (
        <div className="text-sm text-morandi-muted py-4">載入中...</div>
      ) : branches.length === 0 ? (
        <div className="text-sm text-morandi-muted py-4">尚無分公司</div>
      ) : (
        <div className="space-y-3">
          {branches.map(branch => (
            <Card
              key={branch.id}
              className="border border-morandi-gold/15 rounded-lg p-4 bg-card"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-morandi-gold" />
                  <div>
                    <div className="font-semibold text-morandi-primary">
                      {branch.name}
                      <span className="ml-2 text-xs font-mono text-morandi-muted">{branch.code}</span>
                      {branch.is_default && (
                        <span className="ml-2 inline-flex items-center gap-1 text-xs text-morandi-gold">
                          <Star className="h-3 w-3 fill-morandi-gold" />主要
                        </span>
                      )}
                    </div>
                    {branch.tax_id && (
                      <div className="text-xs text-morandi-muted font-mono">
                        統編：{branch.tax_id}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => startEditBranch(branch)}
                    type="button"
                    title="編輯分公司"
                  >
                    <SquarePen className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteBranch(branch)}
                    disabled={branch.is_default}
                    type="button"
                    title={branch.is_default ? '預設分公司不可刪除' : '刪除分公司'}
                    className="text-status-danger hover:text-status-danger/80 disabled:opacity-30"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Card>
  )
}
