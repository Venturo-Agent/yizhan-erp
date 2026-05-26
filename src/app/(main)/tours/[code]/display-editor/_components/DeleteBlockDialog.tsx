'use client'

/**
 * 刪除 block 確認 dialog
 *
 * 用法：page.tsx 開啟時 setPendingDeleteBlockId(id)、Dialog 監聽 open
 */

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface DeleteBlockDialogProps {
  open: boolean
  blockLabel: string
  loading: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteBlockDialog({
  open,
  blockLabel,
  loading,
  onConfirm,
  onCancel,
}: DeleteBlockDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={v => {
        if (!v) onCancel()
      }}
    >
      <DialogContent level={2}>
        <DialogHeader>
          <DialogTitle>確認刪除</DialogTitle>
          <DialogDescription>
            即將刪除「{blockLabel}」、刪除後仍可在客人看到舊版本（要等「發布」才生效）。
            <br />
            確定要刪除嗎？
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            取消
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading ? '刪除中⋯' : '確認刪除'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
