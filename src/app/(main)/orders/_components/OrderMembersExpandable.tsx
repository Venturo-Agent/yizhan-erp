'use client'
/**
 * OrderMembersExpandable - 訂單成員管理主組件（完全重構版）
 *
 * 已整合：
 * - 6個 Hooks: useOrderMembersData, useRoomVehicleAssignments, useCustomerMatch, useMemberExport, useMemberEditDialog, usePassportUpload
 * - 9個組件: MemberRow, AddMemberDialog, MemberEditDialog, ExportDialog, PassportUploadZone, OrderSelectDialog, CustomerMatchDialog, CustomCostFieldsSection, MemberTableHeader
 *
 * 功能：成員管理、分房分車、護照上傳、PNR 匹配、自訂費用
 *
 * 拆分紀錄（2026-05-16）:
 * - 類型/常數 → OrderMembersExpandable.types.ts
 * - 工具列 JSX → OrderMembersExpandable.toolbar.tsx
 * - Dialogs JSX → OrderMembersExpandable.dialogs.tsx
 * - 邏輯 hooks → useEditModeSyncCustomers, useMemberFieldHandlers, useMemberTableActions
 */

import React, { useState, useMemo, useEffect, useRef } from 'react'
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDefaultDndSensors } from '@/lib/dnd'
import { prompt } from '@/lib/ui/alert-dialog'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { useOcrRecognition } from '@/hooks'
import { useIsIntegrationEnabled } from '@/lib/permissions/useIntegrationEnabled'
import { useCustomers, useTour } from '@/data'
import {
  useOrderMembersData,
  useRoomVehicleAssignments,
  useCustomerMatch,
  useMemberExport,
  useMemberEditDialog,
  usePassportUpload,
  useColumnWidths,
  useEditModeSyncCustomers,
  useMemberFieldHandlers,
  useMemberTableActions,
} from '../_hooks'
import { MemberRow, MemberTableHeader } from './'
import { OrderMembersToolbar } from './OrderMembersExpandable.toolbar'
import { OrderMembersDialogs } from './OrderMembersExpandable.dialogs'
import type {
  OrderMember,
  OrderMembersExpandableProps,
  CustomCostField,
} from '../_types/order-member.types'
import { computeRowSpans } from '../_utils'
import { defaultColumnVisibility } from './OrderMembersExpandable.types'
import type { ColumnVisibility } from './OrderMembersExpandable.types'

// Re-export so existing importers of ColumnVisibility from this file still work
export type { ColumnVisibility } from './OrderMembersExpandable.types'

export function OrderMembersExpandable({
  orderId,
  tourId,
  workspaceId,
  onClose: _onClose,
  mode: propMode,
  embedded = false,
  forceShowPnr = false,
  tour,
  onChildDialogChange: _onChildDialogChange,
  showPnrMatchDialog: parentShowPnrMatchDialog,
  onPnrMatchDialogChange,
  onPnrMatchSuccess,
}: OrderMembersExpandableProps & { onChildDialogChange?: (hasOpen: boolean) => void }) {
  const mode = propMode || (orderId ? 'order' : 'tour')

  // 資料 Hooks
  const { items: customers } = useCustomers({ all: true })
  const { item: fetchedTour } = useTour(tour ? null : tourId)
  const effectiveTour = tour || fetchedTour
  const membersData = useOrderMembersData({ orderId, tourId, workspaceId, mode })
  const roomVehicle = useRoomVehicleAssignments({
    tourId,
    departureDate: membersData.departureDate,
  })
  const customerMatch = useCustomerMatch(customers, membersData.members, membersData.setMembers)
  const memberExport = useMemberExport(membersData.members)
  const memberEdit = useMemberEditDialog({
    members: membersData.members,
    setMembers: membersData.setMembers,
  })

  const effectiveOrderId =
    orderId ||
    membersData.selectedOrderIdForAdd ||
    (membersData.tourOrders.length === 1 ? membersData.tourOrders[0]?.id : undefined)

  const passportUpload = usePassportUpload({
    orderId: effectiveOrderId,
    workspaceId,
    onSuccess: membersData.loadMembers,
  })
  const ocr = useOcrRecognition()
  const { enabled: passportOcrEnabled } = useIsIntegrationEnabled('passport_ocr')
  const { columnWidths, setColumnWidth } = useColumnWidths()
  const sensors = useDefaultDndSensors()

  // 編輯模式 + 自動同步顧客
  const { isAllEditMode, handleToggleEditMode } = useEditModeSyncCustomers({
    members: membersData.members,
  })

  // 欄位更新 + 附加費用
  const { handleUpdateField, handleSurchargeChange } = useMemberFieldHandlers({
    members: membersData.members,
    setMembers: membersData.setMembers,
  })

  // UI State
  const [isComposing] = useState(false)
  const [customCostFields, setCustomCostFields] = useState<CustomCostField[]>([])

  // 從 DB 載入自訂費用欄位定義和值（custom_cost_fields 寫在 tour 表、跨 mode 共用）
  useEffect(() => {
    if (!tourId) return
    const loadCustomCosts = async () => {
      try {
        const { data: tourData } = await supabase
          .from('tours')
          .select('custom_cost_fields')
          .eq('id', tourId)
          .single()
        const rawData = tourData as Record<string, unknown> | null
        const fieldDefs: Array<{ id: string; name: string }> =
          (rawData?.custom_cost_fields as Array<{ id: string; name: string }>) || []
        if (fieldDefs.length === 0) return

        const memberIds = membersData.members.map(m => m.id)
        if (memberIds.length === 0) {
          setCustomCostFields(fieldDefs.map(f => ({ ...f, values: {} })))
          return
        }
        const { data: membersWithCosts } = await supabase
          .from('order_members')
          .select('id, custom_costs')
          .in('id', memberIds)

        const fields: CustomCostField[] = fieldDefs.map(f => {
          const values: Record<string, string> = {}
          for (const m of (membersWithCosts || []) as unknown as Array<{
            id: string
            custom_costs: Record<string, string> | null
          }>) {
            const costs = (m.custom_costs || {}) as Record<string, string>
            if (costs[f.id]) values[m.id] = costs[f.id]
          }
          return { ...f, values }
        })
        setCustomCostFields(fields)
      } catch (err) {
        logger.error('載入自訂費用欄位失敗', err)
      }
    }
    loadCustomCosts()
  }, [tourId, mode, membersData.members.length])

  const [pnrValues, setPnrValues] = useState<Record<string, string>>({})

  // 從 localStorage 讀取欄位顯示設定
  const COLUMN_VISIBILITY_KEY = 'memberListColumnVisibility_v2'
  const getInitialColumnVisibility = (): ColumnVisibility => {
    if (typeof window === 'undefined') return defaultColumnVisibility
    try {
      const saved = localStorage.getItem(COLUMN_VISIBILITY_KEY)
      if (saved) {
        return { ...defaultColumnVisibility, ...JSON.parse(saved) }
      }
    } catch {
      // ignore
    }
    return defaultColumnVisibility
  }

  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(
    getInitialColumnVisibility
  )

  // PNR Dialog：支援父組件控制（避免多重遮罩問題）
  const [internalShowPnrMatchDialog, setInternalShowPnrMatchDialog] = useState(false)
  const isParentControlledPnrDialog = parentShowPnrMatchDialog !== undefined
  const showPnrMatchDialog = isParentControlledPnrDialog
    ? parentShowPnrMatchDialog
    : internalShowPnrMatchDialog
  const setShowPnrMatchDialog = isParentControlledPnrDialog
    ? (show: boolean) => onPnrMatchDialogChange?.(show)
    : setInternalShowPnrMatchDialog

  // 帳單 Dialog（William 2026-05-14）
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false)

  // 欄位可見性 toggle
  const toggleColumnVisibility = (column: keyof ColumnVisibility) => {
    setColumnVisibility(prev => ({ ...prev, [column]: !prev[column] }))
  }

  // 初始化標記（避免初次渲染觸發 localStorage 保存）
  const isInitialMount = useRef(true)

  useEffect(() => {
    if (isInitialMount.current) return
    localStorage.setItem(COLUMN_VISIBILITY_KEY, JSON.stringify(columnVisibility))
  }, [columnVisibility])

  useEffect(() => {
    isInitialMount.current = false
  }, [])

  // forceShowPnr 時自動開啟 PNR 欄位
  useEffect(() => {
    if (forceShowPnr) {
      setColumnVisibility(prev => {
        if (prev.pnr) return prev
        return { ...prev, pnr: true }
      })
    }
  }, [forceShowPnr])

  // 父組件控制 PNR Dialog 關閉時重新載入成員
  const prevShowPnrMatchDialog = useRef(showPnrMatchDialog)
  useEffect(() => {
    if (isParentControlledPnrDialog && prevShowPnrMatchDialog.current && !showPnrMatchDialog) {
      membersData.loadMembers()
    }
    prevShowPnrMatchDialog.current = showPnrMatchDialog
  }, [isParentControlledPnrDialog, showPnrMatchDialog, membersData])

  // 從 members 初始化 pnrValues
  React.useEffect(() => {
    const initialPnrValues: Record<string, string> = {}
    membersData.members.forEach(m => {
      if (m.pnr) initialPnrValues[m.id] = m.pnr
    })
    setPnrValues(initialPnrValues)
  }, [membersData.members])

  // 排序後的成員列表
  const sortedMembers = useMemo(() => {
    if (roomVehicle.showRoomColumn && Object.keys(roomVehicle.roomSortKeys).length > 0) {
      return [...membersData.members].sort((a, b) => {
        const aKey = roomVehicle.roomSortKeys[a.id]
        const bKey = roomVehicle.roomSortKeys[b.id]
        const aHasRoom = aKey !== undefined
        const bHasRoom = bKey !== undefined
        if (aHasRoom && !bHasRoom) return -1
        if (!aHasRoom && bHasRoom) return 1
        if (aHasRoom && bHasRoom) {
          const roomDiff = Math.floor(aKey / 10) - Math.floor(bKey / 10)
          if (roomDiff !== 0) return roomDiff
          return (a.sort_order ?? 999) - (b.sort_order ?? 999)
        }
        return (a.sort_order ?? 999) - (b.sort_order ?? 999)
      })
    }
    return [...membersData.members].sort((a, b) => {
      // 團體模式：先按單號分組（O01 整批排完、再排 O02…），同一張單內才按 sort_order。
      // 否則各訂單的 sort_order 都從 1 起跳、全部混排會讓不同訂單的成員交叉穿插。
      // order_code 是完整單號字串（非純數字）、同團各單共用前綴只差尾碼、字串比較即可正確分組。
      if (mode === 'tour') {
        const aCode = (a as { order_code?: string | null }).order_code ?? ''
        const bCode = (b as { order_code?: string | null }).order_code ?? ''
        if (aCode !== bCode) {
          if (!aCode) return 1 // 沒單號（理論上不會發生）排最後
          if (!bCode) return -1
          return aCode.localeCompare(bCode)
        }
      }
      const sortDiff = (a.sort_order ?? 999) - (b.sort_order ?? 999)
      if (sortDiff !== 0) return sortDiff
      return a.id.localeCompare(b.id)
    })
  }, [membersData.members, roomVehicle.showRoomColumn, roomVehicle.roomSortKeys, mode])

  // 分房/分車合併行數
  const rowSpans = useMemo(
    () =>
      computeRowSpans({
        sortedMembers,
        roomAssignments: roomVehicle.roomAssignments,
        vehicleAssignments: roomVehicle.vehicleAssignments,
        hotelColumns: roomVehicle.hotelColumns,
        roomAssignmentsByHotel: roomVehicle.roomAssignmentsByHotel,
      }),
    [
      sortedMembers,
      roomVehicle.roomAssignments,
      roomVehicle.vehicleAssignments,
      roomVehicle.hotelColumns,
      roomVehicle.roomAssignmentsByHotel,
    ]
  )

  // DnD + 鍵盤導航 + 批量貼上
  const { handleDragEnd, handleKeyDown, handlePaste } = useMemberTableActions({
    members: membersData.members,
    membersData,
    roomVehicle,
    sortedMembers,
    isComposing,
  })

  return (
    <div
      className={`flex flex-col h-full overflow-hidden ${embedded ? 'bg-morandi-gold-light/40 rounded-lg border border-morandi-gold/30' : 'border border-border rounded-xl bg-card'}`}
    >
      {/* 工具列 */}
      <OrderMembersToolbar
        mode={mode}
        embedded={embedded}
        memberCount={sortedMembers.length}
        isAllEditMode={isAllEditMode}
        onToggleEditMode={handleToggleEditMode}
        effectiveOrderId={effectiveOrderId}
        tourId={tourId}
        customCostFields={customCostFields}
        setCustomCostFields={setCustomCostFields}
        onOpenPnrDialog={() => setShowPnrMatchDialog(true)}
        onOpenInvoiceDialog={() => setShowInvoiceDialog(true)}
        onOpenExportDialog={() => memberExport.setIsExportDialogOpen(true)}
        onAddMember={membersData.handleAddMember}
        columnVisibility={columnVisibility}
        onToggleColumnVisibility={toggleColumnVisibility}
        showRoomColumn={roomVehicle.showRoomColumn}
        showVehicleColumn={roomVehicle.showVehicleColumn}
      />

      {/* 表格 */}
      <div className="flex-1 overflow-auto">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <table className="border-collapse text-sm member-table-inline table-fixed w-full">
            <MemberTableHeader
              mode={mode}
              orderCount={membersData.orderCount}
              showPnrColumn={columnVisibility.pnr}
              showRoomColumn={roomVehicle.showRoomColumn && columnVisibility.room}
              showVehicleColumn={roomVehicle.showVehicleColumn && columnVisibility.vehicle}
              showSurchargeColumn={columnVisibility.surcharges}
              hotelColumns={roomVehicle.hotelColumns}
              customCostFields={customCostFields}
              columnVisibility={columnVisibility}
              isEditMode={isAllEditMode}
              columnWidths={columnWidths}
              onColumnResize={setColumnWidth}
            />
            <SortableContext
              items={sortedMembers.map(m => m.id)}
              strategy={verticalListSortingStrategy}
            >
              <tbody>
                {sortedMembers.map((member, index) => (
                  <MemberRow
                    key={member.id}
                    tourInfo={
                      effectiveTour
                        ? {
                            id: effectiveTour.id,
                            code: effectiveTour.code,
                            name: effectiveTour.name,
                          }
                        : undefined
                    }
                    getOrderInfo={memberId => {
                      const m = membersData.members.find(x => x.id === memberId)
                      const orderIdForMember = (m as { order_id?: string } | undefined)?.order_id
                      const targetOrderId = orderIdForMember || effectiveOrderId
                      if (!targetOrderId) return undefined
                      const o = membersData.tourOrders.find(x => x.id === targetOrderId)
                      if (!o) return undefined
                      return {
                        id: o.id,
                        order_number: (o as { order_number?: string }).order_number || '',
                        contact_person: (o as { contact_person?: string | null }).contact_person,
                        contact_phone: (o as { contact_phone?: string | null }).contact_phone,
                      }
                    }}
                    member={member}
                    index={index}
                    isEditMode={isAllEditMode}
                    showPnrColumn={columnVisibility.pnr}
                    showRoomColumn={roomVehicle.showRoomColumn && columnVisibility.room}
                    showVehicleColumn={roomVehicle.showVehicleColumn && columnVisibility.vehicle}
                    showOrderCode={mode === 'tour' && membersData.orderCount > 1}
                    departureDate={membersData.departureDate}
                    roomAssignment={roomVehicle.roomAssignments[member.id]}
                    vehicleAssignment={roomVehicle.vehicleAssignments[member.id]}
                    roomRowSpan={rowSpans.roomSpans[member.id]}
                    vehicleRowSpan={rowSpans.vehicleSpans[member.id]}
                    hotelColumns={roomVehicle.hotelColumns}
                    roomAssignmentsByHotel={roomVehicle.roomAssignmentsByHotel}
                    roomIdByHotelMember={roomVehicle.roomIdByHotelMember}
                    roomMembersByHotelRoom={roomVehicle.roomMembersByHotelRoom}
                    roomOptionsByHotel={roomVehicle.roomOptionsByHotel}
                    roomRowSpansByHotel={rowSpans.roomSpansByHotel}
                    pnrValue={pnrValues[member.id]}
                    onRoomAssign={roomVehicle.assignMemberToRoom}
                    onRemoveMemberFromRoom={roomVehicle.removeMemberFromRoom}
                    customCostFields={customCostFields}
                    mode={mode}
                    columnVisibility={columnVisibility}
                    onUpdateField={handleUpdateField}
                    onDelete={membersData.handleDeleteMember}
                    onEdit={memberEdit.openEditDialog}
                    onPnrChange={(id, val) => setPnrValues({ ...pnrValues, [id]: val })}
                    onCustomCostChange={async (fId, mId, val) => {
                      setCustomCostFields(
                        customCostFields.map(f =>
                          f.id === fId ? { ...f, values: { ...f.values, [mId]: val } } : f
                        )
                      )
                      try {
                        const { data: existing } = await supabase
                          .from('order_members')
                          .select('custom_costs')
                          .eq('id', mId)
                          .single()
                        const existingRaw = existing as Record<string, unknown> | null
                        const currentCosts =
                          (existingRaw?.custom_costs as Record<string, string>) || {}
                        const updatedCosts = { ...currentCosts, [fId]: val }
                        await supabase
                          .from('order_members')
                          .update({ custom_costs: updatedCosts } as Record<string, unknown>)
                          .eq('id', mId)
                      } catch (err) {
                        logger.error('儲存自訂費用失敗', err)
                      }
                    }}
                    onSurchargeChange={handleSurchargeChange}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    onNameSearch={(memberId, value) => {
                      const memberIndex = membersData.members.findIndex(m => m.id === memberId)
                      if (memberIndex >= 0) {
                        customerMatch.checkCustomerMatchByName(
                          value,
                          memberIndex,
                          membersData.members[memberIndex]
                        )
                      }
                    }}
                    onIdNumberSearch={(memberId, value, memberIndex) => {
                      customerMatch.checkCustomerMatchByIdNumber(
                        value,
                        memberIndex,
                        membersData.members[memberIndex]
                      )
                    }}
                  />
                ))}
              </tbody>
            </SortableContext>
          </table>
        </DndContext>
      </div>

      {/* Dialogs */}
      <OrderMembersDialogs
        passportUpload={passportUpload}
        membersData={membersData}
        customerMatch={customerMatch}
        memberEdit={memberEdit}
        tourPrint={{
          effectiveTour,
          isExportDialogOpen: memberExport.isExportDialogOpen,
          setIsExportDialogOpen: memberExport.setIsExportDialogOpen,
        }}
        pnrDialog={{
          isParentControlledPnrDialog,
          showPnrMatchDialog,
          setShowPnrMatchDialog,
          orderId,
          workspaceId,
          tourId,
          onPnrMatchSuccess,
          onShowPnrColumn: () => setColumnVisibility(prev => ({ ...prev, pnr: true })),
        }}
        invoiceDialog={{
          showInvoiceDialog,
          setShowInvoiceDialog,
          effectiveOrderId,
          orderCode:
            membersData.members.find((m: OrderMember) => m.order_id === effectiveOrderId)
              ?.order_code || null,
          sortedMembers,
        }}
        ocr={ocr}
        passportOcrEnabled={passportOcrEnabled}
      />
    </div>
  )
}
