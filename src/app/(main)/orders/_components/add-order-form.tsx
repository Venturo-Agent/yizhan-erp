'use client'

import React, { useState } from 'react'
import { CheckSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Combobox } from '@/components/ui/combobox'
import { useToursSlim } from '@/data'
import { useEmployeesWithCapability } from '@/lib/permissions/useEmployeesWithCapability'
import { CAPABILITIES } from '@/lib/permissions'
import { useTranslations } from 'next-intl'
import { useTourOptions } from '@/hooks'

export interface OrderFormData {
  tour_id: string
  contact_person: string
  // sales_id（FK → employees.id）、sales_person 同步寫 display_name 做 fallback。
  // 5/24 助理欄移除（助理不再是指派角色）。
  sales_id: string
  sales_person: string
  member_count?: number
  total_amount?: number
}

interface AddOrderFormProps {
  tourId?: string // 如果從旅遊團頁面打開，會帶入 tour_id

  // 獨立模式（用於 Dialog）
  onSubmit?: (orderData: OrderFormData) => void
  onCancel?: () => void

  // 嵌入模式（用於嵌入其他表單）
  value?: Partial<OrderFormData>
  onChange?: (orderData: Partial<OrderFormData>) => void
}

export function AddOrderForm({ tourId, onSubmit, onCancel, value, onChange }: AddOrderFormProps) {
  const t = useTranslations('orders')
  const { items: tours } = useToursSlim()
  const tourOptions = useTourOptions(tours)

  // 業務候選池（5/24 純角色 SSOT）：能新增或編輯訂單的人
  const salesPersons = useEmployeesWithCapability([
    CAPABILITIES.ORDERS_CREATE_WRITE,
    CAPABILITIES.ORDERS_EDIT_WRITE,
  ])

  // 判斷是否為嵌入模式
  const isEmbedded = !!onChange

  // 內部 state（獨立模式使用）
  const [internalFormData, setInternalFormData] = useState<Partial<OrderFormData>>({
    tour_id: tourId || '',
    contact_person: '',
    sales_id: '',
    sales_person: '',
  })

  // 使用外部 state 或內部 state
  const formData = isEmbedded ? value || {} : internalFormData
  const updateFormData = isEmbedded ? onChange : setInternalFormData

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (onSubmit && !isEmbedded) {
      onSubmit(formData as OrderFormData)
    }
  }

  // 嵌入模式用 div，獨立模式用 form
  const Container = isEmbedded ? 'div' : 'form'
  const containerProps = isEmbedded ? {} : { onSubmit: handleSubmit }

  return (
    <Container {...containerProps} className="space-y-4">
      {/* 選擇旅遊團（如果沒有預設 tour_id） */}
      {!tourId && (
        <div>
          <label className="text-sm font-medium text-morandi-primary">{t('selectTourLabel')}</label>
          <Combobox
            options={tourOptions}
            value={formData.tour_id || ''}
            onChange={value => updateFormData?.({ ...formData, tour_id: value })}
            placeholder={t('searchOrSelectTour')}
            emptyMessage={t('noTourFound')}
            className="mt-1"
            disablePortal={true}
          />
        </div>
      )}

      {/* 聯絡人 */}
      <div>
        <label className="text-sm font-medium text-morandi-primary">{t('contactPerson')}</label>
        <Input
          value={formData.contact_person || ''}
          onChange={e => updateFormData?.({ ...formData, contact_person: e.target.value })}
          placeholder={t('enterContactName')}
          className="mt-1"
          required={!isEmbedded}
        />
      </div>

      {/* 業務（承辦） */}
      <div>
        <label className="text-sm font-medium text-morandi-primary">
          {t('salesPerson')}
          {/* 如果有填聯絡人，業務為必填 */}
          {formData.contact_person?.trim() && <span className="text-status-danger ml-1">*</span>}
        </label>
        <Combobox
          options={salesPersons.map(emp => ({
            value: emp.id,
            label: `${emp.display_name || emp.english_name || ''} (${emp.employee_number ?? ''})`,
          }))}
          value={formData.sales_id || ''}
          onChange={value => {
            const emp = salesPersons.find(e => e.id === value)
            updateFormData?.({
              ...formData,
              sales_id: value,
              sales_person: emp?.display_name || emp?.english_name || '',
            })
          }}
          placeholder={t('selectSalesPerson')}
          emptyMessage={t('noSalesPersonFound')}
          showSearchIcon={true}
          showClearButton={true}
          className="mt-1"
          disablePortal={true}
        />
      </div>

      {/* 按鈕（只在獨立模式顯示） */}
      {!isEmbedded && (
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="soft-gold" onClick={onCancel}>
            {t('cancel')}
          </Button>
          <Button
            variant="morandi-gold"
            type="submit"
            disabled={!formData.tour_id || !formData.contact_person}
          >
            <CheckSquare size="1em" />
            {t('addOrder')} <span className="ml-1 text-xs opacity-70">(Enter)</span>
          </Button>
        </div>
      )}
    </Container>
  )
}
