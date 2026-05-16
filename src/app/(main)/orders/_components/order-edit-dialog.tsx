'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  type DialogLevel,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Combobox } from '@/components/ui/combobox'
import { updateOrder } from '@/data'
import type { Order } from '@/stores/types'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { useAsyncSubmit } from '@/hooks/useAsyncSubmit'
import { useTranslations } from 'next-intl'
import { useEligibleEmployees, ELIGIBILITY } from '@/app/(main)/orders/_hooks/useEligibleEmployees'

interface OrderEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: Order | null
  level?: DialogLevel
}

export function OrderEditDialog({ open, onOpenChange, order, level = 2 }: OrderEditDialogProps) {
  const t = useTranslations('orders')
  const { isSubmitting, execute: submitForm } = useAsyncSubmit(
    async () => {
      if (!order) return
      await updateOrder(order.id, {
        contact_person: formData.contact_person,
        sales_id: formData.sales_id || null,
        sales_person: formData.sales_person || null,
        assistant_id: formData.assistant_id || null,
        assistant: formData.assistant || null,
      })
      onOpenChange(false)
    },
    {
      onError: (err) => {
        logger.error(t('editOrderUpdateFailed'), err)
        toast.error(t('updateOrderFailed'))
      },
    }
  )
  const [formData, setFormData] = useState({
    contact_person: '',
    sales_id: '',
    sales_person: '',
    assistant_id: '',
    assistant: '',
  })

  // 下拉資格：5/13 新概念、讀 employee_eligibilities（HR 員工頁勾選）
  const salesPersons = useEligibleEmployees(ELIGIBILITY.TOURS_AS_SALES)
  const assistants = useEligibleEmployees(ELIGIBILITY.TOURS_AS_ASSISTANT)

  // 當 order 變更時重設表單
  useEffect(() => {
    if (order) {
      setFormData({
        contact_person: order.contact_person || '',
        sales_id: order.sales_id || '',
        sales_person: order.sales_person || '',
        assistant_id: order.assistant_id || '',
        assistant: order.assistant || '',
      })
    }
  }, [order])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void submitForm()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent level={level} className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('editOrderTitle')} {order?.order_number}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 訂單資訊（唯讀） */}
          <div className="p-3 bg-morandi-container/30 rounded-lg space-y-1">
            <div className="text-xs text-morandi-secondary">
              {t('tourPrefix')}<span className="font-medium text-morandi-primary">{order?.tour_name}</span>
            </div>
          </div>

          {/* 聯絡人 */}
          <div>
            <label className="text-sm font-medium text-morandi-primary">
              {t('contactPerson')}
            </label>
            <Input
              value={formData.contact_person}
              onChange={e => setFormData(prev => ({ ...prev, contact_person: e.target.value }))}
              placeholder={t('enterContactName')}
              className="mt-1"
              required
            />
          </div>

          {/* 業務和助理 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-morandi-primary">
                {t('salesPerson')}
                {formData.contact_person?.trim() && (
                  <span className="text-morandi-red ml-1">*</span>
                )}
              </label>
              <Combobox
                options={salesPersons.map(emp => ({
                  value: emp.id,
                  label: `${emp.display_name || emp.english_name || ''} (${emp.employee_number ?? ''})`,
                }))}
                value={formData.sales_id}
                onChange={value => {
                  const emp = salesPersons.find(e => e.id === value)
                  setFormData(prev => ({
                    ...prev,
                    sales_id: value,
                    sales_person: emp?.display_name || emp?.english_name || '',
                  }))
                }}
                placeholder={t('selectSalesPerson')}
                emptyMessage={t('noSalesPersonFound')}
                showSearchIcon={true}
                showClearButton={true}
                className="mt-1"
                disablePortal={true}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-morandi-primary">
                {t('assistantLabel')}
              </label>
              <Combobox
                options={assistants.map(emp => ({
                  value: emp.id,
                  label: `${emp.display_name || emp.english_name || ''} (${emp.employee_number ?? ''})`,
                }))}
                value={formData.assistant_id}
                onChange={value => {
                  const emp = assistants.find(e => e.id === value)
                  setFormData(prev => ({
                    ...prev,
                    assistant_id: value,
                    assistant: emp?.display_name || emp?.english_name || '',
                  }))
                }}
                placeholder={t('selectAssistant')}
                emptyMessage={t('noAssistantFound')}
                showSearchIcon={true}
                showClearButton={true}
                className="mt-1"
                disablePortal={true}
              />
            </div>
          </div>

          {/* 按鈕 */}
          <div className="flex justify-end space-x-2 pt-2">
            <Button
              type="button"
              variant="soft-gold"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="gap-2"
            >
              <X size={16} />
              {t('cancel')}
            </Button>
            <Button variant="soft-gold"
              type="submit"
              disabled={!formData.contact_person || isSubmitting}
            >
              {isSubmitting ? t('saving') : t('save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
