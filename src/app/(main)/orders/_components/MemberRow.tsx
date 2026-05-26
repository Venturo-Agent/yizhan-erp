'use client'
/**
 * MemberRow - 成員行元件
 * 從 OrderMembersExpandable.tsx 拆分出來
 *
 * 功能：
 * - 顯示單個成員的所有資訊
 * - 支援編輯模式（行內編輯）
 * - 支援團體模式額外欄位
 */

import React, { useState, useCallback, useMemo } from 'react'
import { EmptyValue } from '@/components/ui/empty-value'
import { Check, GripVertical } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { getDragStyle } from '@/lib/dnd'
import { cn } from '@/lib/utils'
import type { OrderMember, CustomCostField } from '../_types/order-member.types'
import type { ColumnVisibility } from './OrderMembersExpandable'
import type { MemberSurcharges } from '../_types/member-surcharge.types'
import {
  MemberBasicInfo,
  MemberPassportInfo,
  MemberActions,
  MemberSurchargeCell,
} from './member-row'

import { useTranslations } from 'next-intl'

/* eslint-disable @typescript-eslint/no-explicit-any */
interface MemberRowProps {
  member: OrderMember
  index: number
  isEditMode: boolean
  showPnrColumn: boolean
  showOrderCode: boolean
  departureDate: string | null
  pnrValue?: string
  customCostFields: CustomCostField[]
  mode: 'order' | 'tour'
  columnVisibility?: ColumnVisibility
  onUpdateField: (memberId: string, field: keyof OrderMember, value: string | number | null) => void
  onDelete: (memberId: string) => void
  onEdit: (member: OrderMember, mode: 'verify' | 'edit') => void
  onPnrChange: (memberId: string, value: string) => void
  onCustomCostChange: (fieldId: string, memberId: string, value: string) => void
  onSurchargeChange?: (memberId: string, surcharges: MemberSurcharges) => void
  onKeyDown: (e: React.KeyboardEvent, memberIndex: number, field: string) => void
  onPaste?: (e: React.ClipboardEvent, memberIndex: number, field: string) => void
  onNameSearch?: (memberId: string, value: string) => void
  onIdNumberSearch?: (memberId: string, value: string, memberIndex: number) => void
  // 分房分車冷凍中、props 接受但忽略（保留 caller layout）
  showRoomColumn?: boolean
  showVehicleColumn?: boolean
  roomAssignment?: string
  vehicleAssignment?: string
  roomRowSpan?: number
  vehicleRowSpan?: number
  hotelColumns?: any[]
  roomAssignmentsByHotel?: Record<string, Record<string, string>>
  roomIdByHotelMember?: Record<string, Record<string, string>>
  roomMembersByHotelRoom?: Record<string, Record<string, any[]>>
  roomOptionsByHotel?: Record<string, any[]>
  roomRowSpansByHotel?: Record<string, Record<string, number>>
  onRoomAssign?: (...args: any[]) => void
  onRemoveMemberFromRoom?: (...args: any[]) => void
  tourInfo?: { id: string; code: string; name?: string }
  getOrderInfo?: (memberId: string) => any
}

export function MemberRow({
  member,
  index,
  isEditMode,
  showPnrColumn,
  showOrderCode,
  departureDate,
  pnrValue,
  customCostFields,
  mode,
  columnVisibility,
  onUpdateField,
  onDelete,
  onEdit,
  onPnrChange,
  onCustomCostChange,
  onSurchargeChange,
  onKeyDown,
  onPaste,
  onNameSearch,
  onIdNumberSearch,
}: MemberRowProps) {
  const t = useTranslations('orders')
  const [isComposing, setIsComposing] = useState(false)

  // 拖曳排序功能
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: member.id,
  })

  const style = getDragStyle({ transform, transition, isDragging })

  // sticky 位置（拖曳欄位一直存在）
  const _seqLeft = 'left-[28px]'
  const _nameLeft = 'left-[68px]'

  // 預設欄位顯示設定（訂金/尾款/應付金額 預設關閉）
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
    pnr: false,
    ticket_number: true, // 預設顯示機票號碼
    ticketing_deadline: false,
    flight_cost: false, // 機票金額預設關閉
    room: true, // 分房欄位
    vehicle: true, // 分車欄位
    surcharges: false, // 附加費用預設關閉
  }

  // 處理數字輸入
  const handleNumberInput = useCallback(
    (field: keyof OrderMember, value: string) => {
      const num = parseInt(value.replace(/\D/g, ''), 10)
      onUpdateField(member.id, field, isNaN(num) ? null : num)
    },
    [member.id, onUpdateField]
  )

  // 解析附加費用數據
  const memberSurcharges = useMemo(() => {
    if (!member.custom_costs || typeof member.custom_costs !== 'object') return null
    const customCosts = member.custom_costs as Record<string, unknown>
    return (customCosts.surcharges as MemberSurcharges) || null
  }, [member.custom_costs])

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`group relative hover:bg-morandi-container/20 transition-colors ${index % 2 === 0 ? 'bg-morandi-container/20' : ''}`}
    >
      {/* 拖曳把手（一直顯示） */}
      <td
        className="border border-morandi-gold/20 px-1 py-1 bg-background sticky left-0 z-10 cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical
          size={14}
          className="text-morandi-secondary/50 hover:text-morandi-secondary"
        />
      </td>

      {/* 基本資訊欄位 */}
      <MemberBasicInfo
        member={member}
        index={index}
        isEditMode={isEditMode}
        showOrderCode={showOrderCode}
        columnVisibility={cv}
        onUpdateField={onUpdateField}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        onNameSearch={onNameSearch}
        onIdNumberSearch={onIdNumberSearch}
      />

      {/* 護照資訊欄位 */}
      <MemberPassportInfo
        member={member}
        index={index}
        isEditMode={isEditMode}
        departureDate={departureDate}
        columnVisibility={cv}
        onUpdateField={onUpdateField}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
      />

      {/* 飲食禁忌 */}
      {cv.special_meal && (
        <td
          className={cn(
            'border border-morandi-gold/20 px-2 py-1',
            isEditMode ? 'bg-card' : 'bg-status-warning-bg'
          )}
        >
          {isEditMode ? (
            <input
              type="text"
              value={member.special_meal || ''}
              onChange={e => onUpdateField(member.id, 'special_meal', e.target.value)}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={e => {
                setIsComposing(false)
                setTimeout(() => onUpdateField(member.id, 'special_meal', e.currentTarget.value), 0)
              }}
              onKeyDown={e => {
                if (isComposing) return
                onKeyDown(e, index, 'special_meal')
              }}
              onPaste={e => onPaste?.(e, index, 'special_meal')}
              data-member={member.id}
              data-field="special_meal"
              className="bg-transparent text-xs border-none outline-none shadow-none focus:ring-0 text-morandi-primary"
            />
          ) : (
            <span className="text-xs text-morandi-primary">
              {member.special_meal || <EmptyValue />}
            </span>
          )}
        </td>
      )}

      {/* 應付金額 */}
      {cv.total_payable && (
        <td className="border border-morandi-gold/20 px-2 py-1 bg-card">
          <input
            type="text"
            inputMode="numeric"
            value={member.total_payable || ''}
            onChange={e => handleNumberInput('total_payable', e.target.value)}
            className="bg-transparent text-xs border-none outline-none shadow-none focus:ring-0 text-morandi-primary"
          />
        </td>
      )}

      {/* 訂金 */}
      {cv.deposit_amount && (
        <td className="border border-morandi-gold/20 px-2 py-1 bg-card">
          <input
            type="text"
            inputMode="numeric"
            value={member.deposit_amount || ''}
            onChange={e => handleNumberInput('deposit_amount', e.target.value)}
            className="bg-transparent text-xs border-none outline-none shadow-none focus:ring-0 text-morandi-primary"
          />
        </td>
      )}

      {/* 尾款 (自動計算) */}
      {cv.balance && (
        <td className="border border-morandi-gold/20 px-2 py-1 bg-muted text-xs text-center text-morandi-secondary">
          {((member.total_payable || 0) - (member.deposit_amount || 0)).toLocaleString()}
        </td>
      )}

      {/* 備註 */}
      {cv.remarks && (
        <td
          className={cn(
            'border border-morandi-gold/20 px-2 py-1',
            isEditMode ? 'bg-card' : 'bg-muted'
          )}
        >
          {isEditMode ? (
            <input
              type="text"
              value={member.remarks || ''}
              onChange={e => onUpdateField(member.id, 'remarks', e.target.value)}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={e => {
                setIsComposing(false)
                setTimeout(() => onUpdateField(member.id, 'remarks', e.currentTarget.value), 0)
              }}
              onKeyDown={e => {
                if (isComposing) return
                onKeyDown(e, index, 'remarks')
              }}
              onPaste={e => onPaste?.(e, index, 'remarks')}
              data-member={member.id}
              data-field="remarks"
              className="bg-transparent text-xs border-none outline-none shadow-none focus:ring-0 text-morandi-primary"
            />
          ) : (
            <span className="text-xs text-morandi-primary">{member.remarks || <EmptyValue />}</span>
          )}
        </td>
      )}

      {/* PNR 欄位：tour / order 兩種模式都支援（PNR 配對按鈕兩邊都能用） */}
      {showPnrColumn && (
        <td className="border border-morandi-gold/20 px-2 py-1 bg-status-info-bg/50">
          {isEditMode ? (
            <input
              type="text"
              value={pnrValue || ''}
              onChange={e => onPnrChange(member.id, e.target.value)}
              onBlur={e => {
                // 離開欄位時儲存到資料庫
                if (e.target.value !== member.pnr) {
                  onUpdateField(member.id, 'pnr', e.target.value)
                }
              }}
              className="bg-transparent text-xs border-none outline-none shadow-none focus:ring-0 text-morandi-primary"
            />
          ) : (
            <span className="text-xs text-morandi-primary">{member.pnr || <EmptyValue />}</span>
          )}
        </td>
      )}

      {/* 團體模式：機票號碼 */}
      {mode === 'tour' && cv.ticket_number && (
        <td className="border border-morandi-gold/20 px-2 py-1 bg-status-info-bg/50">
          {isEditMode ? (
            <input
              type="text"
              value={member.ticket_number || ''}
              onChange={e => onUpdateField(member.id, 'ticket_number', e.target.value)}
              className="bg-transparent text-xs border-none outline-none shadow-none focus:ring-0 text-morandi-primary"
            />
          ) : (
            <span className="text-xs text-morandi-primary">
              {member.ticket_number || <EmptyValue />}
            </span>
          )}
        </td>
      )}

      {/* 團體模式：開票期限 */}
      {mode === 'tour' && cv.ticketing_deadline && (
        <td className="border border-morandi-gold/20 px-2 py-1 bg-status-warning/10/50">
          {member.ticket_number ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-status-success/20 text-status-success text-xs rounded-full font-medium">
              <Check size={10} />
              {t('memberRowLabelTicketed')}
            </span>
          ) : isEditMode ? (
            <input
              type="date"
              value={member.ticketing_deadline ? member.ticketing_deadline.slice(0, 10) : ''}
              onChange={e => onUpdateField(member.id, 'ticketing_deadline', e.target.value || null)}
              className="bg-transparent text-xs border-none outline-none shadow-none focus:ring-0 text-morandi-primary"
            />
          ) : (
            <span className="text-xs text-morandi-primary">
              {member.ticketing_deadline ? member.ticketing_deadline.slice(0, 10) : '-'}
            </span>
          )}
        </td>
      )}

      {/* 團體模式：機票金額（成本，從機票訂單明細匯入） */}
      {mode === 'tour' && cv.flight_cost && (
        <td className="border border-morandi-gold/20 px-2 py-1 bg-status-info/10/50 text-xs text-right">
          {member.flight_cost ? member.flight_cost.toLocaleString() : '-'}
        </td>
      )}

      {/* 團體模式：附加費用 */}
      {mode === 'tour' && cv.surcharges && onSurchargeChange && (
        <MemberSurchargeCell
          memberId={member.id}
          memberName={member.chinese_name || member.passport_name || '成員'}
          surcharges={memberSurcharges}
          baseCost={member.selling_price ?? null}
          onChange={onSurchargeChange}
        />
      )}

      {/* 團體模式：自訂費用欄位 */}
      {mode === 'tour' &&
        customCostFields.map(field => (
          <td
            key={field.id}
            className="border border-morandi-gold/20 px-2 py-1 bg-status-success/10/50"
          >
            <input
              type="text"
              value={field.values[member.id] || ''}
              onChange={e => onCustomCostChange(field.id, member.id, e.target.value)}
              className="bg-transparent text-xs border-none outline-none shadow-none focus:ring-0 text-morandi-primary"
            />
          </td>
        ))}

      {/* 操作按鈕 */}
      <MemberActions member={member} onEdit={onEdit} onDelete={onDelete} />
    </tr>
  )
}
