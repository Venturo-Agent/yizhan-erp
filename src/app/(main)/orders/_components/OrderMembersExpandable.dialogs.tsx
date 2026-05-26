'use client'
/**
 * OrderMembersDialogs — 團員名單區塊的所有 Dialog 集合
 *
 * 從 OrderMembersExpandable 拆出，只負責渲染 Dialog 節點。
 * 業務邏輯、state 全部由 props 傳入，此組件不持有 state。
 *
 * 使用 ReturnType<typeof hook> 確保 props 型別與 hooks 完全對齊。
 */

import React from 'react'
import dynamic from 'next/dynamic'
import { CreateInvoicesDialog } from './CreateInvoicesDialog'
import {
  AddMemberDialog,
  MemberEditDialog,
  OrderSelectDialog,
  CustomerMatchDialog,
  PnrMatchDialog,
} from './'
import { PassportConflictDialog } from './PassportConflictDialog'
import { CustomerMatchConfirmDialog } from './CustomerMatchConfirmDialog'
import { BatchCustomerMatchDialog } from './BatchCustomerMatchDialog'
import type { EditFormData } from './MemberEditDialog'
import type {
  usePassportUpload,
  useOrderMembersData,
  useCustomerMatch,
  useMemberEditDialog,
  useMemberExport,
  useBatchCustomerMatch,
} from '../_hooks'
import type { OrderMember } from '../_types/order-member.types'
import type { Tour } from '@/stores/types'
import { useOcrRecognition } from '@/hooks'

const TourPrintDialog = dynamic(
  () => import('@/app/(main)/tours/_components/TourPrintDialog').then(m => m.TourPrintDialog),
  { ssr: false }
)

export interface OrderMembersDialogsProps {
  passportUpload: ReturnType<typeof usePassportUpload>
  membersData: Pick<
    ReturnType<typeof useOrderMembersData>,
    | 'isAddDialogOpen'
    | 'setIsAddDialogOpen'
    | 'memberCountToAdd'
    | 'setMemberCountToAdd'
    | 'confirmAddMembers'
    | 'showOrderSelectDialog'
    | 'setShowOrderSelectDialog'
    | 'tourOrders'
    | 'setSelectedOrderIdForAdd'
    | 'loadMembers'
    | 'members'
  >
  customerMatch: ReturnType<typeof useCustomerMatch>
  memberEdit: ReturnType<typeof useMemberEditDialog>
  batchMatch: ReturnType<typeof useBatchCustomerMatch>
  tourPrint: {
    effectiveTour: Tour | null | undefined
    isExportDialogOpen: ReturnType<typeof useMemberExport>['isExportDialogOpen']
    setIsExportDialogOpen: ReturnType<typeof useMemberExport>['setIsExportDialogOpen']
  }
  pnrDialog: {
    isParentControlledPnrDialog: boolean
    showPnrMatchDialog: boolean
    setShowPnrMatchDialog: (show: boolean) => void
    orderId: string | null | undefined
    workspaceId: string
    tourId: string | null | undefined
    onPnrMatchSuccess?: () => void
    onShowPnrColumn: () => void
  }
  invoiceDialog: {
    showInvoiceDialog: boolean
    setShowInvoiceDialog: (open: boolean) => void
    effectiveOrderId: string | undefined
    orderCode: string | null
    sortedMembers: OrderMember[]
  }
  ocr: ReturnType<typeof useOcrRecognition>
  passportOcrEnabled: boolean
}

export function OrderMembersDialogs({
  passportUpload,
  membersData,
  customerMatch,
  memberEdit,
  batchMatch,
  tourPrint,
  pnrDialog,
  invoiceDialog,
  ocr,
  passportOcrEnabled,
}: OrderMembersDialogsProps) {
  return (
    <>
      <AddMemberDialog
        isOpen={membersData.isAddDialogOpen}
        memberCount={membersData.memberCountToAdd}
        processedFiles={passportUpload.processedFiles}
        isUploading={passportUpload.isUploading}
        isDragging={passportUpload.isDragging}
        isProcessing={passportUpload.isProcessing}
        onClose={() => membersData.setIsAddDialogOpen(false)}
        onConfirm={membersData.confirmAddMembers}
        onCountChange={membersData.setMemberCountToAdd}
        onFileChange={passportUpload.handleFileChange}
        onDragOver={passportUpload.handleDragOver}
        onDragLeave={passportUpload.handleDragLeave}
        onDrop={passportUpload.handleDrop}
        onRemoveFile={passportUpload.handleRemoveFile}
        onBatchUpload={passportUpload.handleBatchUpload}
        onUpdateFilePreview={passportUpload.handleUpdateFilePreview}
        pendingConfirmations={passportUpload.pendingConfirmations}
        onConfirmUpdate={passportUpload.confirmUpdate}
        onRejectUpdate={passportUpload.rejectUpdate}
        onConfirmAllUpdates={passportUpload.confirmAllUpdates}
        onRejectAllUpdates={passportUpload.rejectAllUpdates}
        passportOcrEnabled={passportOcrEnabled}
      />
      <OrderSelectDialog
        isOpen={membersData.showOrderSelectDialog}
        orders={membersData.tourOrders}
        onClose={() => membersData.setShowOrderSelectDialog(false)}
        onSelect={oid => {
          membersData.setSelectedOrderIdForAdd(oid)
          membersData.setIsAddDialogOpen(true)
        }}
      />
      <CustomerMatchDialog
        isOpen={customerMatch.showCustomerMatchDialog}
        customers={customerMatch.matchedCustomers}
        matchType={customerMatch.matchType}
        onClose={customerMatch.closeCustomerMatchDialog}
        onSelect={customerMatch.handleSelectCustomer}
      />
      {/* PNR 配對 Dialog：只有在非父組件控制模式下才渲染，否則由父組件渲染（避免多重遮罩） */}
      {!pnrDialog.isParentControlledPnrDialog && (
        <PnrMatchDialog
          isOpen={pnrDialog.showPnrMatchDialog}
          onClose={() => pnrDialog.setShowPnrMatchDialog(false)}
          members={membersData.members.map(m => ({
            id: m.id,
            chinese_name: m.chinese_name ?? null,
            passport_name: m.passport_name ?? null,
            pnr: m.pnr,
          }))}
          orderId={
            pnrDialog.orderId ||
            (membersData.tourOrders.length === 1 ? membersData.tourOrders[0].id : undefined)
          }
          workspaceId={pnrDialog.workspaceId}
          tourId={pnrDialog.tourId ?? undefined}
          onSuccess={() => {
            membersData.loadMembers()
            // PNR 配對成功後自動顯示 PNR 欄位
            pnrDialog.onShowPnrColumn()
            pnrDialog.onPnrMatchSuccess?.()
          }}
        />
      )}
      <MemberEditDialog
        isOpen={memberEdit.isEditDialogOpen}
        editMode={memberEdit.editMode}
        editingMember={memberEdit.editingMember}
        editFormData={memberEdit.editFormData as EditFormData}
        isSaving={memberEdit.isSaving}
        isRecognizing={ocr.isRecognizing}
        onClose={() => memberEdit.setIsEditDialogOpen(false)}
        onFormDataChange={data => memberEdit.setEditFormData(data)}
        onMemberChange={memberEdit.setEditingMember}
        onSave={memberEdit.handleSaveEdit}
        onRecognize={url =>
          ocr.recognizePassport(url, data =>
            memberEdit.setEditFormData(prev => ({
              ...prev,
              ...(data.name && { chinese_name: data.name }),
              ...(data.passport_name && { passport_name: data.passport_name }),
              ...(data.passport_number && { passport_number: data.passport_number }),
              ...(data.passport_expiry && { passport_expiry: data.passport_expiry }),
              ...(data.birth_date && { birth_date: data.birth_date }),
              ...(data.gender && { gender: data.gender }),
              ...(data.national_id && { id_number: data.national_id }),
            }))
          )
        }
      />
      {/* 撞名確認對話框（單筆驗證時、身分證沒比中但名字撞到既有顧客）*/}
      <CustomerMatchConfirmDialog
        open={memberEdit.clashDialogOpen}
        pendingForm={memberEdit.clashPendingForm}
        candidates={memberEdit.clashCandidates}
        loading={memberEdit.isResolvingClash}
        onClose={memberEdit.closeClashDialog}
        onUpdateExisting={memberEdit.resolveClashUpdateExisting}
        onCreateNew={memberEdit.resolveClashCreateNew}
      />
      {/* 批次「比對顧客」審核清單 */}
      <BatchCustomerMatchDialog
        open={batchMatch.isOpen}
        rows={batchMatch.rows}
        isApplying={batchMatch.isApplying}
        onClose={batchMatch.closeBatchMatch}
        onChangeResolution={batchMatch.setRowResolution}
        onApplyAll={batchMatch.applyAll}
      />
      {tourPrint.effectiveTour && (
        <TourPrintDialog
          isOpen={tourPrint.isExportDialogOpen}
          tour={tourPrint.effectiveTour}
          members={membersData.members}
          onClose={() => tourPrint.setIsExportDialogOpen(false)}
        />
      )}
      <PassportConflictDialog
        open={passportUpload.conflictDialogOpen}
        onOpenChange={passportUpload.setConflictDialogOpen}
        conflicts={passportUpload.conflicts}
        passportData={passportUpload.conflictPassportData || {}}
      />
      {/* 帳單 Dialog（William 2026-05-14）*/}
      {invoiceDialog.effectiveOrderId && (
        <CreateInvoicesDialog
          open={invoiceDialog.showInvoiceDialog}
          onClose={() => invoiceDialog.setShowInvoiceDialog(false)}
          orderId={invoiceDialog.effectiveOrderId}
          orderCode={invoiceDialog.orderCode}
          members={invoiceDialog.sortedMembers}
        />
      )}
    </>
  )
}
