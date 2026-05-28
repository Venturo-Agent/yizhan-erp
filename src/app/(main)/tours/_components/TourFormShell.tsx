'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  type DialogLevel,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { X, CheckSquare } from 'lucide-react'
import { NewTourData } from '../_types'
import type { OrderFormData } from '@/app/(main)/orders/_components/add-order-form'
import { TourBasicInfo, TourSettings, TourOrderSection } from './tour-form'
import { TOUR_FORM } from '../_constants'
import { TOUR_STATUS } from '@/lib/constants/status-maps'

interface TourFormShellProps {
  isOpen: boolean
  onClose: () => void
  mode: 'create' | 'edit'
  newTour: NewTourData
  setNewTour: React.Dispatch<React.SetStateAction<NewTourData>>
  newOrder: Partial<OrderFormData>
  setNewOrder: React.Dispatch<React.SetStateAction<Partial<OrderFormData>>>
  submitting: boolean
  formError: string | null
  onSubmit: () => void
  /** 是否為從提案轉開團（會顯示不同標題） */
  isFromProposal?: boolean
  /** Dialog 巢狀層級（預設 1；嵌進其他 level=1 dialog 時要設 2）*/
  dialogLevel?: DialogLevel
}

export function TourFormShell({
  isOpen,
  onClose,
  mode,
  newTour,
  setNewTour,
  newOrder,
  setNewOrder,
  submitting,
  formError,
  onSubmit,
  isFromProposal,
  dialogLevel = 1,
}: TourFormShellProps) {
  // SSOT：航班屬於旅遊團「行程編輯」分頁，開團時不再選填航班
  const isProposalOrTemplate =
    newTour.status === TOUR_STATUS.PROPOSAL || newTour.status === TOUR_STATUS.TEMPLATE

  // 決定標題
  const getTitle = () => {
    if (mode === 'edit') return TOUR_FORM.title_edit
    if (isFromProposal) return TOUR_FORM.title_convert
    if (newTour.status === TOUR_STATUS.PROPOSAL) return TOUR_FORM.title_create_proposal
    if (newTour.status === TOUR_STATUS.TEMPLATE) return TOUR_FORM.title_create_template
    return TOUR_FORM.title_create
  }

  // 決定送出按鈕文字
  const getSubmitLabel = () => {
    if (mode === 'edit') return submitting ? TOUR_FORM.submit_saving : TOUR_FORM.submit_save
    if (isFromProposal) {
      return submitting
        ? TOUR_FORM.submit_converting
        : newOrder.contact_person
          ? TOUR_FORM.submit_convert_with_order
          : TOUR_FORM.submit_convert
    }
    if (newTour.status === TOUR_STATUS.PROPOSAL)
      return submitting ? TOUR_FORM.submit_creating : TOUR_FORM.submit_create_proposal
    if (newTour.status === TOUR_STATUS.TEMPLATE)
      return submitting ? TOUR_FORM.submit_creating : TOUR_FORM.submit_create_template
    return submitting
      ? TOUR_FORM.submit_creating
      : newOrder.contact_person
        ? TOUR_FORM.submit_create_with_order
        : TOUR_FORM.submit_create
  }

  // 送出按鈕 disabled 條件
  const isSubmitDisabled = () => {
    if (submitting || !newTour.name.trim()) return true
    if (isProposalOrTemplate) return false // 提案/模板只需要名稱
    // 正式團需要日期
    if (!newTour.departure_date || !newTour.return_date) return true
    // 如果有填聯絡人（要建訂單），業務必填
    if (!!newOrder.contact_person?.trim() && !newOrder.sales_person?.trim()) return true
    return false
  }

  // 提案/模板用窄版（不需要訂單區塊）
  const dialogWidth = isProposalOrTemplate
    ? 'max-w-2xl'
    : mode === 'edit'
      ? 'max-w-3xl'
      : 'max-w-6xl'

  return (
    <Dialog
      open={isOpen}
      onOpenChange={open => {
        if (!open) {
          onClose()
        }
      }}
    >
      <DialogContent
        level={dialogLevel}
        className={`${dialogWidth} w-[90vw] h-[80vh] overflow-hidden`}
        aria-describedby={undefined}
        onInteractOutside={e => {
          const target = e.target as HTMLElement
          if (target.closest('[role="listbox"]') || target.closest('select')) {
            e.preventDefault()
          }
        }}
        onPointerDownOutside={e => {
          const target = e.target as HTMLElement
          // 允許點擊下拉選單（Combobox、Select 等）
          if (target.closest('[role="listbox"]') || target.closest('select')) {
            e.preventDefault()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>

        {/* Error message */}
        {formError && <Alert variant="danger" description={formError} className="mb-4" />}

        <div className="flex h-full overflow-hidden">
          {/* Left side - Tour info */}
          <div
            className={`flex-1 ${mode === 'create' && !isProposalOrTemplate ? 'pr-6 border-r border-border' : ''}`}
          >
            <div className="h-full overflow-y-auto">
              <h3 className="text-lg font-medium text-morandi-primary mb-4">
                {TOUR_FORM.section_info}
              </h3>
              <div className="space-y-4">
                <TourBasicInfo newTour={newTour} setNewTour={setNewTour} />

                {/* 備註欄位已隱藏（William 2026-05-28：內部備註沒意義、先藏）。
                    description state 保留、DB 欄位不動，要恢復見此 commit 的 git history。
                    團控（TourSettings）仍顯示、僅正式團。*/}
                {!isProposalOrTemplate && (
                  <TourSettings newTour={newTour} setNewTour={setNewTour} />
                )}
              </div>
            </div>
          </div>

          {/* Right side - Order info (只在正式團新增模式顯示) */}
          {mode === 'create' && !isProposalOrTemplate && (
            <div className="flex-1 pl-6">
              <div className="h-full overflow-y-auto">
                <TourOrderSection newOrder={newOrder} setNewOrder={setNewOrder} />
              </div>
            </div>
          )}
        </div>

        {/* Bottom buttons */}
        <div className="flex justify-end space-x-2 pt-6 border-t border-border mt-6">
          <Button variant="soft-gold" onClick={onClose} disabled={submitting} className="gap-2">
            <X size={16} />
            {TOUR_FORM.cancel}
          </Button>
          <Button variant="morandi-gold" onClick={onSubmit} disabled={isSubmitDisabled()}>
            <CheckSquare size="1em" />
            {getSubmitLabel()}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
