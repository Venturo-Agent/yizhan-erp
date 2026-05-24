'use client'

import { useState, useEffect, useCallback } from 'react'
import { Archive, RotateCcw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { EnhancedTable } from '@/components/ui/enhanced-table'
import { DateCell, ActionCell } from '@/components/table-cells'
import { confirm } from '@/lib/ui/alert-dialog'
import { supabase } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import { logger } from '@/lib/utils/logger'
import { deleteTour as deleteTourEntity, updateTour } from '@/data'
import {
  checkTourDependencies,
  deleteTourEmptyOrders,
  unlinkTourQuotes,
  unlinkTourItineraries,
} from '@/app/(main)/tours/_services/tour_dependency.service'

interface ArchivedTour {
  id: string
  code: string
  name: string | null
  location: string | null
  departure_date: string | null
  return_date: string | null
  archived: boolean | null
  updated_at: string | null
}

export default function ArchiveManagementPage() {
  const t = useTranslations('library')
  const [archivedTours, setArchivedTours] = useState<ArchivedTour[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadArchivedData = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data: tours, error: toursError } = await supabase
        .from('tours')
        .select('id, code, name, location, departure_date, return_date, archived, updated_at')
        .eq('archived', true)
        .order('updated_at', { ascending: false })

      if (toursError) throw toursError
      setArchivedTours(tours || [])
    } catch (error) {
      logger.error('Load archived data failed:', error)
      toast.error(t('archiveLoadError'))
    } finally {
      setIsLoading(false)
    }
  }, [t])

  useEffect(() => {
    loadArchivedData()
  }, [loadArchivedData])

  // 還原旅遊團
  const handleRestoreTour = async (tour: ArchivedTour) => {
    const confirmed = await confirm(t('archiveConfirmRestoreTour', { code: tour.code }), {
      title: t('archiveConfirmRestoreTourTitle'),
      type: 'warning',
    })
    if (!confirmed) return

    try {
      // 5/24：改走 updateTour entity hook（自動失效主 tours 列表、還原後即時反映、不只刷本頁）
      await updateTour(tour.id, { archived: false })

      toast.success(t('archiveToastTourRestored', { code: tour.code }))
      loadArchivedData()
    } catch (error) {
      logger.error('Restore failed:', error)
      toast.error(t('archiveToastRestoreError'))
    }
  }

  // 永久刪除旅遊團
  const handleDeleteTour = async (tour: ArchivedTour) => {
    const { blockers, hasBlockers } = await checkTourDependencies(tour.id)

    if (hasBlockers) {
      toast.error(t('archiveCannotDeleteBlockers', { blockers: blockers.join('、') }))
      return
    }

    const confirmed = await confirm(t('archiveConfirmDeleteTour', { code: tour.code }), {
      title: t('archiveConfirmDeleteTitle'),
      type: 'warning',
    })
    if (!confirmed) return

    try {
      // 清理關聯資料
      await supabase.from('tour_itinerary_items').delete().eq('tour_id', tour.id)
      await supabase.from('calendar_events').delete().eq('related_tour_id', tour.id)
      await unlinkTourQuotes(tour.id)
      await unlinkTourItineraries(tour.id)
      await deleteTourEmptyOrders(tour.id)
      await deleteTourEntity(tour.id)
      toast.success(t('archiveToastTourDeleted', { code: tour.code }))
      loadArchivedData()
    } catch (error) {
      logger.error('Delete failed:', error)
      toast.error(t('archiveToastDeleteError'))
    }
  }

  const tourColumns = [
    {
      key: 'code',
      label: t('archiveColCode'),
      width: '140px',
      render: (_: unknown, row: ArchivedTour) => (
        <span className="font-medium text-morandi-primary">{row.code}</span>
      ),
    },
    {
      key: 'name',
      label: t('archiveColName'),
      render: (_: unknown, row: ArchivedTour) => (
        <span className="text-morandi-secondary">{row.name || row.location || '-'}</span>
      ),
    },
    {
      key: 'departure_date',
      label: t('archiveColDepartureDate'),
      width: '120px',
      render: (_: unknown, row: ArchivedTour) => <DateCell date={row.departure_date} />,
    },
    {
      key: 'updated_at',
      label: t('archiveColArchivedTime'),
      width: '120px',
      render: (_: unknown, row: ArchivedTour) => (
        <span className="text-sm text-morandi-secondary">
          {row.updated_at ? formatDate(row.updated_at) : '-'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      width: '100px',
      render: (_: unknown, row: ArchivedTour) => (
        <ActionCell
          actions={[
            {
              icon: RotateCcw,
              label: t('archiveActionRestore'),
              onClick: () => handleRestoreTour(row),
            },
            {
              icon: Trash2,
              label: t('archiveActionDeletePermanent'),
              onClick: () => handleDeleteTour(row),
              variant: 'danger',
            },
          ]}
        />
      ),
    },
  ]

  return (
    <ContentPageLayout
      title={t('archivePageTitle')}
      icon={Archive}
      breadcrumb={[
        { label: t('archiveBreadcrumbHome'), href: '/dashboard' },
        { label: t('archiveBreadcrumbLibrary'), href: '/library' },
        { label: t('archiveBreadcrumbArchive'), href: '/library/archive-management' },
      ]}
      contentClassName="flex-1 overflow-hidden"
    >
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-morandi-gold" />
        </div>
      ) : archivedTours.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-morandi-secondary">
          <Archive className="h-12 w-12 mb-4 opacity-30" />
          <p>{t('archiveEmptyArchivedTours')}</p>
        </div>
      ) : (
        <EnhancedTable columns={tourColumns} data={archivedTours} />
      )}
    </ContentPageLayout>
  )
}
