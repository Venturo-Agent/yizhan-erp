/**
 * useConfirmDialog - 簡化確認對話框的使用
 */

import { useState, useCallback } from 'react'
import { ConfirmDialogType } from '@/components/dialog'

interface ConfirmOptions {
  type?: ConfirmDialogType
  title: string
  message: string
  details?: string[]
  confirmLabel?: string
  cancelLabel?: string
}

export function useConfirmDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const [resolveCallback, setResolveCallback] = useState<((value: boolean) => void) | null>(null)

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise(resolve => {
      setOptions(opts)
      setIsOpen(true)
      setResolveCallback(() => resolve)
    })
  }, [])

  const handleConfirm = useCallback(() => {
    setIsOpen(false)
    if (resolveCallback) {
      resolveCallback(true)
    }
  }, [resolveCallback])

  const handleCancel = useCallback(() => {
    setIsOpen(false)
    if (resolveCallback) {
      resolveCallback(false)
    }
  }, [resolveCallback])

  return {
    confirm,
    confirmDialogProps: {
      open: isOpen,
      onOpenChange: (open: boolean) => {
        if (!open) handleCancel()
      },
      type: options?.type || 'danger',
      title: options?.title || '',
      message: options?.message || '',
      details: options?.details,
      confirmLabel: options?.confirmLabel,
      cancelLabel: options?.cancelLabel,
      onConfirm: handleConfirm,
      onCancel: handleCancel,
    },
  }
}

// 使用範例：
/*
const { confirm, confirmDialogProps } = useConfirmDialog();

const handleDelete = async () => {
  const confirmed = await confirm({
    type: 'danger',
    title: '確認刪除',
    message: '確定要刪除此項目嗎？',
    details: ['相關資料會被刪除', '此操作無法復原'],
  });

  if (confirmed) {
    // 執行刪除
  }
};

// 在 JSX 中
<ConfirmDialog {...confirmDialogProps} />
*/
