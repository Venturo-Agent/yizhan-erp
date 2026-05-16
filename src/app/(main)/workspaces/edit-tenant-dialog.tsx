'use client'

import React, { useState, useEffect } from 'react'
import { useAsyncSubmit } from '@/hooks/useAsyncSubmit'
import { EntityFormDialog } from '@/components/shared/EntityFormDialog'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { useWorkspaceStore } from '@/stores/workspace'
import { useTranslations } from 'next-intl'

interface EditTenantDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspace: {
    id: string
    name: string
    code?: string | null
    max_employees?: number | null
  } | null
  onComplete: () => void
}

export function EditTenantDialog({
  open,
  onOpenChange,
  workspace,
  onComplete,
}: EditTenantDialogProps) {
  const t = useTranslations('workspacesPage')
  const { updateWorkspace } = useWorkspaceStore()
  const [name, setName] = useState('')
  const [maxEmployees, setMaxEmployees] = useState('')

  useEffect(() => {
    if (workspace && open) {
      setName(workspace.name)
      setMaxEmployees(workspace.max_employees != null ? String(workspace.max_employees) : '')
    }
  }, [workspace, open])

  const { isSubmitting: saving, execute: executeSave } = useAsyncSubmit(
    async () => {
      if (!workspace || !name.trim()) return
      await updateWorkspace(workspace.id, {
        name: name.trim(),
        max_employees: maxEmployees ? parseInt(maxEmployees, 10) : null,
      } as Parameters<typeof updateWorkspace>[1])
      toast.success(t('toastEditSuccess'))
      onComplete()
    },
    {
      onError: (error) => {
        logger.error('Failed to update workspace:', error)
        toast.error(t('toastEditFailed'))
      },
    }
  )

  const handleSave = () => executeSave()

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="租戶"
      entity={workspace}
      onSubmit={handleSave}
      isSubmitting={saving}
      submitDisabled={!name.trim()}
      submitLabel={t('btnSave')}
      cancelLabel={t('btnCancel')}
      maxWidth="md"
    >
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-sm font-medium text-morandi-primary">
              {t('fieldName')}{' '}
              <span className="text-morandi-red">{t('fieldNameRequired')}</span>
            </label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('fieldNamePlaceholder')}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-morandi-primary">{t('fieldCode')}</label>
            <Input value={workspace?.code || ''} disabled className="mt-1" />
            <p className="text-xs text-morandi-secondary mt-1">{t('fieldCodeHint')}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-morandi-primary">
              {t('fieldMaxEmployees')}
            </label>
            <Input
              type="number"
              min="1"
              value={maxEmployees}
              onChange={e => setMaxEmployees(e.target.value)}
              placeholder={t('fieldMaxEmployeesPlaceholder')}
              className="mt-1 max-w-[160px]"
            />
            <p className="text-xs text-morandi-secondary mt-1">{t('fieldMaxEmployeesHint')}</p>
          </div>
        </div>
    </EntityFormDialog>
  )
}
