'use client'
/**
 * MemberPassportInfo - 成員護照資訊欄位
 * 包含：護照號碼、護照效期
 */

import React from 'react'
import { EmptyValue } from '@/components/ui/empty-value'
import { cn } from '@/lib/utils'
import { formatPassportExpiryWithStatus } from '@/lib/utils/passport-expiry'
import { formatDate } from '@/lib/utils/format-date'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import type { OrderMember } from '../../_types/order-member.types'
import type { ColumnVisibility } from '../OrderMembersExpandable'
import { useTranslations } from 'next-intl'

interface MemberPassportInfoProps {
  member: OrderMember
  index: number
  isEditMode: boolean
  departureDate: string | null
  columnVisibility?: ColumnVisibility
  onUpdateField: (memberId: string, field: keyof OrderMember, value: string | number | null) => void
  onKeyDown: (e: React.KeyboardEvent, memberIndex: number, field: string) => void
  onPaste?: (e: React.ClipboardEvent, memberIndex: number, field: string) => void
}

export function MemberPassportInfo({
  member,
  index,
  isEditMode,
  departureDate,
  columnVisibility,
  onUpdateField,
  onKeyDown,
  onPaste,
}: MemberPassportInfoProps) {
  const t = useTranslations('orders')
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
  }

  // 處理護照效期日期輸入
  const handlePassportExpiryInput = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '')
    let formatted = digitsOnly
    if (digitsOnly.length >= 4) {
      formatted = digitsOnly.slice(0, 4)
      if (digitsOnly.length >= 6) {
        formatted += '-' + digitsOnly.slice(4, 6)
        if (digitsOnly.length >= 8) {
          formatted += '-' + digitsOnly.slice(6, 8)
        }
      } else if (digitsOnly.length > 4) {
        formatted += '-' + digitsOnly.slice(4)
      }
    }
    onUpdateField(member.id, 'passport_expiry', formatted)
  }

  return (
    <>
      {/* 護照號碼 */}
      {cv.passport_number && (
        <td
          className={cn(
            'border border-morandi-gold/20 px-2 py-1',
            isEditMode ? 'bg-card' : 'bg-muted'
          )}
        >
          {isEditMode ? (
            <input
              type="text"
              value={member.passport_number || ''}
              onChange={e => onUpdateField(member.id, 'passport_number', e.target.value)}
              onKeyDown={e => onKeyDown(e, index, 'passport_number')}
              onPaste={e => onPaste?.(e, index, 'passport_number')}
              data-member={member.id}
              data-field="passport_number"
              className="w-full bg-transparent text-xs border-none outline-none shadow-none focus:ring-0 text-morandi-primary"
            />
          ) : (
            <span className="text-xs text-morandi-primary">{member.passport_number || <EmptyValue />}</span>
          )}
        </td>
      )}

      {/* 護照效期 */}
      {cv.passport_expiry && (
        <td
          className={cn(
            'border border-morandi-gold/20 px-2 py-1',
            isEditMode ? 'bg-card' : 'bg-muted'
          )}
        >
          {isEditMode ? (
            <input
              type="text"
              value={member.passport_expiry || ''}
              onChange={e => handlePassportExpiryInput(e.target.value)}
              onKeyDown={e => onKeyDown(e, index, 'passport_expiry')}
              onPaste={e => onPaste?.(e, index, 'passport_expiry')}
              data-member={member.id}
              data-field="passport_expiry"
              className="w-full bg-transparent text-xs border-none outline-none shadow-none focus:ring-0 text-morandi-primary"
            />
          ) : (
            (() => {
              const expiryInfo = formatPassportExpiryWithStatus(
                member.passport_expiry,
                departureDate
              )
              if (expiryInfo.statusLabel) {
                // 計算護照至少要有效到的日期（出發日 + 6個月）
                const getRequiredDate = () => {
                  if (!departureDate) return ''
                  const d = new Date(departureDate)
                  d.setMonth(d.getMonth() + 6)
                  return formatDate(d)
                }
                // 詳細說明
                const detailLabel =
                  expiryInfo.statusLabel === '效期不足'
                    ? t('passportRequiredDate', { date: getRequiredDate() })
                    : t('passportExpired')
                return (
                  <Tooltip>
                    <TooltipTrigger>
                      <span className={cn('text-xs cursor-help', expiryInfo.className)}>
                        {expiryInfo.text}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top">{detailLabel}</TooltipContent>
                  </Tooltip>
                )
              }
              return <span className={cn('text-xs', expiryInfo.className)}>{expiryInfo.text}</span>
            })()
          )}
        </td>
      )}
    </>
  )
}
