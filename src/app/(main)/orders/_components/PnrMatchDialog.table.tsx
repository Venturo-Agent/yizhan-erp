'use client'

import { Check, X, AlertCircle, UserPlus } from 'lucide-react'
import { EmptyValue } from '@/components/ui/empty-value'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

interface TourMember {
  id: string
  chinese_name: string | null
  passport_name: string | null
  pnr?: string | null
}

interface SuggestedCustomer {
  id: string
  name: string
  passport_name: string | null
  score: number
}

interface MatchResult {
  pnrPassenger: string
  matchedMember: TourMember | null
  suggestedCustomers: SuggestedCustomer[]
  selectedCustomerId: string | null
  confidence: 'exact' | 'partial' | 'none'
  score: number
}

interface OrderInfo {
  id: string
  order_number: string
  contact_person: string | null
}

interface PnrMatchTableProps {
  finalResults: MatchResult[]
  members: TourMember[]
  orders: OrderInfo[]
  isTourMode: boolean
  manualMatches: Record<string, string>
  selectedOrderIds: Record<string, string>
  onManualMatch: (pnrPassenger: string, memberId: string) => void
  onSelectCustomer: (pnrPassenger: string, customerId: string) => void
  onSelectOrder: (pnrPassenger: string, orderId: string) => void
}

// 配對列表表格
export function PnrMatchTable({
  finalResults,
  members,
  orders,
  isTourMode,
  manualMatches,
  selectedOrderIds,
  onManualMatch,
  onSelectCustomer,
  onSelectOrder,
}: PnrMatchTableProps) {
  const t = useTranslations('orders')
  return (
    <div className="border rounded-lg overflow-hidden overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-morandi-container/40">
          <tr>
            <th className="px-3 py-2 text-left font-medium whitespace-nowrap">
              {t('pnrPassenger')}
            </th>
            <th className="px-3 py-2 text-left font-medium whitespace-nowrap">
              {t('matchStatus')}
            </th>
            <th className="px-3 py-2 text-left font-medium whitespace-nowrap">
              {t('memberPassportPinyin')}
            </th>
            <th className="px-3 py-2 text-left font-medium whitespace-nowrap">
              {t('chineseName')}
            </th>
            <th className="px-3 py-2 text-left font-medium whitespace-nowrap">
              {t('manualSelect')}
            </th>
            <th className="px-3 py-2 text-left font-medium whitespace-nowrap">
              {t('suggestedCustomer')}
            </th>
            {isTourMode && (
              <th className="px-3 py-2 text-left font-medium whitespace-nowrap">
                {t('selectOrder')}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {finalResults.map((result, index) => (
            <tr
              key={index}
              className={cn(
                'border-t',
                result.selectedCustomerId && 'bg-morandi-container',
                !result.selectedCustomerId && result.confidence === 'none' && 'bg-morandi-red/10',
                !result.selectedCustomerId &&
                  result.confidence === 'partial' &&
                  'bg-morandi-gold/10'
              )}
            >
              <td className="px-3 py-2 font-mono whitespace-nowrap">{result.pnrPassenger}</td>
              <td className="px-3 py-2 whitespace-nowrap">
                {result.selectedCustomerId ? (
                  <span className="flex items-center gap-1 text-morandi-secondary">
                    <UserPlus size={14} /> {t('selectedCustomer')}
                  </span>
                ) : result.confidence === 'exact' ? (
                  <span className="flex items-center gap-1 text-morandi-green">
                    <Check size={14} /> {t('fullMatch')}
                  </span>
                ) : result.confidence === 'partial' ? (
                  <span className="flex items-center gap-1 text-morandi-gold">
                    <AlertCircle size={14} /> {t('partialMatch')}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-morandi-red">
                    <X size={14} /> {t('noMatch')}
                  </span>
                )}
              </td>
              <td className="px-3 py-2 font-mono whitespace-nowrap">
                {result.matchedMember?.passport_name || <EmptyValue />}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                {result.matchedMember?.chinese_name || <EmptyValue />}
              </td>
              <td className="px-3 py-2">
                <select
                  value={
                    manualMatches[result.pnrPassenger] === '__NONE__'
                      ? '__NONE__'
                      : manualMatches[result.pnrPassenger] || result.matchedMember?.id || ''
                  }
                  onChange={e => onManualMatch(result.pnrPassenger, e.target.value)}
                  className="text-xs border rounded px-2 py-1 w-full max-w-[150px]"
                  disabled={!!result.selectedCustomerId}
                >
                  <option value="">{t('autoMatch')}</option>
                  <option value="__NONE__">{t('cancelMatch')}</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.chinese_name || m.passport_name}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-3 py-2">
                {result.suggestedCustomers.length > 0 ? (
                  <select
                    value={result.selectedCustomerId || ''}
                    onChange={e => onSelectCustomer(result.pnrPassenger, e.target.value)}
                    className={cn(
                      'text-xs border rounded px-2 py-1 w-full max-w-[180px]',
                      result.selectedCustomerId && 'border-morandi-secondary bg-morandi-container'
                    )}
                    disabled={!!result.matchedMember && !result.selectedCustomerId}
                  >
                    <option value="">{t('selectCustomer')}</option>
                    {result.suggestedCustomers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.passport_name}) {c.score}%
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs text-morandi-muted">{t('noSuggestion')}</span>
                )}
              </td>
              {isTourMode && (
                <td className="px-3 py-2">
                  <select
                    value={selectedOrderIds[result.pnrPassenger] || ''}
                    onChange={e => onSelectOrder(result.pnrPassenger, e.target.value)}
                    className={cn(
                      'text-xs border rounded px-2 py-1 w-full max-w-[150px]',
                      selectedOrderIds[result.pnrPassenger] &&
                        'border-status-info bg-status-info/10'
                    )}
                  >
                    <option value="">{t('selectOrderPlaceholder')}</option>
                    {orders.map(o => (
                      <option key={o.id} value={o.id}>
                        {o.order_number} - {o.contact_person || t('noContact')}
                      </option>
                    ))}
                  </select>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
