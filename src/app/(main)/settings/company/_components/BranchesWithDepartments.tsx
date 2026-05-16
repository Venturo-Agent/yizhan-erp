'use client'
/**
 * BranchesWithDepartments
 * 組織管理 — 分公司 + 部門整合組件（5/15 William 拍板）
 *
 * 設計：部門 nested 在每張分公司 card 內、不再獨立 section
 * 不用 window.prompt（俗）、用 inline form
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
  Users2,
  SquarePen,
  Trash2,
  Star,
} from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { confirm } from '@/lib/ui/alert-dialog'
import { fetcher, type DimensionRow } from '../_types/organizationTypes'

interface DeptFormState {
  branchId: string
  editingId: string | null
  code: string
  name: string
}

export function BranchesWithDepartments() {
  const { data: branches = [], mutate: mutateBranches, isLoading: branchesLoading } = useSWR<DimensionRow[]>(
    '/api/organization/branches',
    fetcher,
    { revalidateOnFocus: false }
  )
  const { data: allDepts = [], mutate: mutateDepts } = useSWR<DimensionRow[]>(
    '/api/organization/departments',
    fetcher,
    { revalidateOnFocus: false }
  )

  // branch CRUD form state
  const [branchForm, setBranchForm] = useState<{
    open: boolean
    editingId: string | null
    code: string
    name: string
    isDefault: boolean
  } | null>(null)

  const startCreateBranch = () =>
    setBranchForm({ open: true, editingId: null, code: '', name: '', isDefault: false })
  const startEditBranch = (row: DimensionRow) =>
    setBranchForm({
      open: true,
      editingId: row.id,
      code: row.code,
      name: row.name,
      isDefault: row.is_default,
    })
  const cancelBranchForm = () => setBranchForm(null)

  const submitBranchForm = async () => {
    if (!branchForm) return
    if (!branchForm.code.trim() || !branchForm.name.trim()) {
      toast.error('代號與名稱必填')
      return
    }
    try {
      const isUpdate = !!branchForm.editingId
      const body: Record<string, unknown> = {
        ...(isUpdate ? { id: branchForm.editingId } : {}),
        code: branchForm.code.trim().toUpperCase(),
        name: branchForm.name.trim(),
        is_default: branchForm.isDefault,
      }
      const res = await fetch('/api/organization/branches', {
        method: isUpdate ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || '儲存失敗')
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
      const res = await fetch(`/api/organization/branches?id=${row.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || '刪除失敗')
      }
      toast.success('已刪除')
      await mutateBranches()
      await mutateDepts()
    } catch (e) {
      logger.error('[Organization] delete branch error:', e)
      toast.error(e instanceof Error ? e.message : '刪除失敗')
    }
  }

  // dept CRUD form state（per-branch inline）
  const [deptForm, setDeptForm] = useState<DeptFormState | null>(null)

  const startCreateDept = (branchId: string) =>
    setDeptForm({ branchId, editingId: null, code: '', name: '' })
  const startEditDept = (dept: DimensionRow) =>
    setDeptForm({
      branchId: dept.branch_id ?? '',
      editingId: dept.id,
      code: dept.code,
      name: dept.name,
    })
  const cancelDeptForm = () => setDeptForm(null)

  const submitDeptForm = async () => {
    if (!deptForm) return
    if (!deptForm.code.trim() || !deptForm.name.trim()) {
      toast.error('代號與名稱必填')
      return
    }
    try {
      const isUpdate = !!deptForm.editingId
      const body: Record<string, unknown> = {
        ...(isUpdate ? { id: deptForm.editingId } : {}),
        code: deptForm.code.trim().toUpperCase(),
        name: deptForm.name.trim(),
        branch_id: deptForm.branchId,
        is_default: false,
      }
      const res = await fetch('/api/organization/departments', {
        method: isUpdate ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || '儲存失敗')
      }
      toast.success(isUpdate ? '已更新部門' : '已新增部門')
      cancelDeptForm()
      await mutateDepts()
    } catch (e) {
      logger.error('[Organization] save dept error:', e)
      toast.error(e instanceof Error ? e.message : '儲存失敗')
    }
  }

  const handleDeleteDept = async (dept: DimensionRow) => {
    if (dept.is_default) {
      toast.error('預設部門不可刪除')
      return
    }
    const ok = await confirm(`確定刪除部門「${dept.name}」？`, {
      title: '刪除部門',
      type: 'warning',
    })
    if (!ok) return
    try {
      const res = await fetch(`/api/organization/departments?id=${dept.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || '刪除失敗')
      }
      toast.success('已刪除')
      await mutateDepts()
    } catch (e) {
      logger.error('[Organization] delete dept error:', e)
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

      {/* branch inline form */}
      {branchForm?.open && (
        <div className="bg-morandi-container/10 rounded-md p-4 mb-4 space-y-3">
          <div className="text-sm font-medium text-morandi-primary">
            {branchForm.editingId ? '編輯分公司' : '新增分公司'}
          </div>
          <div className="grid grid-cols-2 gap-3">
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
          {branches.map(branch => {
            const branchDepts = allDepts.filter(d => d.branch_id === branch.id)
            const isDeptFormForThisBranch =
              deptForm !== null && deptForm.branchId === branch.id
            return (
              <Card
                key={branch.id}
                className="border border-morandi-gold/15 rounded-lg p-4 bg-card"
              >
                {/* branch header row */}
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
                      <div className="text-xs text-morandi-muted">
                        {branchDepts.length === 0 ? '此分公司無部門' : `${branchDepts.length} 個部門`}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => startCreateDept(branch.id)}
                      type="button"
                      title={`為「${branch.name}」新增部門`}
                      className="text-morandi-gold hover:text-morandi-gold/80"
                    >
                      <Users2 className="h-4 w-4" />
                    </Button>
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

                {/* nested departments list */}
                {(branchDepts.length > 0 || isDeptFormForThisBranch) && (
                  <div className="mt-3 ml-8 pl-4 border-l-2 border-morandi-gold/20 space-y-1">
                    {branchDepts.map(dept => (
                      <div
                        key={dept.id}
                        className="flex items-center justify-between py-1.5 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <Users2 className="h-3.5 w-3.5 text-morandi-secondary" />
                          <span className="font-medium text-morandi-primary">{dept.name}</span>
                          <span className="text-xs font-mono text-morandi-muted">{dept.code}</span>
                          {dept.is_default && (
                            <span className="inline-flex items-center gap-1 text-xs text-morandi-gold">
                              <Star className="h-3 w-3 fill-morandi-gold" />主要
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startEditDept(dept)}
                            type="button"
                            className="h-7 w-7"
                          >
                            <SquarePen className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteDept(dept)}
                            disabled={dept.is_default}
                            type="button"
                            className="h-7 w-7 text-status-danger hover:text-status-danger/80 disabled:opacity-30"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {/* dept inline form (only show if for this branch) */}
                    {isDeptFormForThisBranch && deptForm && (
                      <div className="bg-morandi-container/15 rounded-md p-3 mt-2 space-y-2">
                        <div className="text-xs font-medium text-morandi-primary">
                          {deptForm.editingId ? '編輯部門' : `為「${branch.name}」新增部門`}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">代號</Label>
                            <Input
                              value={deptForm.code}
                              onChange={e =>
                                setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })
                              }
                              placeholder="例：SALES / OP"
                              className="font-mono mt-1 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">名稱</Label>
                            <Input
                              value={deptForm.name}
                              onChange={e => setDeptForm({ ...deptForm, name: e.target.value })}
                              placeholder="部門名稱"
                              className="mt-1 text-sm"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {/* 2026-05-16 QDF R52：對齊按鈕順序規則（取消左、主操作右）*/}
                          <Button variant="ghost" size="sm" onClick={cancelDeptForm} type="button">
                            取消
                          </Button>
                          <Button
                            variant="soft-gold"
                            size="sm"
                            onClick={submitDeptForm}
                            type="button"
                          >
                            儲存
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </Card>
  )
}
