'use client'
/**
 * CustomerMatchDialog - 顧客匹配對話框
 * 當輸入姓名或身分證號時，自動搜尋現有顧客
 */

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CustomerAvatar } from '@/components/ui/avatar'
import { Search, X } from 'lucide-react'
import type { Customer } from '@/types/customer.types'
import type { MatchType } from '../_hooks/useCustomerMatch'
import { useTranslations } from 'next-intl'

interface CustomerMatchDialogProps {
  isOpen: boolean
  customers: Customer[]
  matchType: MatchType
  onClose: () => void
  onSelect: (customer: Customer) => void
}

export function CustomerMatchDialog({
  isOpen,
  customers,
  matchType,
  onClose,
  onSelect,
}: CustomerMatchDialogProps) {
  const t = useTranslations('orders')
  const matchTypeLabel = matchType === 'name' ? t('matchTypeName') : t('matchTypeIdNumber')

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent nested level={2} className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Search size={20} className="text-morandi-blue" />
            {t('foundNCustomers', { count: customers.length, matchType: matchTypeLabel })}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          <div className="space-y-2">
            {customers.map(customer => (
              <div
                key={customer.id}
                className="border border-border rounded-lg p-4 hover:bg-morandi-container/20 transition-colors cursor-pointer"
                onClick={() => {
                  onSelect(customer)
                  onClose()
                }}
              >
                <div className="flex items-start gap-3">
                  <CustomerAvatar
                    name={customer.name}
                    size="md"
                    className="bg-morandi-gold/10 text-morandi-gold"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-morandi-primary">{customer.name}</span>
                      {customer.verification_status === 'verified' && (
                        <span className="text-xs px-2 py-0.5 bg-status-success-bg text-status-success rounded">
                          {t('verified')}
                        </span>
                      )}
                      {customer.is_vip && (
                        <span className="text-xs px-2 py-0.5 bg-morandi-gold/20 text-morandi-gold rounded">
                          VIP
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-morandi-muted">
                      {customer.passport_name && (
                        <div>
                          <span className="text-xs text-morandi-muted">
                            {t('passportPinyinLabel')}
                          </span>
                          {customer.passport_name}
                        </div>
                      )}
                      {customer.national_id && (
                        <div>
                          <span className="text-xs text-morandi-muted">{t('idNumberLabel')}</span>
                          {customer.national_id}
                        </div>
                      )}
                      {customer.passport_number && (
                        <div>
                          <span className="text-xs text-morandi-muted">
                            {t('passportNumberLabel')}
                          </span>
                          {customer.passport_number}
                        </div>
                      )}
                      {customer.birth_date && (
                        <div>
                          <span className="text-xs text-morandi-muted">{t('birthDateLabel')}</span>
                          {customer.birth_date}
                        </div>
                      )}
                      {customer.phone && (
                        <div>
                          <span className="text-xs text-morandi-muted">{t('phoneLabel')}</span>
                          {customer.phone}
                        </div>
                      )}
                      {customer.gender && (
                        <div>
                          <span className="text-xs text-morandi-muted">{t('genderLabel')}</span>
                          {customer.gender === 'M'
                            ? t('male')
                            : customer.gender === 'F'
                              ? t('female')
                              : customer.gender}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-shrink-0 flex justify-end pt-4 border-t">
          <Button variant="soft-gold" className="gap-1" onClick={onClose}>
            <X size={16} />
            {t('cancel')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
