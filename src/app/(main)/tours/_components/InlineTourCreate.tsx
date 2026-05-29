'use client'

import React, { useCallback, useState } from 'react'
import { useTranslations } from 'next-intl'
import { TourBasicInfo, TourSettings, TourOrderSection } from './tour-form'
import { useTourOperations } from '../_hooks/useTourOperations'
import { createTour, updateTour, deleteTour } from '@/data/entities/tours'
import { useAuthStore } from '@/stores/auth-store'
import type { NewTourData } from '../_types'
import type { OrderFormData } from '@/app/(main)/orders/_components/add-order-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import { X } from 'lucide-react'
import { TOUR_STATUS } from '@/lib/constants/status-maps'
import { needsControllerServiceType } from '@/constants/tour-service-types'

const COMPONENT_LABELS = {
  REMARKS: '備註',
  REMARKS_PLACEHOLDER: '內部備註，客人看不到',
} as const

const EMPTY_TOUR: NewTourData = {
  name: '',
  countryCode: '',
  cityCode: '',
  departure_date: '',
  return_date: '',
  price: 0,
  status: 'proposed',
  isSpecial: false,
  max_participants: 20,
  description: '',
  controller_id: '',
}

const EMPTY_ORDER: Partial<OrderFormData> = {
  contact_person: '',
  sales_person: '',
  member_count: 1,
  total_amount: 0,
}

interface InlineTourCreateProps {
  /** 預填 tour 名稱（從 todo title 帶入） */
  defaultTourName?: string
  /** 建立成功 callback */
  onCreated?: (tour: {
    id: string
    code: string
    order?: { id: string; order_number: string }
  }) => void
  /** 取消 callback */
  onCancel?: () => void
}

export function InlineTourCreate({ defaultTourName, onCreated, onCancel }: InlineTourCreateProps) {
  const t = useTranslations('tour')
  const { user } = useAuthStore()
  const [newTour, setNewTour] = useState<NewTourData>({
    ...EMPTY_TOUR,
    name: defaultTourName || '',
  })
  const [newOrder, setNewOrder] = useState<Partial<OrderFormData>>(EMPTY_ORDER)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const resetForm = useCallback(() => {
    setNewTour({ ...EMPTY_TOUR, name: defaultTourName || '' })
    setNewOrder(EMPTY_ORDER)
    setFormError(null)
  }, [defaultTourName])

  const operations = useTourOperations({
    actions: {
      create: createTour,
      update: updateTour,
      delete: deleteTour,
    },
    resetForm,
    closeDialog: () => onCancel?.(),
    setSubmitting,
    setFormError,
    workspaceId: user?.workspace_id,
    onCreated: tour => {
      onCreated?.(tour)
    },
  })

  const handleSubmit = useCallback(() => {
    operations.handleAddTour(newTour, newOrder)
  }, [operations, newTour, newOrder])

  const isProposalOrTemplate =
    newTour.status === TOUR_STATUS.PROPOSAL || newTour.status === TOUR_STATUS.TEMPLATE

  const isSubmitDisabled = () => {
    if (submitting || !newTour.name.trim()) return true
    // 團控：提案 / 模板不問（轉開團時 dialog 補）、旅遊團必填、其他類型不需
    if (
      needsControllerServiceType(newTour.tour_service_type) &&
      !isProposalOrTemplate &&
      !newTour.controller_id
    ) {
      return true
    }
    if (isProposalOrTemplate) return false
    if (!newTour.departure_date || !newTour.return_date) return true
    if (!!newOrder.contact_person?.trim() && !newOrder.sales_person?.trim()) return true
    return false
  }

  return (
    <div className="space-y-4">
      {formError && (
        <Alert variant="danger" description={<span className="text-xs">{formError}</span>} />
      )}

      <div className="space-y-3">
        <TourBasicInfo newTour={newTour} setNewTour={setNewTour} />

        {!isProposalOrTemplate ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-morandi-primary">
                {COMPONENT_LABELS.REMARKS}
              </label>
              <Input
                value={newTour.description || ''}
                onChange={e => setNewTour(prev => ({ ...prev, description: e.target.value }))}
                placeholder={COMPONENT_LABELS.REMARKS_PLACEHOLDER}
                className="mt-1"
              />
            </div>
            <TourSettings newTour={newTour} setNewTour={setNewTour} />
          </div>
        ) : (
          <div>
            <label className="text-sm font-medium text-morandi-primary">
              {COMPONENT_LABELS.REMARKS}
            </label>
            <Input
              value={newTour.description || ''}
              onChange={e => setNewTour(prev => ({ ...prev, description: e.target.value }))}
              placeholder={COMPONENT_LABELS.REMARKS_PLACEHOLDER}
              className="mt-1"
            />
          </div>
        )}
      </div>

      {!isProposalOrTemplate && (
        <div className="border-t border-border pt-3">
          <TourOrderSection newOrder={newOrder} setNewOrder={setNewOrder} />
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={submitting}>
          <X size={14} className="mr-1" />
          {t('inlineTourCreateCancel')}
        </Button>
        <Button size="sm" onClick={handleSubmit} disabled={isSubmitDisabled()}>
          {submitting ? '建立中...' : '建立團體'}
        </Button>
      </div>
    </div>
  )
}
