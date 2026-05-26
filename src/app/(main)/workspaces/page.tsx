'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import { ListPageLayout } from '@/components/layout/list-page-layout'
import { Building2, Edit2, Plus } from 'lucide-react'
import { useWorkspaceStore } from '@/stores/workspace'
import type { Workspace } from '@/stores/workspace'
import { TableColumn } from '@/components/ui/enhanced-table'
import { ActionCell } from '@/components/table-cells'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { CreateTenantDialog } from './create-tenant-dialog'
import { EditTenantDialog } from './edit-tenant-dialog'
import { getPlanById } from '@/lib/permissions/subscription-plans'
import type { PlanId } from '@/lib/permissions/subscription-plans'

type WorkspaceRow = Workspace & {
  employee_count: number
  admin_name: string | null
  admin_id: string | null
  subscription_plan: PlanId | null
}

export default function TenantsPage() {
  const t = useTranslations('workspacesPage')
  const router = useRouter()
  const { updateWorkspace } = useWorkspaceStore()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingWorkspace, setEditingWorkspace] = useState<WorkspaceRow | null>(null)
  // 用 SWR 快取租戶列表（繞過 RLS，server 端檢查 tenants 權限）
  // API 會回傳 employee_count / admin_name / admin_id
  const {
    data: allWorkspaces = [],
    mutate: refreshWorkspaces,
    isLoading: isWorkspacesLoading,
  } = useSWR<WorkspaceRow[]>(
    'all-workspaces',
    async () => {
      const res = await fetch('/api/workspaces')
      if (!res.ok) return []
      return res.json()
    },
    { revalidateOnFocus: false }
  )

  // 點擊行進入詳情頁
  const handleRowClick = useCallback(
    (workspace: WorkspaceRow) => {
      router.push(`/workspaces/${workspace.id}`)
    },
    [router]
  )

  // API 已經回傳 employee_count / admin_name，直接用即可
  const data: WorkspaceRow[] = useMemo(() => allWorkspaces || [], [allWorkspaces])

  const handleToggleActive = useCallback(
    async (workspace: WorkspaceRow, e?: React.MouseEvent) => {
      if (e) e.stopPropagation()
      try {
        const newStatus = !workspace.is_active
        await updateWorkspace(workspace.id, { is_active: newStatus })
        toast.success(newStatus ? t('toastToggleSuccessActive') : t('toastToggleSuccessInactive'))
      } catch (error) {
        logger.error('Failed to toggle workspace status:', error)
        toast.error(t('toastToggleFailed'))
      }
    },
    [updateWorkspace]
  )

  const columns: TableColumn<WorkspaceRow>[] = useMemo(
    () => [
      {
        key: 'name',
        label: t('colName'),
        sortable: true,
        width: '180px',
        render: value => <span className="font-medium">{String(value || '')}</span>,
      },
      {
        key: 'code',
        label: t('colCode'),
        sortable: true,
        width: '120px',
        render: value => (
          <span className="font-mono text-sm text-morandi-primary">{String(value || '')}</span>
        ),
      },
      {
        key: 'employee_count',
        label: t('colEmployeeCount'),
        sortable: true,
        width: '100px',
        render: value => (
          <span className="text-sm">
            {String(value || 0)}
            {t('employeeCountSuffix')}
          </span>
        ),
      },
      {
        key: 'subscription_plan',
        label: t('colPlan'),
        sortable: false,
        width: '100px',
        render: (_value, row: WorkspaceRow) => {
          const planId: PlanId = row.subscription_plan || 'custom'
          const plan = getPlanById(planId)
          return (
            <span className={`px-2 py-1 rounded text-xs font-medium ${plan.colorClass}`}>
              {plan.name}
            </span>
          )
        },
      },
      {
        key: 'is_active',
        label: t('colStatus'),
        sortable: true,
        width: '90px',
        render: (_value, row: WorkspaceRow) => (
          <span
            className={`px-2 py-1 rounded text-sm font-medium ${
              row.is_active
                ? 'text-morandi-primary bg-morandi-container'
                : 'text-morandi-red bg-morandi-red/10'
            }`}
          >
            {row.is_active ? t('statusActive') : t('statusInactive')}
          </span>
        ),
      },
    ],
    []
  )

  const renderActions = useCallback(
    (workspace: WorkspaceRow) => (
      <ActionCell
        actions={[
          {
            icon: Edit2,
            label: t('editTenant'),
            onClick: () => setEditingWorkspace(workspace),
          },
          {
            icon: Building2,
            label: workspace.is_active ? t('statusInactive') : t('statusActive'),
            onClick: () => handleToggleActive(workspace),
            variant: workspace.is_active ? ('warning' as const) : undefined,
          },
        ]}
      />
    ),
    [handleToggleActive]
  )

  const handleCreateComplete = useCallback(() => {
    setIsCreateOpen(false)
    refreshWorkspaces()
  }, [refreshWorkspaces])

  return (
    <>
      <ListPageLayout
        title={t('pageTitle')}
        icon={Building2}
        data={data}
        columns={columns}
        loading={isWorkspacesLoading}
        searchFields={['name', 'code'] as (keyof WorkspaceRow)[]}
        searchPlaceholder={t('searchPlaceholder')}
        renderActions={renderActions}
        actionsWidth="200px"
        bordered={true}
        emptyMessage={t('emptyMessage')}
        onRowClick={handleRowClick}
        primaryAction={{
          label: t('addTenant'),
          icon: Plus,
          onClick: () => setIsCreateOpen(true),
        }}
      />

      <CreateTenantDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onComplete={handleCreateComplete}
        existingCodes={(allWorkspaces || []).map(ws => ws.code || '').filter(Boolean)}
      />

      <EditTenantDialog
        open={!!editingWorkspace}
        onOpenChange={open => {
          if (!open) setEditingWorkspace(null)
        }}
        workspace={editingWorkspace}
        onComplete={() => {
          setEditingWorkspace(null)
          refreshWorkspaces()
        }}
      />
    </>
  )
}
