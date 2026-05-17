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
  pending_review: 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200',
  hk:            'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200',
  kk:            'bg-green-100 text-green-700 border-green-200 hover:bg-green-200',
  hl:            'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200',
  lk:            'bg-teal-100 text-teal-700 border-teal-200 hover:bg-teal-200',
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
          className="text-xs cursor-pointer text-green-700 font-medium"
        >
          {ORDER_STATUS_MAP['kk']}（開票確認）
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
