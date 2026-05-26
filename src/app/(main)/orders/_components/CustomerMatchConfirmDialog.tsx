'use client'
/**
 * CustomerMatchConfirmDialog — 撞名確認對話框
 *
 * 觸發時機：單筆驗證（useMemberEditDialog）時，身分證沒比中、但名字撞到既有顧客。
 * 規格（2026-05-26 設計提案第三節）：名字是弱線索、撞名要跳通知問「是同一人嗎？」
 *
 * 動作：
 *  - 對每個候選既有顧客提供 [更新既有]（連到該人 + 用新資料更新本尊，含換新護照）
 *  - 提供 [建為新顧客]（不連任何既有、開新本尊）
 *
 * UI：沿用同資料夾 PassportConflictDialog / CustomerMatchDialog 的 Dialog 結構 + design token。
 */

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CustomerAvatar } from '@/components/ui/avatar'
import { UserPlus, UserCheck } from 'lucide-react'
import type { Customer } from '@/types/customer.types'
import type { OrderMember } from '../_types/order-member.types'
import { useTranslations } from 'next-intl'

interface CustomerMatchConfirmDialogProps {
  open: boolean
  /** 正在儲存的成員表單資料（顯示「我要存的人」） */
  pendingForm: Partial<OrderMember>
  /** 撞名的既有顧客候選清單 */
  candidates: Customer[]
  /** 是否處理中（防連點） */
  loading: boolean
  onClose: () => void
  /** 選「更新既有」：把成員連到該顧客 + 更新本尊 */
  onUpdateExisting: (customerId: string) => void
  /** 選「建為新顧客」 */
  onCreateNew: () => void
}

export function CustomerMatchConfirmDialog({
  open,
  pendingForm,
  candidates,
  loading,
  onClose,
  onUpdateExisting,
  onCreateNew,
}: CustomerMatchConfirmDialogProps) {
  const t = useTranslations('orders')

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent level={2} className="max-w-xl max-h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{t('customerClashTitle')}</DialogTitle>
          <DialogDescription>
            {t('customerClashDesc', { name: pendingForm.chinese_name || '' })}
          </DialogDescription>
        </DialogHeader>

        {/* 我要存的人（剛填的資料） */}
        <div className="flex-shrink-0 rounded-lg border border-morandi-gold/30 bg-morandi-gold-light/40 p-3 text-sm">
          <div className="mb-1 text-xs font-medium text-morandi-muted">
            {t('customerClashIncoming')}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-morandi-primary">
            <span className="font-medium">{pendingForm.chinese_name || '—'}</span>
            {pendingForm.id_number && (
              <span className="text-morandi-secondary">
                {t('idNumberLabel')}
                {pendingForm.id_number}
              </span>
            )}
            {pendingForm.passport_number && (
              <span className="text-morandi-secondary">
                {t('passportNumberLabel')}
                {pendingForm.passport_number}
              </span>
            )}
            {pendingForm.birth_date && (
              <span className="text-morandi-secondary">
                {t('birthDateLabel')}
                {pendingForm.birth_date}
              </span>
            )}
          </div>
        </div>

        {/* 既有候選顧客清單 */}
        <div className="flex-1 overflow-y-auto py-3">
          <div className="mb-2 text-xs font-medium text-morandi-muted">
            {t('customerClashExisting', { count: candidates.length })}
          </div>
          <div className="space-y-2">
            {candidates.map(customer => (
              <div
                key={customer.id}
                className="flex items-center gap-3 rounded-lg border border-border p-3"
              >
                <CustomerAvatar
                  name={customer.name}
                  size="md"
                  className="bg-morandi-gold/10 text-morandi-gold"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-morandi-primary">{customer.name}</span>
                    {customer.code && (
                      <span className="text-xs text-morandi-muted">{customer.code}</span>
                    )}
                    {customer.verification_status === 'verified' && (
                      <span className="rounded bg-status-success-bg px-2 py-0.5 text-xs text-status-success">
                        {t('verified')}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-morandi-muted">
                    {customer.national_id && (
                      <span>
                        {t('idNumberLabel')}
                        {customer.national_id}
                      </span>
                    )}
                    {customer.passport_number && (
                      <span>
                        {t('passportNumberLabel')}
                        {customer.passport_number}
                      </span>
                    )}
                    {customer.birth_date && (
                      <span>
                        {t('birthDateLabel')}
                        {customer.birth_date}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="soft-gold"
                  size="sm"
                  className="flex-shrink-0 gap-1"
                  disabled={loading}
                  onClick={() => onUpdateExisting(customer.id)}
                >
                  <UserCheck size={14} />
                  {t('customerClashUpdateExisting')}
                </Button>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {t('cancel')}
          </Button>
          <Button className="gap-1" onClick={onCreateNew} disabled={loading}>
            <UserPlus size={16} />
            {t('customerClashCreateNew')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
