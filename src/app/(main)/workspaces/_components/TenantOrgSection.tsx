'use client'

/**
 * TenantOrgSection — 組織設定區塊（多分公司 / 多部門）
 */

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { DimensionRow, FormData } from './create-tenant-types'

interface Props {
  // 分公司
  isMultiBranch: FormData['isMultiBranch']
  branches: FormData['branches']
  onToggleMultiBranch: (checked: boolean) => void
  onUpdateBranch: (idx: number, field: keyof DimensionRow, value: string) => void
  onAddBranch: () => void
  onRemoveBranch: (idx: number) => void
  // 部門
  isMultiDepartment: FormData['isMultiDepartment']
  departments: FormData['departments']
  onToggleMultiDept: (checked: boolean) => void
  onUpdateDept: (idx: number, field: keyof DimensionRow, value: string) => void
  onAddDept: () => void
  onRemoveDept: (idx: number) => void
}

export function TenantOrgSection({
  isMultiBranch,
  branches,
  onToggleMultiBranch,
  onUpdateBranch,
  onAddBranch,
  onRemoveBranch,
  isMultiDepartment,
  departments,
  onToggleMultiDept,
  onUpdateDept,
  onAddDept,
  onRemoveDept,
}: Props) {
  const t = useTranslations('workspacesPage')
  return (
    <section className="space-y-3 pt-3 border-t border-morandi-container/40">
      <h3 className="text-sm font-semibold text-morandi-primary">{t('sectionBranches')}</h3>

      {/* 多分公司 */}
      <div className="space-y-2">
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isMultiBranch}
            onChange={e => onToggleMultiBranch(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-morandi-muted"
          />
          <div>
            <div className="text-sm font-medium text-morandi-primary">
              {t('checkboxMultiBranch')}
            </div>
            <p className="text-xs text-morandi-muted">{t('checkboxMultiBranchHint')}</p>
          </div>
        </label>

        {isMultiBranch && (
          <div className="ml-6 space-y-2">
            {branches.map((br, idx) => (
              <div key={idx} className="flex gap-2 items-start">
                <Input
                  value={br.name}
                  onChange={e => onUpdateBranch(idx, 'name', e.target.value)}
                  placeholder={`${t('fieldBranchName')}${idx === 0 ? '（主要）' : ''}`}
                  className="flex-1"
                />
                <Input
                  value={br.code}
                  onChange={e => onUpdateBranch(idx, 'code', e.target.value.toUpperCase())}
                  placeholder={t('fieldBranchCodePlaceholder')}
                  className="w-32 font-mono"
                />
                {branches.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveBranch(idx)}
                    className="text-morandi-red"
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="soft-gold" size="sm" onClick={onAddBranch} type="button">
              {t('btnAddBranch')}
            </Button>
          </div>
        )}
      </div>

      {/* 多部門 */}
      <div className="space-y-2 pt-2">
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isMultiDepartment}
            onChange={e => onToggleMultiDept(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-morandi-muted"
          />
          <div>
            <div className="text-sm font-medium text-morandi-primary">
              {t('checkboxMultiDepartment')}
            </div>
            <p className="text-xs text-morandi-muted">{t('checkboxMultiDepartmentHint')}</p>
          </div>
        </label>

        {isMultiDepartment && (
          <div className="ml-6 space-y-2">
            {departments.map((d, idx) => (
              <div key={idx} className="flex gap-2 items-start">
                <Input
                  value={d.name}
                  onChange={e => onUpdateDept(idx, 'name', e.target.value)}
                  placeholder={`${t('fieldDepartmentName')}${idx === 0 ? '（主要）' : ''}`}
                  className="flex-1"
                />
                <Input
                  value={d.code}
                  onChange={e => onUpdateDept(idx, 'code', e.target.value.toUpperCase())}
                  placeholder={t('fieldDepartmentCodePlaceholder')}
                  className="w-32 font-mono"
                />
                {departments.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveDept(idx)}
                    className="text-morandi-red"
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="soft-gold" size="sm" onClick={onAddDept} type="button">
              {t('btnAddDepartment')}
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}
