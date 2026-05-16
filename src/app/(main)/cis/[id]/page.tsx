'use client'

/**
 * 漫途 CIS 客戶詳情頁
 *
 * 結構：
 *   - 客戶 header（公司名 / 聯絡人 / 狀態 / 編輯）
 *   - 品牌資料卡聚合（多次拜訪累積到的內容）
 *   - 拜訪 timeline + 「新增拜訪」
 */

import { useState, useMemo, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  ArrowLeft,
  Edit,
  Plus,
  Phone,
  Mail,
  MapPin as MapPinIcon,
  Building2,
  Palette,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'

import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Button } from '@/components/ui/button'
import { confirm } from '@/lib/ui/alert-dialog'

import {
  useCisClient,
  useCisVisits,
  useCisPricingItems,
  updateCisClient,
  createCisVisit,
  updateCisVisit,
  deleteCisVisit,
  invalidateCisVisits,
  invalidateCisClients,
} from '@/data'
import type { CisClient, CisVisit, CisClientStatus } from '@/types/cis.types'
import { CIS_CLIENT_STATUS_OPTIONS } from '@/types/cis.types'

const PAGE_LABELS = {
  BACK_TO_LIST: '返回列表',
  VISIT_DELETE_SUCCESS: '已刪除拜訪紀錄',
  VISIT_DELETE_FAILED: '刪除失敗，請稍後再試',
  DELETE_FAILED_PREFIX: '刪除失敗：',
} as const

import { CisClientDialog } from '../components/CisClientDialog'
import { BrandCardSummary } from './components/BrandCardSummary'
import { VisitTimeline } from './components/VisitTimeline'
import { CisVisitDialog } from './components/CisVisitDialog'
import { PricingDraftDialog } from './components/PricingDraftDialog'

const STATUS_CLASS_MAP: Record<CisClientStatus, string> = {
  lead: 'text-morandi-gold bg-status-warning-bg',
  active: 'text-status-success bg-status-success-bg',
  closed: 'text-morandi-secondary bg-morandi-muted/20',
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default function CisClientDetailPage({ params }: PageProps) {
  const t = useTranslations('cis')
  const { id } = use(params)
  const router = useRouter()

  const STATUS_LABEL_MAP: Record<CisClientStatus, string> = {
    lead: t('statusLead'),
    active: t('statusActive'),
    closed: t('statusClosed'),
  }

  const { item: client, refresh: refreshClient } = useCisClient(id)
  const { items: allVisits, refresh: refreshVisits } = useCisVisits()
  const { items: pricingItems, loading: pricingLoading } = useCisPricingItems()

  const visits = useMemo(
    () => allVisits.filter(v => v.client_id === id),
    [allVisits, id]
  )

  const [clientDialogOpen, setClientDialogOpen] = useState(false)
  const [visitDialogOpen, setVisitDialogOpen] = useState(false)
  const [editingVisit, setEditingVisit] = useState<CisVisit | null>(null)
  const [visitMode, setVisitMode] = useState<'create' | 'edit'>('create')
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false)

  const openCreateVisit = useCallback(() => {
    setEditingVisit(null)
    setVisitMode('create')
    setVisitDialogOpen(true)
  }, [])

  const openEditVisit = useCallback((v: CisVisit) => {
    setEditingVisit(v)
    setVisitMode('edit')
    setVisitDialogOpen(true)
  }, [])

  const handleDeleteVisit = useCallback(
    async (v: CisVisit) => {
      const ok = await confirm(t('visitConfirmDelete'), {
        title: t('visitConfirmDeleteTitle'),
        type: 'warning',
        confirmText: t('btnDelete'),
        cancelText: t('btnCancel'),
      })
      if (!ok) return
      try {
        await deleteCisVisit(v.id)
        toast.success(PAGE_LABELS.VISIT_DELETE_SUCCESS)
        await refreshVisits()
      } catch {
        toast.error(PAGE_LABELS.VISIT_DELETE_FAILED)
      }
    },
    [refreshVisits]
  )

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-10 text-center">
        <Building2 size={32} className="text-morandi-muted" />
        <p className="text-sm text-morandi-secondary">找不到此客戶（或仍在載入）</p>
        <Button onClick={() => router.push('/cis')} variant="soft-gold" size="sm">
          <ArrowLeft size={14} className="mr-1" />
          回列表
        </Button>
      </div>
    )
  }

  return (
    <ContentPageLayout
      title={client.company_name}
      icon={Palette}
      headerActions={
        <div className="flex items-center gap-2">
          <Button
            variant="header-outline"
            size="sm"
            onClick={() => router.push('/cis')}
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline ml-1">{PAGE_LABELS.BACK_TO_LIST}</span>
          </Button>
          <Button
            variant="header-outline"
            size="sm"
            onClick={() => setQuoteDialogOpen(true)}
          >
            <Sparkles size={14} />
            <span className="hidden sm:inline ml-1">{t('quoteBtnGenerate')}</span>
          </Button>
        </div>
      }
      primaryAction={{
        label: t('titleEdit'),
        icon: Edit,
        onClick: () => setClientDialogOpen(true),
      }}
    >
      <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 space-y-5">
        {/* 客戶基本卡 */}
        <ClientHeaderCard client={client} />

        {/* 品牌資料卡聚合 */}
        <Card title={t('titleBrandCard')}>
          <BrandCardSummary visits={visits} />
        </Card>

        {/* 拜訪 timeline */}
        <Card
          title={t('visitSectionTitle')}
          actions={
            <Button size="sm" onClick={openCreateVisit}>
              <Plus size={14} />
              <span className="ml-1">{t('visitBtnAdd')}</span>
            </Button>
          }
        >
          <VisitTimeline visits={visits} onEdit={openEditVisit} onDelete={handleDeleteVisit} />
        </Card>
      </div>

      {/* 客戶編輯 dialog */}
      <CisClientDialog
        open={clientDialogOpen}
        onOpenChange={setClientDialogOpen}
        mode="edit"
        initialClient={client}
        statusOptions={CIS_CLIENT_STATUS_OPTIONS}
        onSubmit={async data => {
          await updateCisClient(client.id, data)
          await invalidateCisClients()
          await refreshClient()
        }}
      />

      {/* 報價草案 dialog */}
      <PricingDraftDialog
        open={quoteDialogOpen}
        onOpenChange={setQuoteDialogOpen}
        visits={visits}
        pricingItems={pricingItems}
        pricingLoading={pricingLoading}
      />

      {/* 拜訪 dialog */}
      <CisVisitDialog
        open={visitDialogOpen}
        onOpenChange={setVisitDialogOpen}
        mode={visitMode}
        clientId={client.id}
        initialVisit={editingVisit}
        onSubmit={async data => {
          if (visitMode === 'create') {
            await createCisVisit(data)
          } else if (editingVisit) {
            await updateCisVisit(editingVisit.id, data)
          }
          await invalidateCisVisits()
          await refreshVisits()
        }}
      />
    </ContentPageLayout>
  )
}

function ClientHeaderCard({ client }: { client: CisClient }) {
  const t = useTranslations('cis')
  const STATUS_LABEL_MAP: Record<CisClientStatus, string> = {
    lead: t('statusLead'),
    active: t('statusActive'),
    closed: t('statusClosed'),
  }
  return (
    <div className="rounded-md border border-morandi-muted/20 bg-card p-4 grid gap-3">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="space-y-1">
          <div className="text-xs text-morandi-secondary font-mono">{client.code}</div>
          <h2 className="text-lg font-semibold text-morandi-primary">{client.company_name}</h2>
        </div>
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded ${STATUS_CLASS_MAP[client.status]}`}
        >
          {STATUS_LABEL_MAP[client.status]}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-xs">
        {client.contact_name && (
          <InfoRow icon={Building2} label="聯絡人" value={client.contact_name} />
        )}
        {client.phone && <InfoRow icon={Phone} label="電話" value={client.phone} />}
        {client.email && <InfoRow icon={Mail} label="Email" value={client.email} />}
        {client.address && <InfoRow icon={MapPinIcon} label="地址" value={client.address} />}
      </div>

      {(client.travel_types?.length || client.tags?.length) && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {client.travel_types?.map(t => (
            <span
              key={`tt-${t}`}
              className="text-[0.647rem] px-2 py-0.5 rounded-full bg-morandi-gold/15 text-morandi-gold"
            >
              {t}
            </span>
          ))}
          {client.tags?.map(t => (
            <span
              key={`tag-${t}`}
              className="text-[0.647rem] px-2 py-0.5 rounded-full bg-morandi-muted/20 text-morandi-secondary"
            >
              #{t}
            </span>
          ))}
        </div>
      )}

      {client.notes?.trim() && (
        <p className="text-xs text-morandi-secondary border-l-2 border-morandi-muted/30 pl-2 py-0.5">
          {client.notes}
        </p>
      )}
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-1.5">
      <Icon size={12} className="text-morandi-secondary mt-0.5 shrink-0" />
      <div>
        <div className="text-morandi-secondary text-[0.588rem]">{label}</div>
        <div className="text-morandi-primary">{value}</div>
      </div>
    </div>
  )
}

function Card({
  title,
  actions,
  children,
}: {
  title: string
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-md border border-morandi-muted/20 bg-card p-4">
      <header className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-sm font-semibold text-morandi-primary">{title}</h3>
        {actions}
      </header>
      <div>{children}</div>
    </section>
  )
}
