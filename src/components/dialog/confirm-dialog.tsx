'use client'
/**
 * ConfirmDialog - 統一的確認對話框組件
 * 用於刪除、警告、確認等操作
 */

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Info, Trash2, X } from 'lucide-react'

export type ConfirmDialogType = 'danger' | 'warning' | 'info'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type?: ConfirmDialogType
  title: string
  message: string
  details?: string[]
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void | Promise<void>
  onCancel?: () => void
  loading?: boolean
}

const TYPE_CONFIG = {
  danger: {
    icon: Trash2,
    iconColor: 'text-status-danger',
    titleColor: 'text-status-danger',
    buttonClass: 'bg-status-danger hover:bg-status-danger/90 text-white',
    detailsBg: 'bg-status-danger/5 border-status-danger/20',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-status-warning',
    titleColor: 'text-morandi-gold',
    buttonClass: 'bg-status-warning hover:bg-status-warning text-white',
    detailsBg: 'bg-status-warning-bg border-morandi-gold/30',
  },
  info: {
    icon: Info,
    iconColor: 'text-morandi-blue',
    titleColor: 'text-morandi-primary',
    buttonClass:
      'bg-morandi-gold/[0.08] text-morandi-primary border border-morandi-gold/20 hover:bg-morandi-gold/[0.14] hover:border-morandi-gold/35 transition-colors',
    detailsBg: 'bg-morandi-blue/5 border-morandi-blue/20',
  },
}

export function ConfirmDialog({
  open,
  onOpenChange,
  type = 'danger',
  title,
  message,
  details,
  confirmLabel = '確認',
  cancelLabel = '取消',
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  const config = TYPE_CONFIG[type]
  const Icon = config.icon

  const handleConfirm = async () => {
    await onConfirm()
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent level={1} size="md">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${config.titleColor}`}>
            <Icon size="1.25em" className={config.iconColor} />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-morandi-primary">{message}</p>

          {details && details.length > 0 && (
            <div className={`border rounded-lg p-3 ${config.detailsBg}`}>
              <ul className="space-y-1 text-sm text-morandi-secondary">
                {details.map((detail, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <AlertTriangle size="0.875em" className="mt-0.5 flex-shrink-0" />
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="soft-gold"
            onClick={handleCancel}
            disabled={loading}
            className="gap-2"
          >
            <X size="1em" />
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={config.buttonClass}
          >
            {loading ? '處理中...' : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
