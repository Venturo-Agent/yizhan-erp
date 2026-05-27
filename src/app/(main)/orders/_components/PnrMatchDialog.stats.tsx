'use client'

import { Check, X, AlertTriangle, Users, UserPlus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'

// Radix Select 不允許 SelectItem value=""，placeholder 用哨兵；這個下拉是「選了就套用到全體」的指令式操作、
// 套用後 value 維持哨兵（顯示 placeholder）、讓使用者可重複套用同一張訂單（原生 select 選同值不會再觸發、此為改善）
const QUICK_SET_NONE = '__none__'

interface OrderInfo {
  id: string
  order_number: string
  contact_person: string | null
}

interface MatchStats {
  exact: number
  partial: number
  none: number
  withSuggestions: number
  selectedCustomers: number
  total: number
}

interface PnrMatchStatsProps {
  stats: MatchStats
  orderId?: string
  isTourMode: boolean
  orders: OrderInfo[]
  onSetAllOrders: (orderId: string) => void
}

// 配對統計 + 說明文字 + 團體模式快速設定訂單
export function PnrMatchStats({
  stats,
  orderId,
  isTourMode,
  orders,
  onSetAllOrders,
}: PnrMatchStatsProps) {
  const t = useTranslations('orders')
  return (
    <>
      {/* 統計 */}
      <div className="flex items-center gap-4 p-3 bg-morandi-container/30 rounded-lg flex-wrap">
        <span className="text-sm font-medium">{t('matchResult')}</span>
        <span className="flex items-center gap-1 text-sm text-status-success">
          <Check size={14} /> {stats.exact} {t('fullMatch')}
        </span>
        <span className="flex items-center gap-1 text-sm text-morandi-gold">
          <AlertTriangle size={14} /> {stats.partial} {t('partialMatch')}
        </span>
        <span className="flex items-center gap-1 text-sm text-status-danger">
          <X size={14} /> {stats.none} {t('noMatch')}
        </span>
        {stats.withSuggestions > 0 && (
          <span className="flex items-center gap-1 text-sm text-status-info">
            <Users size={14} /> {stats.withSuggestions} {t('hasSuggestedCustomers')}
          </span>
        )}
        {stats.selectedCustomers > 0 && (
          <span className="flex items-center gap-1 text-sm text-morandi-secondary">
            <UserPlus size={14} /> {stats.selectedCustomers} {t('hasSelectedCustomers')}
          </span>
        )}
      </div>

      {/* 說明文字 */}
      {stats.withSuggestions > 0 && (orderId || isTourMode) && (
        <div className="p-2 bg-status-info/10 rounded-lg text-xs text-status-info">
          <Users size={12} className="inline mr-1" />
          {t('suggestedCustomersDesc')}
          {isTourMode && t('selectOrderHint')}
        </div>
      )}
      {stats.withSuggestions > 0 && !orderId && !isTourMode && (
        <div className="p-2 bg-morandi-gold/10 rounded-lg text-xs text-morandi-gold">
          <AlertTriangle size={12} className="inline mr-1" />
          {t('suggestedNoOrderDesc')}
        </div>
      )}

      {/* 團體模式：快速設定所有人的訂單 */}
      {isTourMode && stats.withSuggestions > 0 && (
        <div className="flex items-center gap-2 p-2 bg-morandi-container/20 rounded-lg">
          <span className="text-xs text-morandi-secondary">{t('quickSetAllOrders')}</span>
          <Select
            value={QUICK_SET_NONE}
            onValueChange={v => {
              if (v !== QUICK_SET_NONE) onSetAllOrders(v)
            }}
          >
            <SelectTrigger className="h-auto w-auto px-2 py-1 text-xs">
              <SelectValue placeholder={t('pleaseSelect')} />
            </SelectTrigger>
            <SelectContent>
              {orders.map(o => (
                <SelectItem key={o.id} value={o.id}>
                  {o.order_number} - {o.contact_person || t('noContact')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </>
  )
}
