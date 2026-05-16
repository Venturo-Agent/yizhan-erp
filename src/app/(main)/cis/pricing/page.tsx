'use client'

/**
 * 漫途 CIS — 衍生項目價目表設定頁
 *
 * 對應 vault B 第四章「旅遊業 CIS 衍生項目清單」
 * 漫途自編價目、之後拜訪 brand_card.priority_needs 會自動 match
 */

import { useState, useMemo, useCallback } from 'react'
import { Plus, Edit, Trash2, Coins } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { EnhancedTable, TableColumn } from '@/components/ui/enhanced-table'
import { confirm } from '@/lib/ui/alert-dialog'

import {
  useCisPricingItems,
  createCisPricingItem,
  updateCisPricingItem,
  deleteCisPricingItem,
  invalidateCisPricingItems,
} from '@/data'
import type { CisPricingItem, CisPricingCategory } from '@/types/cis.types'
import { CIS_PRICING_CATEGORY_OPTIONS } from '@/types/cis.types'

import { CisPricingItemDialog } from './components/CisPricingItemDialog'

const PAGE_LABELS = {
  ACTIVE: '啟用',
  INACTIVE: '停用',
  DELETE_DIALOG_TITLE: '刪除衍生項目',
  DELETE_SUCCESS: '已刪除項目',
  DELETE_FAILED: '刪除失敗，請稍後再試',
  DELETE_FAILED_PREFIX: '刪除失敗：',
} as const

const CATEGORY_LABEL: Record<CisPricingCategory, string> = Object.fromEntries(
  CIS_PRICING_CATEGORY_OPTIONS.map(o => [o.value, o.label])
) as Record<CisPricingCategory, string>

const CATEGORY_CLASS: Record<CisPricingCategory, string> = {
  identity: 'bg-morandi-gold/15 text-morandi-gold',
  print: 'bg-status-info-bg text-status-info',
  digital: 'bg-status-success-bg text-status-success',
  physical: 'bg-status-warning-bg text-status-warning',
  uniform: 'bg-morandi-muted/20 text-morandi-secondary',
  other: 'bg-morandi-muted/15 text-morandi-secondary',
}

function formatPrice(low?: number | null, high?: number | null) {
  if (low == null && high == null) return '-'
  const fmt = (n: number) => n.toLocaleString('zh-TW')
  if (low != null && high != null) return `${fmt(low)} ~ ${fmt(high)}`
  return fmt((low ?? high) as number)
}

export default function CisPricingPage() {
  const t = useTranslations('cis')
  const [searchQuery, setSearchQuery] = useState('')
  const { items: pricingItems, refresh } = useCisPricingItems()

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return pricingItems
    return pricingItems.filter(
      i =>
        i.name?.toLowerCase().includes(q) ||
        i.code?.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q)
    )
  }, [pricingItems, searchQuery])

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [editingItem, setEditingItem] = useState<CisPricingItem | null>(null)

  const openCreate = useCallback(() => {
    setEditingItem(null)
    setDialogMode('create')
    setDialogOpen(true)
  }, [])

  const openEdit = useCallback((item: CisPricingItem) => {
    setEditingItem(item)
    setDialogMode('edit')
    setDialogOpen(true)
  }, [])

  const handleDelete = useCallback(
    async (item: CisPricingItem) => {
      const ok = await confirm(t('confirmDeleteMessage', { name: item.name }), {
        title: PAGE_LABELS.DELETE_DIALOG_TITLE,
        type: 'warning',
        confirmText: t('btnDelete'),
        cancelText: t('btnCancel'),
      })
      if (!ok) return
      try {
        await deleteCisPricingItem(item.id)
        toast.success(PAGE_LABELS.DELETE_SUCCESS)
        await refresh()
      } catch {
        toast.error(PAGE_LABELS.DELETE_FAILED)
      }
    },
    [refresh]
  )

  const columns: TableColumn<CisPricingItem>[] = useMemo(
    () => [
      {
        key: 'code',
        label: t('pricingColCode'),
        sortable: true,
        render: (_v, i) => (
          <span className="text-xs text-morandi-secondary font-mono">{i.code}</span>
        ),
      },
      {
        key: 'category',
        label: t('pricingColCategory'),
        sortable: true,
        render: (_v, i) => (
          <span className={`text-[0.647rem] px-2 py-0.5 rounded ${CATEGORY_CLASS[i.category]}`}>
            {CATEGORY_LABEL[i.category]}
          </span>
        ),
      },
      {
        key: 'name',
        label: t('pricingColName'),
        sortable: true,
        render: (_v, i) => (
          <div>
            <div className="text-sm font-medium text-morandi-primary">{i.name}</div>
            {i.description && (
              <div className="text-[0.647rem] text-morandi-secondary mt-0.5">{i.description}</div>
            )}
          </div>
        ),
      },
      {
        key: 'unit',
        label: t('pricingColUnit'),
        render: (_v, i) => (
          <span className="text-xs text-morandi-secondary">{i.unit}</span>
        ),
      },
      {
        key: 'price',
        label: t('pricingColPrice'),
        render: (_v, i) => (
          <span className="text-xs text-morandi-primary tabular-nums font-mono">
            {formatPrice(i.price_low, i.price_high)}
          </span>
        ),
      },
      {
        key: 'match_keywords',
        label: t('pricingColKeywords'),
        render: (_v, i) => (
          <div className="flex flex-wrap gap-1">
            {(i.match_keywords || []).slice(0, 4).map(k => (
              <span
                key={k}
                className="text-[0.588rem] px-1.5 py-0.5 rounded bg-morandi-muted/15 text-morandi-secondary"
              >
                {k}
              </span>
            ))}
            {(i.match_keywords?.length ?? 0) > 4 && (
              <span className="text-[0.588rem] text-morandi-secondary">
                +{(i.match_keywords?.length ?? 0) - 4}
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'is_active',
        label: t('pricingColActive'),
        sortable: true,
        render: (_v, i) =>
          i.is_active ? (
            <span className="text-[0.647rem] text-status-success">{PAGE_LABELS.ACTIVE}</span>
          ) : (
            <span className="text-[0.647rem] text-morandi-secondary">{PAGE_LABELS.INACTIVE}</span>
          ),
      },
    ],
    []
  )

  return (
    <ContentPageLayout
      title={t('pricingPageTitle')}
      icon={Coins}
      showSearch
      searchTerm={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder={t('pricingSearchPlaceholder')}
      primaryAction={{
        label: t('pricingBtnAdd'),
        icon: Plus,
        onClick: openCreate,
      }}
    >
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0">
          <EnhancedTable
            columns={columns}
            data={filtered}
            emptyMessage={t('pricingEmptyState')}
            actions={(item: CisPricingItem) => (
              <div className="flex items-center gap-1">
                <button
                  className="p-1 text-morandi-secondary hover:text-morandi-gold hover:bg-morandi-gold/10 rounded transition-colors"
                  title={t('pricingEdit')}
                  onClick={() => openEdit(item)}
                >
                  <Edit size={14} />
                </button>
                <button
                  className="p-1 text-morandi-secondary hover:text-status-danger hover:bg-status-danger-bg rounded transition-colors"
                  title={t('pricingDelete')}
                  onClick={() => handleDelete(item)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          />
        </div>
      </div>

      <CisPricingItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        initialItem={editingItem}
        onSubmit={async data => {
          if (dialogMode === 'create') {
            await createCisPricingItem(data)
          } else if (editingItem) {
            await updateCisPricingItem(editingItem.id, data)
          }
          await invalidateCisPricingItems()
          await refresh()
        }}
      />
    </ContentPageLayout>
  )
}
