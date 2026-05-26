'use client'

import React from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { ChevronDown } from 'lucide-react'
import { ORDER_STATUS_MAP } from '@/lib/constants/status-maps'
import type { OrderStatus } from '@/types/order.types'

const STATUS_STYLES: Record<OrderStatus, string> = {
  // 待處理 = 待接手（警告）
  pending_review: 'bg-status-warning-bg text-status-warning border-status-warning/30',
  // 待確認 = 訂好等開票（進行中、資訊）
  hk: 'bg-status-info-bg text-status-info border-status-info/30',
  // 已確認 = 開票完成（成功）
  kk: 'bg-status-success-bg text-status-success border-status-success/30',
  // 候補 = 預留待定（中性）
  hl: 'bg-status-neutral-bg text-status-neutral border-status-neutral/30',
  // 候補成功未處理（資訊）
  lk: 'bg-status-info-bg text-status-info border-status-info/30',
}

const ALL_STATUSES: OrderStatus[] = ['pending_review', 'hk', 'kk', 'hl', 'lk']

interface OrderStatusBadgeProps {
  status: OrderStatus | null | undefined
  onChangeRequest: (newStatus: OrderStatus) => void
}

export function OrderStatusBadge({ status, onChangeRequest }: OrderStatusBadgeProps) {
  const current = (status ?? 'hk') as OrderStatus
  const label = ORDER_STATUS_MAP[current] ?? current
  const style = STATUS_STYLES[current] ?? ''

  // KK 已開票，不可逆，不給下拉
  if (current === 'kk') {
    return (
      <Badge variant="outline" className={`text-xs px-1.5 py-0 h-5 ${style}`}>
        {label}
      </Badge>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-0.5 rounded focus:outline-none focus:ring-1 focus:ring-ring">
          <Badge
            variant="outline"
            className={`cursor-pointer text-xs px-1.5 py-0 h-5 gap-0.5 ${style}`}
          >
            {label}
            <ChevronDown size={10} />
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-32">
        {ALL_STATUSES.filter(s => s !== current && s !== 'kk').map(s => (
          <DropdownMenuItem
            key={s}
            onClick={() => onChangeRequest(s)}
            className="text-xs cursor-pointer"
          >
            {ORDER_STATUS_MAP[s]}
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem
          onClick={() => onChangeRequest('kk')}
          className="text-xs cursor-pointer text-status-success font-medium"
        >
          {ORDER_STATUS_MAP['kk']}（開票確認）
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
