/**
 * ReopenClosedTourDialog — 主管強制重開已結案旅遊團對話框
 *
 * 走 RPC `reopen_closed_tour(_tour_id, _reason)`：
 *   - DB 端 capability check（tours.reopen_closed）
 *   - DB 端強制必填原因
 *   - DB 端記錄 `tour_status_logs.is_force_reopen=true` + reopen_reason
 *
 * UI 設計：
 *   - 警告語：解釋這是「審計留痕」動作、不像一般狀態變更
 *   - 文字框：自由輸入原因（不選預設、強迫業務員想清楚）
 *   - 提交按鈕：原因留白擋下
 */

import React, { useState } from 'react'
import { FormDialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'
import { Unlock, AlertTriangle, X } from 'lucide-react'
import type { Tour } from '@/stores/types'

interface ReopenClosedTourDialogProps {
  isOpen: boolean
  tour: Tour | null
  onClose: () => void
  onConfirm: (reason: string) => Promise<void> | void
  /** 提交中、防連點 */
  loading?: boolean
}

export function ReopenClosedTourDialog({
  isOpen,
  tour,
  onClose,
  onConfirm,
  loading = false,
}: ReopenClosedTourDialogProps) {
  const [reason, setReason] = useState('')

  const trimmedReason = reason.trim()
  const disabled = !trimmedReason || loading

  const handleConfirm = async () => {
    if (disabled) return
    await onConfirm(trimmedReason)
    setReason('')
  }

  const handleClose = () => {
    if (loading) return
    setReason('')
    onClose()
  }

  const customFooter = (
    <div className="flex justify-end gap-2">
      <Button variant="soft-gold" onClick={handleClose} disabled={loading} className="gap-2">
        <X size={16} />
        取消
      </Button>
      <Button variant="morandi-gold" onClick={handleConfirm} disabled={disabled} className="gap-2">
        <Unlock size="1em" />
        {loading ? '處理中...' : '確認強制重開'}
      </Button>
    </div>
  )

  return (
    <FormDialog
      open={isOpen}
      onOpenChange={open => !open && handleClose()}
      title={
        <span className="flex items-center gap-2 text-morandi-gold">
          <Unlock size={20} />
          強制重開已結案旅遊團
        </span>
      }
      onSubmit={handleConfirm}
      submitDisabled={disabled}
      loading={loading}
      footer={customFooter}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* 警告語 */}
        <div className="flex items-start gap-2 rounded-lg border border-status-warning/30 bg-status-warning-bg p-3">
          <AlertTriangle size={18} className="text-status-warning shrink-0 mt-0.5" />
          <div className="text-sm text-morandi-primary space-y-1">
            <p className="font-medium">這個動作會被記錄下來。</p>
            <p className="text-morandi-secondary">
              已結案的團一般情況不可改、走這個按鈕代表你（主管）認可重新處理。
              系統會自動留下「誰、什麼時候、為什麼」的稽核紀錄。
            </p>
          </div>
        </div>

        {/* 團資訊 */}
        {tour && (
          <div className="rounded-lg border border-morandi-container bg-morandi-container/30 p-3 text-sm space-y-1">
            <div className="flex gap-2">
              <span className="text-morandi-secondary">團號</span>
              <span className="font-mono text-morandi-primary">{tour.code}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-morandi-secondary">團名</span>
              <span className="text-morandi-primary">{tour.name}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-morandi-secondary">將改為</span>
              <span className="text-morandi-gold font-medium">未結案</span>
            </div>
          </div>
        )}

        {/* 原因輸入 */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-morandi-primary" htmlFor="reopen-reason">
            原因 <span className="text-status-danger">*</span>
          </label>
          <textarea
            id="reopen-reason"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="譬如：帳沒對完、客戶反映漏項、要補開發票…"
            rows={3}
            disabled={loading}
            className="w-full rounded-lg border border-morandi-container bg-morandi-bg p-2 text-sm text-morandi-primary placeholder:text-morandi-secondary focus:border-morandi-gold focus:outline-none disabled:opacity-50"
          />
          <p className="text-xs text-morandi-secondary">原因會永久存於稽核紀錄、無法事後修改</p>
        </div>
      </div>
    </FormDialog>
  )
}
