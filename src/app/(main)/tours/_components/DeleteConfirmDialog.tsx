import React from 'react'
import { FormDialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'
import { AlertCircle, Trash2, X } from 'lucide-react'
import { Tour } from '@/stores/types'
import { TOUR_DELETE } from '../_constants'

interface DeleteConfirmDialogProps {
  isOpen: boolean
  tour: Tour | null
  onClose: () => void
  onConfirm: () => void
  /** 提交中、防連點（disable 確認 + 取消按鈕） */
  loading?: boolean
}

export function DeleteConfirmDialog({
  isOpen,
  tour,
  onClose,
  onConfirm,
  loading = false,
}: DeleteConfirmDialogProps) {
  const customFooter = (
    <div className="flex justify-end gap-2">
      <Button variant="soft-gold" onClick={onClose} disabled={loading} className="gap-2">
        <X size={16} />
        {TOUR_DELETE.cancel}
      </Button>
      <Button
        onClick={onConfirm}
        disabled={loading}
        className="bg-morandi-red hover:bg-morandi-red/90 text-white gap-2"
      >
        <Trash2 size={16} />
        {loading ? '處理中...' : TOUR_DELETE.confirm}
      </Button>
    </div>
  )

  return (
    <FormDialog
      open={isOpen}
      onOpenChange={open => !open && !loading && onClose()}
      title={
        <span className="flex items-center gap-2 text-morandi-red">
          <AlertCircle size={20} />
          {TOUR_DELETE.title}
        </span>
      }
      footer={customFooter}
      loading={loading}
      maxWidth="md"
    >
      <div className="space-y-4">
        <p className="text-sm text-morandi-primary">{TOUR_DELETE.confirm_text(tour?.name)}</p>
        <div className="bg-morandi-red/5 border border-morandi-red/20 rounded-lg p-3 space-y-2">
          <p className="text-sm font-medium text-morandi-red">{TOUR_DELETE.impact_title}</p>
          <ul className="text-sm text-morandi-secondary space-y-1 ml-4">
            <li>{TOUR_DELETE.impact_orders}</li>
            <li>{TOUR_DELETE.impact_payments}</li>
            <li>{TOUR_DELETE.impact_quotes}</li>
          </ul>
          <p className="text-xs text-morandi-red font-medium mt-2">{TOUR_DELETE.warning}</p>
        </div>
      </div>
    </FormDialog>
  )
}
