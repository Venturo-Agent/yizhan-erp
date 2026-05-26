'use client'
/**
 * MemberActions - 成員操作按鈕
 * 包含：警告、編輯、刪除
 *
 */

import React from 'react'
import { AlertTriangle, Info, Trash2 } from 'lucide-react'
import type { OrderMember } from '../../_types/order-member.types'
import { useTranslations } from 'next-intl'

interface MemberActionsProps {
  member: OrderMember
  onEdit: (member: OrderMember, mode: 'verify' | 'edit') => void
  onDelete: (memberId: string) => void
}

export function MemberActions({ member, onEdit, onDelete }: MemberActionsProps) {
  const t = useTranslations('orders')
  return (
    <td className="border border-morandi-gold/20 px-2 py-1 bg-card">
      <div className="flex items-center gap-1">
        {/* 檢視明細（永遠有、固定第一個、跨列對齊）*/}
        <button
          type="button"
          className="p-1 text-morandi-secondary hover:text-morandi-gold hover:bg-morandi-gold/10 rounded transition-colors"
          title={t('viewDetail')}
          onClick={e => {
            e.stopPropagation()
            onEdit(member, 'edit')
          }}
        >
          <Info size={14} />
        </button>
        {/* 刪除（永遠有、固定第二個）*/}
        <button
          type="button"
          className="p-1 text-morandi-secondary hover:text-status-danger hover:bg-status-danger-bg rounded transition-colors"
          title={t('deleteMember')}
          onClick={e => {
            e.stopPropagation()
            onDelete(member.id)
          }}
        >
          <Trash2 size={14} />
        </button>
        {/* 待驗證警告（有條件、放最後、避免有的有有的沒有害前面圖示對不齊）*/}
        {member.customer_verification_status === 'unverified' && (
          <button
            type="button"
            className="p-1 text-status-warning hover:text-status-warning hover:bg-status-warning-bg rounded transition-colors"
            title={t('pendingVerifyClickToVerify')}
            onClick={e => {
              e.stopPropagation()
              onEdit(member, 'verify')
            }}
          >
            <AlertTriangle size={14} />
          </button>
        )}
      </div>
    </td>
  )
}
