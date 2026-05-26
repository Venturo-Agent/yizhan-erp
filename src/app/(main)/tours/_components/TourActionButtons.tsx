'use client'
/**
 * TourActionButtons - 旅遊團操作按鈕（狀態感知）
 *
 * 按鈕按 tour.status 分組顯示（編輯永遠第一、跟訂單列表對齊）：
 *   template   → 編輯 + 複製 + 封存 + 刪除
 *   proposal   → 編輯 + 開團 + 封存 + 刪除
 *   正式團      → 編輯 + 報名 + 封存 + 刪除
 *                （upcoming / ongoing / returned / closed）
 *
 * 「結案」在詳細頁觸發、不在列表按鈕。
 */

import { useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Archive, ArchiveRestore, Trash2, Edit2, Copy, Send, UserPlus } from 'lucide-react'
import { Tour, EmployeeFull } from '@/stores/types'
import { TOUR_STATUS } from '@/lib/constants/status-maps'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ACTION_BUTTON_BASE, ACTION_BUTTON_DEFAULT_TONE } from '@/components/table-cells'
import { useRouter } from 'next/navigation'

interface UseTourActionButtonsParams {
  quotes: unknown[]
  activeStatusTab: string
  user: EmployeeFull | null
  operations: {
    handleArchiveTour: (tour: Tour, reason?: string) => Promise<void>
  }
  onEditTour: (tour: Tour) => void
  setSelectedTour: (tour: Tour) => void
  setDeleteConfirm: (state: { isOpen: boolean; tour: Tour | null }) => void
  onOpenQuoteDialog?: (tour: Tour) => void
  onOpenItineraryDialog?: (tour: Tour) => void
  onOpenArchiveDialog?: (tour: Tour) => void
  onOpenRequirementsDialog?: ((tour: Tour) => void) | undefined
  onAddOrder?: (tour: Tour) => void
  onConvertTour?: (tour: Tour) => void // 開團（proposal → upcoming）
  onCopyTemplate?: (tour: Tour) => void // 複製模板 → 新提案
  itineraries?: { id: string }[]
}

export function useTourActionButtons(params: UseTourActionButtonsParams) {
  const t = useTranslations('tour')
  const {
    operations,
    onEditTour,
    setDeleteConfirm,
    onOpenArchiveDialog,
    onAddOrder,
    onConvertTour,
    onCopyTemplate,
  } = params
  const router = useRouter()

  const renderActions = useCallback(
    (row: unknown) => {
      const tour = row as Tour
      const isTemplate = tour.status === TOUR_STATUS.TEMPLATE
      const isProposal = tour.status === TOUR_STATUS.PROPOSAL
      const isActiveTour = !isTemplate && !isProposal

      const handleSignUp = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (onAddOrder) {
          onAddOrder(tour)
        } else {
          router.push(`/orders/new?tour_id=${tour.id}`)
        }
      }

      const ArchiveButton = (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (tour.archived) {
              operations.handleArchiveTour(tour)
            } else if (onOpenArchiveDialog) {
              onOpenArchiveDialog(tour)
            } else {
              operations.handleArchiveTour(tour)
            }
          }}
          className={cn(ACTION_BUTTON_BASE, ACTION_BUTTON_DEFAULT_TONE)}
        >
          {tour.archived ? <ArchiveRestore size="0.95em" /> : <Archive size="0.95em" />}
          {tour.archived ? '還原' : '封存'}
        </Button>
      )

      const EditButton = (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEditTour(tour)}
          className={cn(ACTION_BUTTON_BASE, ACTION_BUTTON_DEFAULT_TONE)}
        >
          <Edit2 size="0.95em" />
          {t('actionEdit')}
        </Button>
      )

      const DeleteButton = (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDeleteConfirm({ isOpen: true, tour })}
          className={cn(ACTION_BUTTON_BASE, 'text-status-danger hover:bg-status-danger-bg')}
        >
          <Trash2 size="0.95em" />
          {t('actionDelete')}
        </Button>
      )

      return (
        <div className="flex items-center gap-1 justify-start" onClick={e => e.stopPropagation()}>
          {/* 編輯永遠第一、跟訂單列表對齊 */}
          {EditButton}

          {/* 模板：複製→提案 + 直接開團 */}
          {isTemplate && onCopyTemplate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={e => {
                e.stopPropagation()
                onCopyTemplate(tour)
              }}
              className={cn(
                ACTION_BUTTON_BASE,
                'text-morandi-gold hover:text-morandi-gold hover:bg-morandi-gold/10'
              )}
            >
              <Copy size="0.95em" />
              {t('actionCopy')}
            </Button>
          )}
          {isTemplate && onConvertTour && (
            <Button
              variant="ghost"
              size="sm"
              onClick={e => {
                e.stopPropagation()
                onConvertTour(tour)
              }}
              className={cn(
                ACTION_BUTTON_BASE,
                'text-morandi-gold hover:text-morandi-gold hover:bg-morandi-gold/10'
              )}
            >
              <Send size="0.95em" />
              {t('actionConvert')}
            </Button>
          )}

          {/* 提案：開團按鈕 */}
          {isProposal && onConvertTour && (
            <Button
              variant="ghost"
              size="sm"
              onClick={e => {
                e.stopPropagation()
                onConvertTour(tour)
              }}
              className={cn(
                ACTION_BUTTON_BASE,
                'text-morandi-gold hover:text-morandi-gold hover:bg-morandi-gold/10'
              )}
            >
              <Send size="0.95em" />
              {t('actionConvert')}
            </Button>
          )}

          {/* 正式團：報名（加 UserPlus icon、跟其他按鈕一致 icon+文字）*/}
          {isActiveTour && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignUp}
              className={cn(
                ACTION_BUTTON_BASE,
                'text-morandi-gold hover:text-morandi-gold hover:bg-morandi-gold/10'
              )}
            >
              <UserPlus size="0.95em" />
              {t('actionEnroll')}
            </Button>
          )}

          {/* 所有狀態通用：封存、刪除 */}
          {ArchiveButton}
          {DeleteButton}
        </div>
      )
    },
    [
      operations,
      onEditTour,
      setDeleteConfirm,
      onOpenArchiveDialog,
      onAddOrder,
      onConvertTour,
      onCopyTemplate,
      router,
      params.user,
    ]
  )

  return {
    renderActions,
  }
}
