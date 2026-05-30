'use client'

import React, { useMemo, useState } from 'react'
import { useAsyncSubmit } from '@/hooks/useAsyncSubmit'
import { FormDialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CountryAirportSelector } from '@/components/selectors/CountryAirportSelector'
import { X, CheckSquare } from 'lucide-react'
import { getTodayString } from '@/lib/utils/format-date'
import { Tour } from '@/stores/types'
import { TOUR_CONVERT } from '../_constants'
import { toast } from 'sonner'
import { TourOrderSection } from './tour-form'
import type { OrderFormData } from '@/app/(main)/orders/_components/add-order-form'
import { useEmployeesWithCapability } from '@/lib/permissions/useEmployeesWithCapability'
import { CAPABILITIES } from '@/lib/permissions'

const COMPONENT_LABELS = {
  TOUR_INFO: '旅遊團資訊',
  CONTROLLER: '團控',
  CONTROLLER_HINT: '轉開團當下強制補上、提案不選團控',
  CONTROLLER_PLACEHOLDER: '選擇團控...',
  CITY: '目的地',
  CITY_HINT: '提案沒選城市、轉開團時補上以產生正式團號',
} as const

interface ConvertOrderData {
  contact_person?: string
  sales_person?: string
  member_count?: number
  total_amount?: number
}

export interface ConvertPayload {
  departure_date: string
  return_date: string
  controller_id: string
  // 城市代碼：提案 airport_code 為空時、由 dialog 補。提案已選 → 沿用、不送這欄
  city_code?: string
  orderData?: ConvertOrderData
}

interface ConvertToTourDialogProps {
  isOpen: boolean
  onClose: () => void
  tour: Tour | null
  onConvert: (tour: Tour, payload: ConvertPayload) => Promise<void>
}

export function ConvertToTourDialog({
  isOpen,
  onClose,
  tour,
  onConvert,
}: ConvertToTourDialogProps) {
  const [departureDate, setDepartureDate] = useState(getTodayString())
  const [returnDate, setReturnDate] = useState('')
  const [controllerId, setControllerId] = useState('')
  const [cityCode, setCityCode] = useState('')
  const [countryName, setCountryName] = useState('')
  // 助理在提案轉開團不再於此選擇、initial 不放 assistant
  const [newOrder, setNewOrder] = useState<Partial<OrderFormData>>({
    contact_person: '',
    sales_person: '',
    member_count: 1,
    total_amount: 0,
  })

  // 團控候選池（5/24 純角色 SSOT）：能寫團員名單的人
  const controllers = useEmployeesWithCapability(CAPABILITIES.TOURS_MEMBERS_WRITE)

  const needsCityInput = useMemo(() => !tour?.airport_code, [tour?.airport_code])

  if (!tour) return null

  const isTemplate = tour.status === 'template'
  const title = isTemplate ? TOUR_CONVERT.title_template : TOUR_CONVERT.title_proposal
  const description = isTemplate
    ? TOUR_CONVERT.description_template
    : TOUR_CONVERT.description_proposal

  const hasOrder = !!newOrder.contact_person?.trim()

  const { isSubmitting, execute: executeConvert } = useAsyncSubmit(
    async () => {
      const orderData = hasOrder
        ? {
            contact_person: newOrder.contact_person,
            // 5/13 雙寫：sales_id FK + sales_person text fallback
            sales_id: newOrder.sales_id,
            sales_person: newOrder.sales_person,
            // 助理欄位此情境隱藏、不寫入
            member_count: newOrder.member_count,
            total_amount: newOrder.total_amount,
          }
        : undefined
      await onConvert(tour, {
        departure_date: departureDate,
        return_date: returnDate,
        controller_id: controllerId,
        city_code: needsCityInput ? cityCode : undefined,
        orderData,
      })
      toast.success(isTemplate ? TOUR_CONVERT.success_template : TOUR_CONVERT.success_proposal)
      handleClose()
    },
    {
      onError: () => {
        toast.error(TOUR_CONVERT.error)
      },
    }
  )

  const handleSubmit = async () => {
    if (!departureDate || !returnDate) return
    if (!controllerId) return // 團控必填
    if (needsCityInput && !cityCode) return // 提案無城市時、必補
    if (hasOrder && !newOrder.sales_person?.trim()) return
    await executeConvert()
  }

  const handleClose = () => {
    setDepartureDate(getTodayString())
    setReturnDate('')
    setControllerId('')
    setCityCode('')
    setCountryName('')
    setNewOrder({
      contact_person: '',
      sales_person: '',
      member_count: 1,
      total_amount: 0,
    })
    onClose()
  }

  const submitLabel = isSubmitting
    ? TOUR_CONVERT.confirming
    : hasOrder
      ? '確認開團並建立訂單'
      : TOUR_CONVERT.confirm

  const isSubmitDisabled =
    isSubmitting ||
    !departureDate ||
    !returnDate ||
    !controllerId ||
    (needsCityInput && !cityCode) ||
    (hasOrder && !newOrder.sales_person?.trim())

  const customFooter = (
    <div className="flex justify-end gap-2">
      <Button variant="soft-gold" onClick={handleClose} disabled={isSubmitting} className="gap-2">
        <X size={16} />
        {TOUR_CONVERT.cancel}
      </Button>
      <Button onClick={handleSubmit} disabled={isSubmitDisabled} variant="morandi-gold">
        <CheckSquare size="1em" />
        {submitLabel}
      </Button>
    </div>
  )

  return (
    <FormDialog
      open={isOpen}
      onOpenChange={open => !open && handleClose()}
      title={title}
      subtitle={description}
      onSubmit={handleSubmit}
      submitDisabled={isSubmitDisabled}
      loading={isSubmitting}
      footer={customFooter}
      maxWidth="4xl"
    >
      <div className="flex gap-6 mt-4">
        {/* 左邊：日期 + 團控 + 條件式城市 */}
        <div className="flex-1 space-y-4">
          <h3 className="text-base font-medium text-morandi-primary">
            {COMPONENT_LABELS.TOUR_INFO}
          </h3>

          <div className="text-sm text-morandi-primary font-medium">{tour.name}</div>

          <div>
            <label className="text-sm font-medium text-morandi-primary">
              {TOUR_CONVERT.label_departure}
            </label>
            <DatePicker
              value={departureDate}
              onChange={date => {
                setDepartureDate(date)
                if (returnDate && returnDate < date) {
                  setReturnDate(date)
                }
              }}
              className="mt-1"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-morandi-primary">
              {TOUR_CONVERT.label_return}
            </label>
            <DatePicker
              value={returnDate}
              onChange={setReturnDate}
              minDate={departureDate}
              defaultMonth={departureDate}
              className="mt-1"
              required
            />
          </div>

          {/* 團控（轉開團必填）*/}
          <div>
            <label className="text-sm font-medium text-morandi-primary">
              {COMPONENT_LABELS.CONTROLLER} <span className="text-status-danger">*</span>
            </label>
            <Select value={controllerId} onValueChange={setControllerId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={COMPONENT_LABELS.CONTROLLER_PLACEHOLDER} />
              </SelectTrigger>
              <SelectContent>
                {controllers.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.display_name || emp.english_name || emp.chinese_name} (
                    {emp.employee_number})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[0.588rem] text-morandi-muted mt-1">
              {COMPONENT_LABELS.CONTROLLER_HINT}
            </p>
          </div>

          {/* 目的地（只在提案沒選城市時出現）*/}
          {needsCityInput && (
            <div>
              <label className="text-sm font-medium text-morandi-primary">
                {COMPONENT_LABELS.CITY} <span className="text-status-danger">*</span>
              </label>
              <CountryAirportSelector
                countryName={countryName}
                airportCode={cityCode}
                onCountryChange={data => setCountryName(data.name || '')}
                onAirportChange={code => setCityCode(code || '')}
                showLabels={false}
              />
              <p className="text-[0.588rem] text-morandi-muted mt-1">
                {COMPONENT_LABELS.CITY_HINT}
              </p>
            </div>
          )}
        </div>

        {/* 分隔線 */}
        <div className="border-l border-border" />

        {/* 右邊：訂單 */}
        <div className="flex-1">
          <TourOrderSection newOrder={newOrder} setNewOrder={setNewOrder} />
        </div>
      </div>
    </FormDialog>
  )
}
