'use client'
/**
 * MemberBasicInfo - 成員基本資訊欄位
 * 包含：中文姓名、出生年月日、性別、身分證號
 */

import React, { useState, useEffect } from 'react'
import { EmptyValue } from '@/components/ui/empty-value'
import { cn } from '@/lib/utils'
import type { OrderMember } from '../../_types/order-member.types'
import type { ColumnVisibility } from '../OrderMembersExpandable'
import { useTranslations } from 'next-intl'

interface MemberBasicInfoProps {
  member: OrderMember
  index: number
  isEditMode: boolean
  showOrderCode: boolean
  columnVisibility?: ColumnVisibility
  onUpdateField: (memberId: string, field: keyof OrderMember, value: string | number | null) => void
  onKeyDown: (e: React.KeyboardEvent, memberIndex: number, field: string) => void
  onPaste?: (e: React.ClipboardEvent, memberIndex: number, field: string) => void
  onNameSearch?: (memberId: string, value: string) => void
  onIdNumberSearch?: (memberId: string, value: string, memberIndex: number) => void
}

export function MemberBasicInfo({
  member,
  index,
  isEditMode,
  showOrderCode,
  columnVisibility,
  onUpdateField,
  onKeyDown,
  onPaste,
  onNameSearch,
  onIdNumberSearch,
}: MemberBasicInfoProps) {
  const t = useTranslations('orders')
  const [isComposing, setIsComposing] = useState(false)

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

  // sticky 位置（拖曳欄位一直存在）
  const seqLeft = 'left-[28px]'
  const nameLeft = 'left-[68px]'

  // 日期輸入的本地狀態（避免每次按鍵都觸發 DB 更新）
  const [localBirthDate, setLocalBirthDate] = useState(member.birth_date || '')

  // 同步外部變化
  useEffect(() => {
    setLocalBirthDate(member.birth_date || '')
  }, [member.birth_date])

  // 處理日期輸入（自動格式化 YYYY-MM-DD）
  const handleDateInput = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '').slice(0, 8) // 最多 8 位數字

    // 格式化顯示
    let formatted = ''
    if (digitsOnly.length <= 4) {
      formatted = digitsOnly
    } else if (digitsOnly.length <= 6) {
      formatted = digitsOnly.slice(0, 4) + '-' + digitsOnly.slice(4)
    } else {
      formatted = digitsOnly.slice(0, 4) + '-' + digitsOnly.slice(4, 6) + '-' + digitsOnly.slice(6)
    }

    // 更新本地狀態（即時顯示）
    setLocalBirthDate(formatted)

    // 只有完整日期或空值才更新到 DB
    if (formatted.length === 10 || formatted === '') {
      onUpdateField(member.id, 'birth_date', formatted || null)
    }
  }

  // 失焦時儲存（即使不完整也存）
  const handleDateBlur = () => {
    if (localBirthDate !== (member.birth_date || '')) {
      // 只有完整日期才存，不完整就清空
      if (localBirthDate.length === 10) {
        onUpdateField(member.id, 'birth_date', localBirthDate)
      } else if (localBirthDate === '') {
        onUpdateField(member.id, 'birth_date', null)
      }
      // 不完整的日期保持原值
    }
  }

  return (
    <>
      {/* 序號 - 凍結欄位（使用實色背景避免內容穿透） */}
      <td
        className={cn(
          'border border-morandi-gold/20 px-2 py-1 bg-background text-center sticky z-10',
          seqLeft
        )}
      >
        <span className="text-xs text-morandi-secondary">{index + 1}</span>
      </td>

      {/* 中文姓名 - 凍結欄位（使用實色背景避免內容穿透） */}
      <td
        className={cn(
          'border border-morandi-gold/20 px-2 py-1 sticky z-10',
          nameLeft,
          isEditMode
            ? 'bg-card'
            : member.customer_verification_status === 'unverified'
              ? 'bg-status-danger-bg'
              : 'bg-background'
        )}
      >
        <div className="flex items-center gap-1">
          {isEditMode ? (
            <input
              type="text"
              value={member.chinese_name || ''}
              onChange={e => {
                onUpdateField(member.id, 'chinese_name', e.target.value)
              }}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={e => {
                setIsComposing(false)
                const value = e.currentTarget.value
                setTimeout(() => {
                  onUpdateField(member.id, 'chinese_name', value)
                }, 0)
              }}
              onKeyDown={e => {
                // 輸入法組字中，不處理任何鍵盤事件
                if (isComposing) return
                // 按 Enter 時觸發搜尋（避免輸入新客戶時被打斷）
                if (e.key === 'Enter') {
                  e.preventDefault()
                  onNameSearch?.(member.id, member.chinese_name || '')
                } else {
                  onKeyDown(e, index, 'chinese_name')
                }
              }}
              onPaste={e => onPaste?.(e, index, 'chinese_name')}
              data-member={member.id}
              data-field="chinese_name"
              className={cn(
                'flex-1 bg-transparent text-xs border-none outline-none shadow-none focus:ring-0 min-w-0',
                member.customer_verification_status === 'unverified'
                  ? 'text-status-danger font-medium'
                  : 'text-morandi-primary'
              )}
            />
          ) : (
            <div className="flex-1 flex items-center gap-1">
              <span
                className={cn(
                  'text-xs',
                  member.customer_verification_status === 'unverified'
                    ? 'text-status-danger font-medium'
                    : 'text-morandi-primary'
                )}
                title={
                  member.customer_verification_status === 'unverified'
                    ? t('pendingVerifyClickEdit')
                    : ''
                }
              >
                {member.chinese_name || <EmptyValue />}
              </span>
            </div>
          )}
        </div>
      </td>

      {/* 團體模式：訂單序號 */}
      {showOrderCode && (
        <td className="border border-morandi-gold/20 px-2 py-1 bg-status-info-bg text-center">
          <span className="text-xs text-status-info font-medium">
            {member.order_code ? member.order_code.slice(-3) : '-'}
          </span>
        </td>
      )}

      {/* 護照拼音 */}
      {cv.passport_name && (
        <td
          className={cn(
            'border border-morandi-gold/20 px-2 py-1',
            isEditMode ? 'bg-card' : 'bg-muted'
          )}
        >
          {isEditMode ? (
            <input
              type="text"
              value={member.passport_name || ''}
              onChange={e => onUpdateField(member.id, 'passport_name', e.target.value)}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={e => {
                setIsComposing(false)
                setTimeout(
                  () => onUpdateField(member.id, 'passport_name', e.currentTarget.value),
                  0
                )
              }}
              onKeyDown={e => {
                if (isComposing) return
                onKeyDown(e, index, 'passport_name')
              }}
              onPaste={e => onPaste?.(e, index, 'passport_name')}
              data-member={member.id}
              data-field="passport_name"
              className="w-full bg-transparent text-xs border-none outline-none shadow-none focus:ring-0 text-morandi-primary"
            />
          ) : (
            <span className="text-xs text-morandi-primary">{member.passport_name || <EmptyValue />}</span>
          )}
        </td>
      )}

      {/* 出生年月日 */}
      {cv.birth_date && (
        <td
          className={cn(
            'border border-morandi-gold/20 px-2 py-1',
            isEditMode ? 'bg-card' : 'bg-muted'
          )}
        >
          {isEditMode ? (
            <input
              type="text"
              value={localBirthDate}
              onChange={e => handleDateInput(e.target.value)}
              onBlur={handleDateBlur}
              onKeyDown={e => onKeyDown(e, index, 'birth_date')}
              onPaste={e => onPaste?.(e, index, 'birth_date')}
              data-member={member.id}
              data-field="birth_date"
              placeholder="YYYY-MM-DD"
              maxLength={10}
              className="w-full bg-transparent text-xs border-none outline-none shadow-none focus:ring-0 text-morandi-primary"
            />
          ) : (
            <span className="text-xs text-morandi-primary">{member.birth_date || <EmptyValue />}</span>
          )}
        </td>
      )}

      {/* 性別 */}
      {cv.gender && (
        <td
          className={cn(
            'border border-morandi-gold/20 px-2 py-1 text-xs text-center',
            isEditMode ? 'bg-card' : 'bg-muted'
          )}
        >
          {isEditMode ? (
            <select
              value={member.gender || ''}
              onChange={e => onUpdateField(member.id, 'gender', e.target.value)}
              data-member={member.id}
              data-field="gender"
              className="bg-transparent text-xs text-center border-none outline-none shadow-none cursor-pointer"
            >
              <option value="">-</option>
              <option value="M">{t('genderMale')}</option>
              <option value="F">{t('genderFemale')}</option>
            </select>
          ) : (
            <span className="text-morandi-primary">
              {member.gender === 'M'
                ? t('genderMale')
                : member.gender === 'F'
                  ? t('genderFemale')
                  : '-'}
            </span>
          )}
        </td>
      )}

      {/* 身分證號 */}
      {cv.id_number && (
        <td
          className={cn(
            'border border-morandi-gold/20 px-2 py-1',
            isEditMode ? 'bg-card' : 'bg-muted'
          )}
        >
          {isEditMode ? (
            <input
              type="text"
              value={member.id_number || ''}
              onChange={e => {
                onUpdateField(member.id, 'id_number', e.target.value)
              }}
              onKeyDown={e => {
                // 按 Enter 時觸發搜尋（避免輸入新客戶時被打斷）
                if (e.key === 'Enter') {
                  e.preventDefault()
                  onIdNumberSearch?.(member.id, member.id_number || '', index)
                } else {
                  onKeyDown(e, index, 'id_number')
                }
              }}
              onPaste={e => onPaste?.(e, index, 'id_number')}
              data-member={member.id}
              data-field="id_number"
              className="bg-transparent text-xs border-none outline-none shadow-none focus:ring-0 text-morandi-primary"
            />
          ) : (
            <span className="text-xs text-morandi-primary">{member.id_number || <EmptyValue />}</span>
          )}
        </td>
      )}
    </>
  )
}
