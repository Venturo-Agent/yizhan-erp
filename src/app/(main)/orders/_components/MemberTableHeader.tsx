'use client'
/**
 * MemberTableHeader - 成員表格標題列
 * 支援拖拉調整欄位寬度
 */

import React, { useCallback, useRef } from 'react'
import type { ColumnVisibility } from './OrderMembersExpandable'
import { useTranslations } from 'next-intl'

/* eslint-disable @typescript-eslint/no-explicit-any */
interface MemberTableHeaderProps {
  mode: 'order' | 'tour'
  orderCount: number
  showPnrColumn: boolean
  showSurchargeColumn?: boolean
  customCostFields: Array<{ id: string; name: string; values: Record<string, string> }>
  columnVisibility?: ColumnVisibility
  isEditMode?: boolean
  columnWidths?: Record<string, number>
  onColumnResize?: (columnId: string, width: number) => void
  // 分房分車冷凍中、props 接受但忽略（保留 caller layout）
  showRoomColumn?: boolean
  showVehicleColumn?: boolean
  hotelColumns?: any[]
}

// 預設欄位寬度
const DEFAULT_WIDTHS: Record<string, number> = {
  drag: 28,
  seq: 40,
  chinese_name: 80,
  order_code: 60,
  identity: 60,
  passport_name: 120,
  birth_date: 100,
  gender: 50,
  id_number: 100,
  passport_number: 100,
  passport_expiry: 100,
  special_meal: 80,
  total_payable: 80,
  deposit_amount: 80,
  balance: 80,
  remarks: 120,
  room: 100,
  vehicle: 80,
  pnr: 80,
  ticket_number: 120,
  ticketing_deadline: 100,
  flight_cost: 100,
  actions: 80,
}

const thBaseClass =
  'border border-morandi-gold/20 px-2 py-2 text-left text-xs font-medium text-morandi-primary bg-morandi-gold/10 relative'
const thStickyClass =
  'border border-morandi-gold/20 px-2 py-2 text-left text-xs font-medium text-morandi-primary bg-background sticky z-30 relative'

// 可調整寬度的表頭元件
function ResizableTh({
  columnId,
  width,
  onResize,
  className,
  children,
  title,
  style,
}: {
  columnId: string
  width: number
  onResize?: (columnId: string, width: number) => void
  className: string
  children: React.ReactNode
  title?: string
  style?: React.CSSProperties
}) {
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!onResize) return
      e.preventDefault()
      e.stopPropagation()
      startXRef.current = e.clientX
      startWidthRef.current = width

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const diff = moveEvent.clientX - startXRef.current
        const newWidth = Math.max(30, startWidthRef.current + diff)
        onResize(columnId, newWidth)
      }

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    [columnId, width, onResize]
  )

  return (
    <th
      className={className}
      style={{ width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px`, ...style }}
      title={title}
    >
      <div className="truncate pr-2">{children}</div>
      {onResize && (
        <div
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-morandi-gold/50 z-40"
          onMouseDown={handleMouseDown}
        />
      )}
    </th>
  )
}

export function MemberTableHeader({
  mode,
  orderCount,
  showPnrColumn,
  showSurchargeColumn = false,
  customCostFields,
  columnVisibility,
  columnWidths = {},
  onColumnResize,
}: MemberTableHeaderProps) {
  const t = useTranslations('orders')
  const cv = columnVisibility || {
    passport_name: true,
    birth_date: true,
    gender: true,
    id_number: true,
    passport_number: true,
    passport_expiry: true,
    special_meal: true,
    total_payable: false,
    deposit_amount: false,
    balance: false,
    remarks: true,
    room: true,
    vehicle: true,
    pnr: false,
    ticket_number: true,
    ticketing_deadline: false,
    flight_cost: false,
  }

  const getWidth = (id: string) => columnWidths[id] || DEFAULT_WIDTHS[id] || 80

  // sticky 位置（拖曳欄位一直存在）
  const seqLeft = 'left-[28px]'
  const nameLeft = 'left-[68px]'

  return (
    <thead className="sticky top-0 z-20 bg-background">
      <tr>
        {/* 拖曳把手欄位（固定寬度，不可調整） */}
        <th className={`${thStickyClass} left-0`} style={{ width: '28px', minWidth: '28px' }}></th>

        {/* 凍結欄位：序號 */}
        <ResizableTh
          columnId="seq"
          width={getWidth('seq')}
          onResize={onColumnResize}
          className={`${thStickyClass} ${seqLeft}`}
        >
          {t('memberTableSeq')}
        </ResizableTh>

        {/* 凍結欄位：中文姓名 */}
        <ResizableTh
          columnId="chinese_name"
          width={getWidth('chinese_name')}
          onResize={onColumnResize}
          className={`${thStickyClass} ${nameLeft}`}
        >
          {t('memberTableChineseName')}
        </ResizableTh>

        {/* 團體模式：訂單編號 */}
        {mode === 'tour' && orderCount > 1 && (
          <ResizableTh
            columnId="order_code"
            width={getWidth('order_code')}
            onResize={onColumnResize}
            className={thBaseClass}
          >
            {t('memberTableOrderCode')}
          </ResizableTh>
        )}

        {cv.passport_name && (
          <ResizableTh
            columnId="passport_name"
            width={getWidth('passport_name')}
            onResize={onColumnResize}
            className={thBaseClass}
          >
            {t('memberTablePassportName')}
          </ResizableTh>
        )}
        {cv.birth_date && (
          <ResizableTh
            columnId="birth_date"
            width={getWidth('birth_date')}
            onResize={onColumnResize}
            className={thBaseClass}
          >
            {t('memberTableBirthDate')}
          </ResizableTh>
        )}
        {cv.gender && (
          <ResizableTh
            columnId="gender"
            width={getWidth('gender')}
            onResize={onColumnResize}
            className={thBaseClass}
          >
            {t('memberTableGender')}
          </ResizableTh>
        )}
        {cv.id_number && (
          <ResizableTh
            columnId="id_number"
            width={getWidth('id_number')}
            onResize={onColumnResize}
            className={thBaseClass}
          >
            {t('memberTableIdNumber')}
          </ResizableTh>
        )}

        {/* 護照資訊 */}
        {cv.passport_number && (
          <ResizableTh
            columnId="passport_number"
            width={getWidth('passport_number')}
            onResize={onColumnResize}
            className={thBaseClass}
          >
            {t('memberTablePassportNumber')}
          </ResizableTh>
        )}
        {cv.passport_expiry && (
          <ResizableTh
            columnId="passport_expiry"
            width={getWidth('passport_expiry')}
            onResize={onColumnResize}
            className={thBaseClass}
          >
            {t('memberTablePassportExpiry')}
          </ResizableTh>
        )}

        {/* 其他資訊 */}
        {cv.special_meal && (
          <ResizableTh
            columnId="special_meal"
            width={getWidth('special_meal')}
            onResize={onColumnResize}
            className={thBaseClass}
          >
            {t('memberTableSpecialMeal')}
          </ResizableTh>
        )}

        {/* 金額 */}
        {cv.total_payable && (
          <ResizableTh
            columnId="total_payable"
            width={getWidth('total_payable')}
            onResize={onColumnResize}
            className={thBaseClass}
          >
            {t('memberTableTotalPayable')}
          </ResizableTh>
        )}
        {cv.deposit_amount && (
          <ResizableTh
            columnId="deposit_amount"
            width={getWidth('deposit_amount')}
            onResize={onColumnResize}
            className={thBaseClass}
          >
            {t('memberTableDeposit')}
          </ResizableTh>
        )}
        {cv.balance && (
          <ResizableTh
            columnId="balance"
            width={getWidth('balance')}
            onResize={onColumnResize}
            className={thBaseClass}
          >
            {t('memberTableBalance')}
          </ResizableTh>
        )}

        {/* 備註 */}
        {cv.remarks && (
          <ResizableTh
            columnId="remarks"
            width={getWidth('remarks')}
            onResize={onColumnResize}
            className={thBaseClass}
          >
            {t('memberTableRemarks')}
          </ResizableTh>
        )}

        {/* PNR 欄位:tour / order 兩種模式都顯示 */}
        {showPnrColumn && (
          <ResizableTh
            columnId="pnr"
            width={getWidth('pnr')}
            onResize={onColumnResize}
            className={thBaseClass}
          >
            PNR
          </ResizableTh>
        )}

        {/* 團體模式：機票號碼 */}
        {mode === 'tour' && cv.ticket_number && (
          <ResizableTh
            columnId="ticket_number"
            width={getWidth('ticket_number')}
            onResize={onColumnResize}
            className={thBaseClass}
          >
            {t('memberTableTicketNumber')}
          </ResizableTh>
        )}

        {/* 團體模式：開票期限 */}
        {mode === 'tour' && cv.ticketing_deadline && (
          <ResizableTh
            columnId="ticketing_deadline"
            width={getWidth('ticketing_deadline')}
            onResize={onColumnResize}
            className={thBaseClass}
          >
            {t('memberTableTicketingDeadline')}
          </ResizableTh>
        )}

        {/* 團體模式：機票金額 */}
        {mode === 'tour' && cv.flight_cost && (
          <ResizableTh
            columnId="flight_cost"
            width={getWidth('flight_cost')}
            onResize={onColumnResize}
            className={thBaseClass}
          >
            {t('memberTableFlightCost')}
          </ResizableTh>
        )}

        {/* 團體模式：附加費用 */}
        {mode === 'tour' && showSurchargeColumn && (
          <ResizableTh
            columnId="surcharges"
            width={getWidth('surcharges') || 120}
            onResize={onColumnResize}
            className={thBaseClass}
          >
            {t('memberTableSurcharge')}
          </ResizableTh>
        )}

        {/* 團體模式：自訂費用欄位 */}
        {mode === 'tour' &&
          customCostFields.map(field => (
            <ResizableTh
              key={field.id}
              columnId={`custom_${field.id}`}
              width={getWidth(`custom_${field.id}`) || 80}
              onResize={onColumnResize}
              className={thBaseClass}
            >
              {field.name}
            </ResizableTh>
          ))}

        {/* 操作 */}
        <th className={`${thBaseClass} text-left`} style={{ minWidth: '80px' }}>
          {t('memberTableActions')}
        </th>
      </tr>
    </thead>
  )
}
