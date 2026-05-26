'use client'

/**
 * /marketing/website
 *
 * 官網行程上架管理列表頁。
 *
 * 業務動作：
 *   1. 看哪些團「上架中」（is_public_listed = true）
 *   2. 切換上架狀態（switch、call PUT /api/marketing/website/[code]）
 *   3. 點「編輯」進詳情頁（marketing_* / seo_* / hero_image_url）
 *   4. 按右上「重新發布官網」、call POST /api/marketing/website/rebuild → 觸發 Astro rebuild
 *
 * 防連點：所有按鈕 + switch disabled={loading}
 */

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Megaphone, RefreshCw, Edit, ExternalLink, Loader2 } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { ACTION_BUTTON_BASE, ACTION_BUTTON_DEFAULT_TONE } from '@/components/table-cells'
import { cn } from '@/lib/utils'
import { ListPageLayout, type BreadcrumbItem } from '@/components/layout/list-page-layout'
import type { TableColumn } from '@/components/ui/enhanced-table'
import { useWebsiteTours, invalidateWebsiteTours } from '@/data'
import { apiMutate } from '@/lib/swr/api-mutate'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

interface WebsiteTourRow {
  id: string
  code: string
  name: string
  departure_date: string | null
  return_date: string | null
  is_public_listed: boolean
  published_at: string | null
  hero_image_url: string | null
  marketing_title: string | null
  marketing_subtitle: string | null
}

const BREADCRUMB: BreadcrumbItem[] = [
  { label: '行銷管理', href: '/marketing/website' },
  { label: '官網管理', href: '/marketing/website' },
]

function formatDate(d: string | null): string {
  if (!d) return '—'
  return d.slice(0, 10)
}

export default function MarketingWebsitePage() {
  const router = useRouter()
  const { items: tours, loading: isLoading } = useWebsiteTours()
  const [togglingCode, setTogglingCode] = useState<string | null>(null)
  const [rebuilding, setRebuilding] = useState(false)

  const rows = useMemo<WebsiteTourRow[]>(
    () =>
      (tours as unknown as WebsiteTourRow[]).map(t => ({
        id: t.id,
        code: t.code,
        name: t.name,
        departure_date: t.departure_date,
        return_date: t.return_date,
        is_public_listed: t.is_public_listed,
        published_at: t.published_at,
        hero_image_url: t.hero_image_url,
        marketing_title: t.marketing_title,
        marketing_subtitle: t.marketing_subtitle,
      })),
    [tours]
  )

  const handleToggleListed = useCallback(
    async (row: WebsiteTourRow, next: boolean) => {
      if (togglingCode) return
      setTogglingCode(row.code)
      try {
        const res = await apiMutate(`/api/marketing/website/${row.code}`, {
          method: 'PUT',
          body: { is_public_listed: next },
        })
        if (!res.ok) {
          toast.error(res.error || '切換失敗')
          return
        }
        toast.success(next ? `已上架「${row.code}」` : `已下架「${row.code}」`)
        await invalidateWebsiteTours()
      } catch (err) {
        logger.error('toggle is_public_listed failed', err)
        toast.error('切換失敗')
      } finally {
        setTogglingCode(null)
      }
    },
    [togglingCode]
  )

  const handleRebuild = useCallback(async () => {
    if (rebuilding) return
    setRebuilding(true)
    try {
      const res = await apiMutate<{ triggered_at: string; status: string; detail?: string }>(
        '/api/marketing/website/rebuild',
        { method: 'POST' }
      )
      if (res.ok && res.data?.status === 'triggered') {
        toast.success('已觸發官網重新部署、約 1-3 分鐘後生效')
      } else if (res.data?.status === 'not_configured') {
        toast.warning(res.data.detail || '尚未設定部署 webhook')
      } else {
        toast.error(res.error || res.data?.detail || '觸發失敗')
      }
    } catch (err) {
      logger.error('rebuild failed', err)
      toast.error('觸發失敗')
    } finally {
      setRebuilding(false)
    }
  }, [rebuilding])

  const columns = useMemo<TableColumn<WebsiteTourRow>[]>(
    () => [
      {
        key: 'code',
        label: '團號',
        width: '120px',
        render: value => (
          <span className="text-sm font-mono text-morandi-primary">{String(value)}</span>
        ),
      },
      {
        key: 'name',
        label: '團名',
        render: (_value, row) => (
          <div className="min-w-0">
            <div className="text-sm text-morandi-primary truncate">{row.name}</div>
            {row.marketing_title && (
              <div className="text-xs text-morandi-muted truncate">
                官網標題：{row.marketing_title}
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'departure_date',
        label: '出發 / 回程',
        width: '180px',
        render: (_value, row) => (
          <div className="text-xs text-morandi-secondary">
            <div>{formatDate(row.departure_date)}</div>
            <div className="text-morandi-muted">→ {formatDate(row.return_date)}</div>
          </div>
        ),
      },
      {
        key: 'is_public_listed',
        label: '官網上架',
        width: '140px',
        align: 'center',
        render: (_value, row) => {
          const busy = togglingCode === row.code
          return (
            <div className="flex items-center justify-center gap-2">
              <Switch
                checked={row.is_public_listed}
                disabled={busy}
                onCheckedChange={next => handleToggleListed(row, next)}
              />
              {busy && <Loader2 className="w-3 h-3 animate-spin text-morandi-muted" />}
            </div>
          )
        },
      },
      {
        key: 'published_at',
        label: '最近發布',
        width: '140px',
        render: value => (
          <span className="text-xs text-morandi-muted">
            {value ? formatDate(value as string) : '尚未發布'}
          </span>
        ),
      },
    ],
    [togglingCode, handleToggleListed]
  )

  return (
    <ListPageLayout
      title="官網管理"
      icon={Megaphone}
      breadcrumb={BREADCRUMB}
      data={rows}
      loading={isLoading}
      columns={columns}
      searchable
      searchPlaceholder="搜尋團號 / 團名"
      searchFields={['code', 'name', 'marketing_title']}
      actionsWidth="160px"
      renderActions={row => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/marketing/website/${row.code}`)}
            disabled={togglingCode === row.code}
            className={cn(ACTION_BUTTON_BASE, ACTION_BUTTON_DEFAULT_TONE)}
          >
            <Edit size="0.95em" />
            編輯
          </Button>
          {row.is_public_listed && (
            <a
              href={`https://corner.venturo.tw/tours/${row.code}`}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(ACTION_BUTTON_BASE, ACTION_BUTTON_DEFAULT_TONE)}
            >
              <ExternalLink size="0.95em" />
              預覽
            </a>
          )}
        </div>
      )}
      headerActions={
        <Button variant="outline" size="sm" onClick={handleRebuild} disabled={rebuilding}>
          {rebuilding ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          重新發布官網
        </Button>
      }
      emptyMessage="尚無旅遊團、開團後即可在這裡管理官網上架"
    />
  )
}
