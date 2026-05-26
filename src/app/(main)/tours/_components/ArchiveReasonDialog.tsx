/**
 * ArchiveReasonDialog - 旅遊團封存原因對話框
 */

import React, { useState } from 'react'
import { FormDialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'
import { Archive, CheckSquare, X } from 'lucide-react'
import { Tour } from '@/stores/types'
import { cn } from '@/lib/utils'
import { TOUR_ARCHIVE } from '../_constants'

// 封存原因選項
const ARCHIVE_REASONS = [
  {
    value: 'no_deal',
    label: TOUR_ARCHIVE.reason_no_deal,
    description: TOUR_ARCHIVE.reason_no_deal_desc,
  },
  {
    value: 'cancelled',
    label: TOUR_ARCHIVE.reason_cancelled,
    description: TOUR_ARCHIVE.reason_cancelled_desc,
  },
  {
    value: 'test_error',
    label: TOUR_ARCHIVE.reason_test_error,
    description: TOUR_ARCHIVE.reason_test_error_desc,
  },
] as const

export type ArchiveReason = (typeof ARCHIVE_REASONS)[number]['value']

interface ArchiveReasonDialogProps {
  isOpen: boolean
  tour: Tour | null
  onClose: () => void
  onConfirm: (reason: ArchiveReason) => void
  /** 提交中、防連點（disable 確認按鈕 + 文案改成「處理中...」） */
  loading?: boolean
}

export function ArchiveReasonDialog({
  isOpen,
  tour,
  onClose,
  onConfirm,
  loading = false,
}: ArchiveReasonDialogProps) {
  const [selectedReason, setSelectedReason] = useState<ArchiveReason | null>(null)

  const handleConfirm = () => {
    if (loading) return
    if (selectedReason) {
      onConfirm(selectedReason)
      setSelectedReason(null)
    }
  }

  const handleClose = () => {
    if (loading) return
    setSelectedReason(null)
    onClose()
  }

  const customFooter = (
    <div className="flex justify-end gap-2">
      <Button variant="soft-gold" onClick={handleClose} disabled={loading} className="gap-2">
        <X size={16} />
        {TOUR_ARCHIVE.cancel}
      </Button>
      <Button
        variant="morandi-gold"
        onClick={handleConfirm}
        disabled={!selectedReason || loading}
        className="gap-2"
      >
        <CheckSquare size="1em" />
        {loading ? '處理中...' : TOUR_ARCHIVE.confirm}
      </Button>
    </div>
  )

  return (
    <FormDialog
      open={isOpen}
      onOpenChange={open => !open && handleClose()}
      title={
        <span className="flex items-center gap-2 text-morandi-gold">
          <Archive size={20} />
          {TOUR_ARCHIVE.title}
        </span>
      }
      onSubmit={handleConfirm}
      submitDisabled={!selectedReason || loading}
      loading={loading}
      footer={customFooter}
      maxWidth="md"
    >
      <div className="space-y-4">
        <p className="text-sm text-morandi-primary">{TOUR_ARCHIVE.confirm_text(tour?.name)}</p>

        <div className="space-y-2">
          <p className="text-sm font-medium text-morandi-primary">{TOUR_ARCHIVE.select_reason}</p>
          <div className="space-y-2">
            {ARCHIVE_REASONS.map(reason => (
              <button
                key={reason.value}
                onClick={() => setSelectedReason(reason.value)}
                className={cn(
                  'w-full p-3 rounded-lg border text-left transition-all',
                  selectedReason === reason.value
                    ? 'border-morandi-gold bg-morandi-gold/10'
                    : 'border-morandi-container hover:border-morandi-gold/50 hover:bg-morandi-container/30'
                )}
              >
                <div className="font-medium text-morandi-primary">{reason.label}</div>
                <div className="text-xs text-morandi-secondary">{reason.description}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-morandi-gold/5 border border-morandi-gold/20 rounded-lg p-3 space-y-2">
          <p className="text-sm text-morandi-secondary">{TOUR_ARCHIVE.after_archive_title}</p>
          <ul className="text-sm text-morandi-secondary space-y-1 ml-4">
            <li>{TOUR_ARCHIVE.after_archive_hidden}</li>
            <li>{TOUR_ARCHIVE.after_archive_unlink}</li>
          </ul>
        </div>
      </div>
    </FormDialog>
  )
}
