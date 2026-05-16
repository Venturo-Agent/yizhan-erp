'use client'
/**
 * DimensionSection
 * 組織管理 — 通用維度 section 組件（目前用於「品牌管理」）
 *
 * 特性：
 * - 1 筆 placeholder → 預設折疊；2+ 筆 → 預設展開
 * - 自帶 CRUD inline form（新增 / 編輯 / 刪除）
 * - 不自己 fetch config，由呼叫方傳入 config（apiPath / label 等）
 */

import React, { useState } from 'react'
import { useAsyncSubmit } from '@/hooks/useAsyncSubmit'
import useSWR from 'swr'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useBranches } from '@/data/hooks'
import {
  SquarePen,
  Trash2,
  Star,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { confirm } from '@/lib/ui/alert-dialog'
import { fetcher, type DimensionRow } from '../_types/organizationTypes'

interface DimensionSectionConfig {
  table: 'brands' | 'branches' | 'departments'
  label: string
  singular: string
  icon: React.ComponentType<{ className?: string }>
  actionIcon: React.ComponentType<{ className?: string }>
  apiPath: string
  emptyTip: string
}

interface DimensionSectionProps {
  config: DimensionSectionConfig
}

export function DimensionSection({ config }: DimensionSectionProps) {
  const Icon = config.icon
  const { data: rows = [], mutate, isLoading } = useSWR(config.apiPath, fetcher, {
    revalidateOnFocus: false,
  })

  // 1 筆 → 預設折疊；2+ 筆 → 預設展開
  const [expanded, setExpanded] = useState<boolean | null>(null)
  const isOpen = expanded ?? rows.length >= 2

  const [editing, setEditing] = useState<DimensionRow | null>(null)
  const [creating, setCreating] = useState(false)
  const [formCode, setFormCode] = useState('')
  const [formName, setFormName] = useState('')
  const [formIsDefault, setFormIsDefault] = useState(false)
  const [formBranchId, setFormBranchId] = useState('')
  // departments section 需要 branches 列表（級聯選擇）
  const { branches } = useBranches()
  const isDeptSection = config.table === 'departments'

  const startCreate = () => {
    setEditing(null)
    setCreating(true)
    setFormCode('')
    setFormName('')
    setFormIsDefault(false)
    // 預設選第一個 branch（通常是總部）、避免 user 必選
    setFormBranchId(isDeptSection ? (branches[0]?.id ?? '') : '')
  }

  const startEdit = (row: DimensionRow) => {
    setCreating(false)
    setEditing(row)
    setFormCode(row.code)
    setFormName(row.name)
    setFormIsDefault(row.is_default)
    setFormBranchId(row.branch_id ?? '')
  }

  const cancelEdit = () => {
    setEditing(null)
    setCreating(false)
  }

  const { isSubmitting: submitting, execute: executeSubmit } = useAsyncSubmit(
    async () => {
      const isUpdate = !!editing
      const body: Record<string, unknown> = {
        ...(isUpdate ? { id: editing.id } : {}),
        code: formCode.trim().toUpperCase(),
        name: formName.trim(),
        is_default: formIsDefault,
      }
      if (isDeptSection) {
        body.branch_id = formBranchId
      }
      const res = await fetch(config.apiPath, {
        method: isUpdate ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || '儲存失敗')
      }
      toast.success(isUpdate ? '已更新' : '已新增')
      cancelEdit()
      await mutate()
    },
    {
      onError: (e) => {
        logger.error('[Organization] save error:', e)
        toast.error(e instanceof Error ? e.message : '儲存失敗')
      },
    }
  )

  const handleSubmit = async () => {
    if (!formCode.trim() || !formName.trim()) {
      toast.error('代號與名稱必填')
      return
    }
    if (isDeptSection && !formBranchId) {
      toast.error('部門必須選擇所屬分公司')
      return
    }
    await executeSubmit()
  }

  const handleDelete = async (row: DimensionRow) => {
    if (row.is_default) {
      toast.error('預設項目不可刪除')
      return
    }
    const ok = await confirm(`確定刪除「${row.name}」？`, {
      title: `刪除${config.singular}`,
      type: 'warning',
    })
    if (!ok) return
    try {
      const res = await fetch(`${config.apiPath}?id=${row.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || '刪除失敗')
      }
      toast.success('已刪除')
      await mutate()
    } catch (e) {
      logger.error('[Organization] delete error:', e)
      toast.error(e instanceof Error ? e.message : '刪除失敗')
    }
  }

  return (
    <Card className="rounded-xl shadow-sm border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => setExpanded(prev => (prev === null ? !isOpen : !prev))}
          className="flex items-center gap-3 text-base font-semibold text-morandi-primary"
        >
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <Icon className="h-5 w-5 text-morandi-gold" />
          {config.label}
          <span className="text-sm font-normal text-morandi-muted">（{rows.length}）</span>
        </button>

        {isOpen && (() => {
          const ActionIcon = config.actionIcon
          return (
            <Button variant="soft-gold" size="sm" onClick={startCreate} type="button">
              <ActionIcon className="h-4 w-4 mr-1" />
              新增{config.singular}
            </Button>
          )
        })()}
      </div>

      {!isOpen && (
        <p className="text-xs text-morandi-muted">{config.emptyTip}</p>
      )}

      {isOpen && (
        <>
          {rows.length === 1 && (
            <p className="text-xs text-morandi-muted mb-3">{config.emptyTip}</p>
          )}

          {(creating || editing) && (
            <div className="bg-morandi-container/10 rounded-md p-4 mb-3 space-y-3">
              <div className="text-sm font-medium text-morandi-primary">
                {editing ? `編輯 ${editing.name}` : `新增${config.singular}`}
              </div>
              {isDeptSection && (
                <div>
                  <Label className="text-xs">所屬分公司 <span className="text-red-500">*</span></Label>
                  <select
                    value={formBranchId}
                    onChange={e => setFormBranchId(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-morandi-gold/30 rounded-lg focus:border-morandi-gold focus:outline-none bg-card text-morandi-primary text-sm"
                  >
                    <option value="">請選擇分公司</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">代號</Label>
                  <Input
                    value={formCode}
                    onChange={e => setFormCode(e.target.value.toUpperCase())}
                    placeholder="英數（例：JINYANG / TPE / SALES）"
                    className="font-mono mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">名稱</Label>
                  <Input
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder={`${config.singular}名稱`}
                    className="mt-1"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={formIsDefault}
                  onChange={e => setFormIsDefault(e.target.checked)}
                  className="h-4 w-4"
                />
                設為預設（之前的預設會被自動取消）
              </label>
              <div className="flex gap-2">
                {/* 2026-05-16 QDF R52：對齊按鈕順序規則（取消左、主操作右）*/}
                <Button variant="ghost" size="sm" onClick={cancelEdit} type="button">
                  取消
                </Button>
                <Button variant="soft-gold" size="sm" onClick={handleSubmit} disabled={submitting} type="button">
                  {submitting ? '儲存中...' : '儲存'}
                </Button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="text-sm text-morandi-muted py-4">載入中...</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-morandi-muted py-4">尚無資料</div>
          ) : (
            <div className="border border-border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-morandi-container/20">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium w-[120px]">代號</th>
                    <th className="text-left px-3 py-2 font-medium">名稱</th>
                    <th className="text-left px-3 py-2 font-medium w-[80px]">預設</th>
                    <th className="text-right px-3 py-2 font-medium w-[100px]">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => {
                    // 顯示部門所屬分公司（從 branches 列表查名字）
                    const deptBranch = isDeptSection && row.branch_id
                      ? branches.find(b => b.id === row.branch_id)
                      : null
                    return (
                    <tr key={row.id} className="border-t border-border">
                      <td className="px-3 py-2 font-mono">{row.code}</td>
                      <td className="px-3 py-2 font-medium">
                        {row.name}
                        {deptBranch && (
                          <span className="ml-2 text-xs text-morandi-muted font-normal">
                            @{deptBranch.name}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {row.is_default && (
                          <span className="inline-flex items-center gap-1 text-morandi-gold">
                            <Star className="h-3 w-3 fill-morandi-gold" />
                            主要
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startEdit(row)}
                            type="button"
                          >
                            <SquarePen className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(row)}
                            disabled={row.is_default}
                            className="text-status-danger hover:text-status-danger/80 disabled:opacity-30"
                            type="button"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Card>
  )
}
