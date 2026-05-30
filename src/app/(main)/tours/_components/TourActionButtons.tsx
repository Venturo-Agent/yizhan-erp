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
import { Archive, ArchiveRestore, Trash2, Edit, Copy, Send, UserPlus, Unlock } from 'lucide-react'
import { Tour, EmployeeFull } from '@/stores/types'
import { TOUR_STATUS } from '@/lib/constants/status-maps'
import { useCapabilities, CAPABILITIES } from '@/lib/permissions'

import { ActionCell } from '@/components/table-cells'
import { useRouter } from 'next/navigation'

// 金色強調語意色（複製 / 開團 / 報名）— ActionCell 標準語意色接不住、走 custom
const TOUR_GOLD_TONE = 'text-morandi-gold hover:text-morandi-gold hover:bg-morandi-gold/10'

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
  onReopenTour?: (tour: Tour) => void // 主管強制重開（closed → returned、要 capability）
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
    onReopenTour,
  } = params
  const router = useRouter()
  const { can } = useCapabilities()
  const canReopenClosed = can(CAPABILITIES.TOURS_REOPEN_CLOSED)

  const renderActions = useCallback(
    (row: unknown) => {
      const tour = row as Tour
      const isTemplate = tour.status === TOUR_STATUS.TEMPLATE
      const isProposal = tour.status === TOUR_STATUS.PROPOSAL
      const isClosed = tour.status === TOUR_STATUS.CLOSED
      const isActiveTour = !isTemplate && !isProposal

      const handleSignUp = () => {
        if (onAddOrder) {
          onAddOrder(tour)
        } else {
          router.push(`/orders/new?tour_id=${tour.id}`)
        }
      }

      // 狀態機判斷（isTemplate / isProposal / isActiveTour）保留在 caller、
      // 餵成 ActionCell 的 actions 陣列、用 hidden 對應狀態決定哪些按鈕出現。
      // 金色強調按鈕走 variant='custom' + customColor、危險走 variant='danger'、
      // 其餘走預設灰（ActionCell 內建 ACTION_BUTTON_DEFAULT_TONE）。
      const actions = [
        // 編輯永遠第一、跟訂單列表對齊
        {
          icon: Edit,
          label: t('actionEdit'),
          onClick: () => onEditTour(tour),
        },
        // 模板：複製→提案
        {
          icon: Copy,
          label: t('actionCopy'),
          onClick: () => onCopyTemplate?.(tour),
          variant: 'custom' as const,
          customColor: TOUR_GOLD_TONE,
          hidden: !(isTemplate && onCopyTemplate),
        },
        // 模板 / 提案：開團（proposal → upcoming）
        {
          icon: Send,
          label: t('actionConvert'),
          onClick: () => onConvertTour?.(tour),
          variant: 'custom' as const,
          customColor: TOUR_GOLD_TONE,
          hidden: !((isTemplate || isProposal) && onConvertTour),
        },
        // 正式團：報名
        {
          icon: UserPlus,
          label: t('actionEnroll'),
          onClick: handleSignUp,
          variant: 'custom' as const,
          customColor: TOUR_GOLD_TONE,
          hidden: !isActiveTour,
        },
        // 已結案：主管強制重開（要 tours.reopen_closed capability + 原因 + 留稽核）
        {
          icon: Unlock,
          label: '強制重開',
          onClick: () => onReopenTour?.(tour),
          variant: 'custom' as const,
          customColor: TOUR_GOLD_TONE,
          hidden: !(isClosed && canReopenClosed && onReopenTour),
        },
        // 所有狀態通用：封存 / 還原
        {
          icon: tour.archived ? ArchiveRestore : Archive,
          label: tour.archived ? '還原' : '封存',
          onClick: () => {
            if (tour.archived) {
              operations.handleArchiveTour(tour)
            } else if (onOpenArchiveDialog) {
              onOpenArchiveDialog(tour)
            } else {
              operations.handleArchiveTour(tour)
            }
          },
        },
        // 所有狀態通用：刪除
        {
          icon: Trash2,
          label: t('actionDelete'),
          onClick: () => setDeleteConfirm({ isOpen: true, tour }),
          variant: 'danger' as const,
        },
      ]

      return <ActionCell actions={actions} className="justify-start" />
    },
    [
      operations,
      onEditTour,
      setDeleteConfirm,
      onOpenArchiveDialog,
      onAddOrder,
      onConvertTour,
      onCopyTemplate,
      onReopenTour,
      canReopenClosed,
      router,
      params.user,
    ]
  )

  return {
    renderActions,
  }
}
