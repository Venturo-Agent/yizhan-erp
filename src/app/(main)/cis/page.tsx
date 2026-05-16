'use client'

/**
 * 漫途 CIS 工作流 — 客戶列表頁
 *
 * 規範：
 *   - 多租戶：workspace_features('cis') + role_capabilities('cis.clients.*') 雙保險
 *   - 預設 15 筆分頁（root CLAUDE.md 五大方向 #5）
 *   - server-side search（公司名 / 聯絡人 / 電話）
 *   - 防連點：所有寫入按鈕 disabled={loading}
 */

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit, Trash2, Palette } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { EnhancedTable, TableColumn } from '@/components/ui/enhanced-table'
import { confirm } from '@/lib/ui/alert-dialog'
import { DateCell } from '@/components/table-cells'

import {
  useCisClientsPaginated,
  createCisClient,
  updateCisClient,
  deleteCisClient,
} from '@/data'
import type { CisClient, CisClientStatus } from '@/types/cis.types'
import { CIS_CLIENT_STATUS_OPTIONS } from '@/types/cis.types'

import { CisClientDialog } from './components/CisClientDialog'

const PAGE_SIZE = 15

const STATUS_CLASS_MAP: Record<CisClientStatus, string> = {
  lead: 'text-morandi-gold bg-status-warning-bg',
  active: 'text-status-success bg-status-success-bg',
  closed: 'text-morandi-secondary bg-morandi-muted/20',
}

export default function CisListPage() {
  const t = useTranslations('cis')
  const router = useRouter()

  const STATUS_LABEL_MAP: Record<CisClientStatus, string> = {
    lead: t('statusLead'),
    active: t('statusActive'),
    closed: t('statusClosed'),
  }
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)

  const {
    items: clients,
    totalCount,
    refresh,
  } = useCisClientsPaginated({
    page,
    pageSize: PAGE_SIZE,
    search: searchQuery.trim() || undefined,
    searchFields: ['company_name', 'contact_name', 'phone'],
    sortBy: 'created_at',
    sortOrder: 'desc',
  })

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [editingClient, setEditingClient] = useState<CisClient | null>(null)

  const openCreateDialog = useCallback(() => {
    setEditingClient(null)
    setDialogMode('create')
    setDialogOpen(true)
  }, [])

  const openEditDialog = useCallback((client: CisClient) => {
    setEditingClient(client)
    setDialogMode('edit')
    setDialogOpen(true)
  }, [])

  const handleDelete = useCallback(
    async (client: CisClient) => {
      const ok = await confirm(t('confirmDeleteMessage', { name: client.company_name }), {
        title: t('confirmDeleteTitle'),
        type: 'warning',
        confirmText: t('btnDelete'),
        cancelText: t('btnCancel'),
      })
      if (!ok) return
      try {
        await deleteCisClient(client.id)
        toast.success(t('toastDeleteSuccess'))
        await refresh()
      } catch {
        toast.error(t('toastDeleteFailed'))
      }
    },
    [refresh]
  )

  const handleRowClick = useCallback(
    (client: CisClient) => {
      router.push(`/cis/${client.id}`)
    },
    [router]
  )

  const columns: TableColumn<CisClient>[] = useMemo(
    () => [
      {
        key: 'code',
        label: t('colCode'),
        sortable: true,
        render: (_v, c) => (
          <span className="text-xs text-morandi-secondary font-mono">{c.code}</span>
        ),
      },
      {
        key: 'company_name',
        label: t('colCompany'),
        sortable: true,
        render: (_v, c) => (
          <div className="text-sm font-medium text-morandi-primary">{c.company_name}</div>
        ),
      },
      {
        key: 'contact_name',
        label: t('colContact'),
        render: (_v, c) => (
          <div className="text-xs text-morandi-primary">{c.contact_name || '-'}</div>
        ),
      },
      {
        key: 'phone',
        label: t('colPhone'),
        render: (_v, c) => (
          <div className="text-xs text-morandi-primary">{c.phone || '-'}</div>
        ),
      },
      {
        key: 'travel_types',
        label: t('colTravelTypes'),
        render: (_v, c) => (
          <div className="flex flex-wrap gap-1">
            {c.travel_types?.length ? (
              c.travel_types.slice(0, 3).map(tType => (
                <span
                  key={tType}
                  className="text-[0.588rem] px-1.5 py-0.5 rounded bg-morandi-muted/20 text-morandi-secondary"
                >
                  {tType}
                </span>
              ))
            ) : (
              <span className="text-xs text-morandi-secondary">-</span>
            )}
            {c.travel_types?.length > 3 && (
              <span className="text-[0.588rem] text-morandi-secondary">+{c.travel_types.length - 3}</span>
            )}
          </div>
        ),
      },
      {
        key: 'status',
        label: t('colStatus'),
        sortable: true,
        render: (_v, c) => (
          <span
            className={`text-[0.647rem] font-medium px-2 py-0.5 rounded ${STATUS_CLASS_MAP[c.status]}`}
          >
            {STATUS_LABEL_MAP[c.status]}
          </span>
        ),
      },
      {
        key: 'updated_at',
        label: t('colUpdated'),
        sortable: true,
        render: (_v, c) => (
          <DateCell
            date={c.updated_at}
            showIcon={false}
            className="text-xs text-morandi-secondary"
          />
        ),
      },
    ],
    []
  )

  return (
    <ContentPageLayout
      title={t('pageTitle')}
      icon={Palette}
      showSearch
      searchTerm={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder={t('searchPlaceholder')}
      primaryAction={{
        label: t('btnAddClient'),
        icon: Plus,
        onClick: openCreateDialog,
      }}
    >
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0">
          <EnhancedTable
            columns={columns}
            data={clients}
            serverPagination={{
              currentPage: page,
              pageSize: PAGE_SIZE,
              totalCount,
              onPageChange: setPage,
            }}
            onRowClick={handleRowClick}
            emptyMessage={t('emptyState')}
            actions={(client: CisClient) => (
              <div className="flex items-center gap-1">
                <button
                  className="p-1 text-morandi-secondary hover:text-morandi-gold hover:bg-morandi-gold/10 rounded transition-colors"
                  title={t('titleEdit')}
                  onClick={e => {
                    e.stopPropagation()
                    openEditDialog(client)
                  }}
                >
                  <Edit size={14} />
                </button>
                <button
                  className="p-1 text-morandi-secondary hover:text-status-danger hover:bg-status-danger-bg rounded transition-colors"
                  title={t('titleDelete')}
                  onClick={e => {
                    e.stopPropagation()
                    handleDelete(client)
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          />
        </div>
      </div>

      <CisClientDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        initialClient={editingClient}
        statusOptions={CIS_CLIENT_STATUS_OPTIONS}
        onSubmit={async data => {
          if (dialogMode === 'create') {
            await createCisClient(data)
          } else if (editingClient) {
            await updateCisClient(editingClient.id, data)
          }
          await refresh()
        }}
      />
    </ContentPageLayout>
  )
}
