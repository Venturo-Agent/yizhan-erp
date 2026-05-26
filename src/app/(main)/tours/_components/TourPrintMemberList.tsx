'use client'

/**
 * TourPrintMemberList — 航班 / 住宿確認單的成員選擇列表（共用）
 *
 * 從 TourPrintDialog.tsx 拆出，方便獨立維護和測試。
 */

import React from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import type { OrderMember } from '@/app/(main)/orders/_types/order-member.types'

interface TourPrintMemberListProps {
  members: OrderMember[]
  selectedMembers: Set<string>
  toggleMember: (id: string) => void
  toggleAllMembers: () => void
  renderDetail: (member: OrderMember) => React.ReactNode
  renderBadge: (member: OrderMember) => React.ReactNode
}

/**
 * 成員選擇列表（航班/住宿共用）
 */
export function TourPrintMemberList({
  members,
  selectedMembers,
  toggleMember,
  toggleAllMembers,
  renderDetail,
  renderBadge,
}: TourPrintMemberListProps) {
  const t = useTranslations('tour')
  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm">
          {t('printSelectedCount', { selected: selectedMembers.size, total: members.length })}
        </span>
        <Button variant="ghost" size="sm" onClick={toggleAllMembers}>
          {selectedMembers.size === members.length ? t('printDeselectAll') : t('printSelectAll')}
        </Button>
      </div>
      <div className="max-h-[250px] overflow-y-auto border border-border rounded-lg">
        {members.map(member => (
          <label
            key={member.id}
            className="flex items-center gap-3 p-3 hover:bg-morandi-bg cursor-pointer border-b border-border/50 last:border-b-0"
          >
            <input
              type="checkbox"
              checked={selectedMembers.has(member.id)}
              onChange={() => toggleMember(member.id)}
              className="rounded border-border"
            />
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">
                {member.chinese_name || member.passport_name}
              </div>
              {renderDetail(member)}
            </div>
            {renderBadge(member)}
          </label>
        ))}
      </div>
    </>
  )
}
