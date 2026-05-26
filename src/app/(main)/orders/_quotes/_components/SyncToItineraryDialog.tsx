'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { FormDialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'
import { ArrowRight, CheckSquare, X } from 'lucide-react'

export interface MealDiff {
  day: number
  type: 'lunch' | 'dinner'
  typeLabel: string
  oldValue: string
  newValue: string
}

interface SyncToItineraryDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  diffs: MealDiff[]
  itineraryTitle?: string
  /** 提交中、防連點（disable 確認 + 取消按鈕） */
  loading?: boolean
}

export const SyncToItineraryDialog: React.FC<SyncToItineraryDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  diffs,
  itineraryTitle,
  loading = false,
}) => {
  const t = useTranslations('orders')
  const handleConfirm = () => {
    if (loading) return
    onConfirm()
    onClose()
  }

  return (
    <FormDialog
      open={isOpen}
      onOpenChange={open => !open && !loading && onClose()}
      title={t('quoteSyncMealsTitle')}
      onSubmit={handleConfirm}
      onCancel={onClose}
      submitDisabled={diffs.length === 0 || loading}
      loading={loading}
      maxWidth="lg"
      footer={
        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="soft-gold"
            onClick={onClose}
            disabled={loading}
            className="gap-2"
          >
            <X size={16} />
            {t('quoteSyncCancel')}
          </Button>
          <Button
            variant="morandi-gold"
            type="submit"
            disabled={diffs.length === 0 || loading}
            className="gap-2"
          >
            <CheckSquare size={16} />
            {loading ? '處理中...' : t('quoteSyncConfirm')}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {itineraryTitle && (
          <p className="text-sm text-morandi-secondary">
            {t('quoteSyncWillSyncTo')}
            <span className="font-medium text-morandi-primary">{itineraryTitle}</span>
          </p>
        )}

        {diffs.length === 0 ? (
          <div className="text-center py-8 text-morandi-secondary">{t('quoteSyncNoChanges')}</div>
        ) : (
          <>
            <p className="text-sm text-morandi-secondary">
              {t('quoteSyncItemsWillUpdate', { count: diffs.length })}
            </p>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-morandi-container/40">
                  <tr>
                    <th className="text-left py-2 px-3 font-medium text-morandi-primary">
                      {t('quoteSyncDays')}
                    </th>
                    <th className="text-left py-2 px-3 font-medium text-morandi-primary">
                      {t('quoteSyncMealType')}
                    </th>
                    <th className="text-left py-2 px-3 font-medium text-morandi-primary">
                      {t('quoteSyncBefore')}
                    </th>
                    <th className="text-center py-2 px-3 font-medium text-morandi-primary w-10"></th>
                    <th className="text-left py-2 px-3 font-medium text-morandi-primary">
                      {t('quoteSyncAfter')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {diffs.map((diff, index) => (
                    <tr key={index} className="border-t border-border/50">
                      <td className="py-2 px-3 text-morandi-primary">Day {diff.day}</td>
                      <td className="py-2 px-3 text-morandi-primary">{diff.typeLabel}</td>
                      <td className="py-2 px-3 text-morandi-secondary">
                        {diff.oldValue || (
                          <span className="text-morandi-muted">{t('quoteSyncEmpty')}</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <ArrowRight size={14} className="text-morandi-gold inline" />
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={
                            diff.newValue === '自理'
                              ? 'text-status-warning font-medium'
                              : 'text-status-success font-medium'
                          }
                        >
                          {diff.newValue || <span className="text-morandi-muted">{'（空）'}</span>}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </FormDialog>
  )
}
