'use client'

import { logger } from '@/lib/utils/logger'
import { useTranslations } from 'next-intl'
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { ListPageLayout } from '@/components/layout/list-page-layout'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useUserStore } from '@/stores/user-store'
import { EmployeeFull } from '@/stores/types'
import { EmployeeForm } from './_components/EmployeeForm'
import { SeveranceCalculatorDialog } from './_components/SeveranceCalculatorDialog'
import { useRouter } from 'next/navigation'
import { HR_ADMIN_TABS } from './components/hr-admin-tabs'
import { Users, SquarePen, UserX, Plus, Trash2, Calculator } from 'lucide-react'
import { useRoles } from '@/data/hooks'
import { useBranches } from '@/data/hooks/useBranches'
import { TableColumn } from '@/components/ui/enhanced-table'
import { DateCell, ActionCell } from '@/components/table-cells'
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge'
import { ConfirmDialog } from '@/components/dialog/confirm-dialog'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'
import { apiMutate } from '@/lib/swr/api-mutate'
// HR 用 useUserStore 寫入、須同步失效 employees entity 快取、否則其他頁下拉顯示舊名單（C3）
import { invalidateEmployees } from '@/data'

export default function HRPage() {
  const t = useTranslations('hrPage')
  const router = useRouter()
  const { items: users, fetchAll, update: updateUser } = useUserStore()
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [severanceEmployee, setSeveranceEmployee] = useState<EmployeeFull | null>(null)
  const { confirm, confirmDialogProps } = useConfirmDialog()

  // 職務列表走 useRoles SWR hook、跨頁共享 cache、不再自己 fetch
  const { roles: rolesData } = useRoles()
  const { branches: branchesData } = useBranches()

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // 員工列表：只顯示在職員工（不含已離職）
  const filteredEmployees = useMemo(
    () => users.filter(emp => emp.status !== 'terminated'),
    [users]
  )

  const getStatusLabel = (status: EmployeeFull['status']) => {
    const statusMap = {
      active: t('statusActive'),
      probation: t('statusProbation'),
      leave: t('statusLeave'),
      terminated: t('statusTerminated'),
    }
    return statusMap[status]
  }

  const getStatusTone = (status: EmployeeFull['status']): StatusTone => {
    const toneMap: Record<EmployeeFull['status'], StatusTone> = {
      active: 'neutral',
      probation: 'warning',
      leave: 'info',
      terminated: 'danger',
    }
    return toneMap[status]
  }

  const handleEmployeeClick = (employee: EmployeeFull) => {
    setExpandedEmployee(employee.id)
  }

  const handleTerminateEmployee = async (employee: EmployeeFull, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }

    const employeeName = employee.display_name || employee.chinese_name || t('unnamedEmployee')
    const confirmed = await confirm({
      type: 'warning',
      title: t('terminateTitle'),
      message: `${t('terminateConfirmPrefix')}${employeeName}${t('terminateConfirmSuffix')}`,
      details: [t('terminateDetail1'), t('terminateDetail2'), t('terminateDetail3')],
      confirmLabel: t('terminateConfirmLabel'),
      cancelLabel: t('cancel'),
    })

    if (!confirmed) {
      return
    }

    try {
      const currentUserId = useAuthStore.getState().user?.id
      await updateUser(employee.id, {
        status: 'terminated',
        terminated_at: new Date().toISOString(),
        terminated_by: currentUserId ?? null,
      })
      await invalidateEmployees() // 其他頁的員工下拉同步移除已離職
      if (expandedEmployee === employee.id) {
        setExpandedEmployee(null)
      }
    } catch (_err) {
      toast.error(t('terminateFailed'))
    }
  }

  // 永久刪除員工（操作錯誤的補救手段、區別於「辦理離職」軟刪）
  // 風險：員工有歷史紀錄被 FK reference 時、DB 會擋住、catch FK error 提示走離職
  const handleDeleteEmployee = async (employee: EmployeeFull, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }

    const employeeName = employee.display_name || employee.chinese_name || t('unnamedEmployee')
    const confirmed = await confirm({
      type: 'danger',
      title: t('deleteTitle'),
      message: `${t('deleteConfirmPrefix')}${employeeName}${t('deleteConfirmSuffix')}`,
      details: [
        t('deleteDetail1'),
        t('deleteDetail2'),
        t('deleteDetail3'),
        t('deleteDetail4'),
      ],
      confirmLabel: t('deleteConfirmLabel'),
      cancelLabel: t('cancel'),
    })

    if (!confirmed) {
      return
    }

    try {
      // 5/15 走 API、級聯清 auth.users，避免 orphan 害新員工撞 email unique
      const res = await apiMutate<{ message?: string }>(
        `/api/employees/${employee.id}`,
        { method: 'DELETE' }
      )

      if (!res.ok) {
        const msg = res.data?.message ?? res.error ?? `刪除失敗 (HTTP ${res.status})`
        logger.error('[HR] delete employee failed', { status: res.status, body: res.data })
        toast.error(msg)
        return
      }

      if (expandedEmployee === employee.id) {
        setExpandedEmployee(null)
      }
      // 更新前端 store（移掉這個員工 row）+ 失效 entity 快取（其他頁下拉同步移除）
      await Promise.all([fetchAll(), invalidateEmployees()])
      toast.success(`已永久刪除員工「${employeeName}」`)
    } catch (err) {
      logger.error('[HR] delete employee network error', err)
      toast.error('網路錯誤、刪除失敗、請稍後再試')
    }
  }

  const columns: TableColumn<EmployeeFull>[] = useMemo(
    () => [
      {
        key: 'employee_number',
        label: t('colEmployeeNumber'),
        sortable: true,
        width: '80px',
        render: value => <span className="font-mono text-sm">{String(value || '')}</span>,
      },
      {
        key: 'chinese_name',
        label: t('colName'),
        sortable: true,
        width: '100px',
        render: (_value, employee: EmployeeFull) => (
          <span className="font-medium">
            {String(employee.chinese_name || employee.display_name || t('unnamedEmployee'))}
          </span>
        ),
      },
      {
        key: 'job_info',
        label: '職務',
        sortable: false,
        width: '100px',
        render: (_value, employee: EmployeeFull) => {
          // 從職務列表取得職務名稱
          // role_id 優先讀頂層、fallback nested
          const empRoleId =
            (employee as unknown as { role_id?: string }).role_id || employee.job_info?.role_id
          const role = rolesData.find(r => r.id === empRoleId)
          return (
            <span className={`text-sm ${role ? 'text-morandi-primary' : 'text-morandi-muted'}`}>
              {role?.name || t('notSet')}
            </span>
          )
        },
      },
      {
        key: 'branch_id',
        label: '分公司',
        sortable: false,
        width: '110px',
        render: (_value, employee: EmployeeFull) => {
          const branchId = (employee as unknown as { branch_id?: string | null }).branch_id
          const branch = branchesData.find(b => b.id === branchId)
          return (
            <span className={`text-sm ${branch ? 'text-morandi-primary' : 'text-morandi-muted'}`}>
              {branch?.name || t('notSet')}
            </span>
          )
        },
      },
      {
        key: 'personal_info',
        label: t('colContact'),
        sortable: false,
        width: '200px',
        render: (_value, employee: EmployeeFull) => {
          const info = employee.personal_info as {
            phone?: string | string[]
            email?: string
          } | null
          return (
            <div className="text-sm">
              <div>
                {Array.isArray(info?.phone) ? info.phone[0] : info?.phone || t('notProvided')}
              </div>
              <div className="text-morandi-muted text-xs truncate max-w-[200px]">
                {info?.email || t('notProvided')}
              </div>
            </div>
          )
        },
      },
      {
        key: 'status',
        label: t('colStatus'),
        sortable: true,
        width: '70px',
        render: (_value, employee: EmployeeFull) => (
          <StatusBadge
            tone={getStatusTone(employee.status)}
            label={getStatusLabel(employee.status)}
          />
        ),
      },
    ],
    [rolesData, branchesData, t]
  )

  const renderActions = useCallback(
    (employee: EmployeeFull) => (
      <ActionCell
        actions={[
          {
            icon: SquarePen,
            label: t('actionEdit'),
            onClick: () => setExpandedEmployee(employee.id),
          },
          ...(employee.status !== 'terminated'
            ? [
                {
                  icon: Calculator,
                  label: '資遣試算',
                  onClick: () => setSeveranceEmployee(employee),
                },
                {
                  icon: UserX,
                  label: t('actionTerminate'),
                  onClick: () => handleTerminateEmployee(employee),
                  variant: 'danger' as const,
                },
              ]
            : []),
          // 永久刪除（不分在職 / 離職都可、給操作錯誤的補救用）
          {
            icon: Trash2,
            label: t('actionDelete'),
            onClick: () => handleDeleteEmployee(employee),
            variant: 'danger' as const,
          },
        ]}
      />
    ),
    []
  )

  return (
    <>
      <ListPageLayout
        title={t('manage3470')}
        icon={Users}
        statusTabs={HR_ADMIN_TABS.employee}
        activeStatusTab="/hr"
        onStatusTabChange={href => router.push(href)}
        data={filteredEmployees}
        columns={columns}
        searchFields={
          ['chinese_name', 'display_name', 'employee_number', 'personal_info'] as (keyof EmployeeFull)[]
        }
        searchPlaceholder={t('searchPlaceholder')}
        onRowClick={handleEmployeeClick}
        renderActions={renderActions}
        actionsWidth="280px"
        bordered={true}
        defaultSort={{ key: 'employee_number', direction: 'asc' }}
        primaryAction={{
          label: t('addEmployee'),
          icon: Plus,
          onClick: () => setIsAddDialogOpen(true),
        }}
      />

      {expandedEmployee && (
        <Dialog open={true} onOpenChange={() => setExpandedEmployee(null)}>
          <DialogContent
            level={1}
            className="max-w-6xl h-[90vh] p-0 bg-transparent shadow-none border-none"
          >
            <DialogTitle className="sr-only">{t('editEmployee')}</DialogTitle>
            <EmployeeForm
              employeeId={expandedEmployee}
              onSubmit={() => {
                setExpandedEmployee(null)
                fetchAll()
                void invalidateEmployees() // 編輯後其他頁下拉同步更新
              }}
              onCancel={() => setExpandedEmployee(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent
          level={1}
          className="max-w-6xl h-[90vh] p-0 bg-transparent shadow-none border-none"
        >
          <DialogTitle className="sr-only">{t('addEmployee')}</DialogTitle>
          <EmployeeForm
            onSubmit={() => {
              setIsAddDialogOpen(false)
              fetchAll()
              void invalidateEmployees() // 新增後其他頁下拉同步更新
            }}
            onCancel={() => {
              setIsAddDialogOpen(false)
            }}
          />
        </DialogContent>
      </Dialog>

      <SeveranceCalculatorDialog
        open={!!severanceEmployee}
        onOpenChange={open => {
          if (!open) setSeveranceEmployee(null)
        }}
        employee={severanceEmployee}
      />

      <ConfirmDialog {...confirmDialogProps} />
    </>
  )
}
