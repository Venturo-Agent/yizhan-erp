'use client'

import { Check, X, AlertTriangle, UserPlus } from 'lucide-react'
import { EmptyValue } from '@/components/ui/empty-value'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

// Radix Select 不允許 SelectItem value=""，用哨兵值代表原本的空字串選項（送回 handler 時換回 ''）
// 注意：'__NONE__'（取消配對）是業務既有值、原樣保留、不是哨兵
const AUTO_MATCH = '__AUTO_MATCH__' // 手動選擇欄的「自動配對」（原 value=""）
const SELECT_CUSTOMER = '__SELECT_CUSTOMER__' // 建議客戶欄的「請選擇」（原 value=""）
const SELECT_ORDER = '__SELECT_ORDER__' // 選擇訂單欄的「請選擇」（原 value=""）

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
                !result.selectedCustomerId && result.confidence === 'none' && 'bg-status-danger/10',
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
                  <span className="flex items-center gap-1 text-status-success">
                    <Check size={14} /> {t('fullMatch')}
                  </span>
                ) : result.confidence === 'partial' ? (
                  <span className="flex items-center gap-1 text-morandi-gold">
                    <AlertTriangle size={14} /> {t('partialMatch')}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-status-danger">
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
                <Select
                  value={
                    manualMatches[result.pnrPassenger] === '__NONE__'
                      ? '__NONE__'
                      : manualMatches[result.pnrPassenger] || result.matchedMember?.id || AUTO_MATCH
                  }
                  onValueChange={v => onManualMatch(result.pnrPassenger, v === AUTO_MATCH ? '' : v)}
                  disabled={!!result.selectedCustomerId}
                >
                  <SelectTrigger className="text-xs h-auto py-1 w-full max-w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={AUTO_MATCH}>{t('autoMatch')}</SelectItem>
                    <SelectItem value="__NONE__">{t('cancelMatch')}</SelectItem>
                    {members.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.chinese_name || m.passport_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              <td className="px-3 py-2">
                {result.suggestedCustomers.length > 0 ? (
                  <Select
                    value={result.selectedCustomerId || SELECT_CUSTOMER}
                    onValueChange={v =>
                      onSelectCustomer(result.pnrPassenger, v === SELECT_CUSTOMER ? '' : v)
                    }
                    disabled={!!result.matchedMember && !result.selectedCustomerId}
                  >
                    <SelectTrigger
                      className={cn(
                        'text-xs h-auto py-1 w-full max-w-[180px]',
                        result.selectedCustomerId && 'border-morandi-secondary bg-morandi-container'
                      )}
                    >
                      <SelectValue placeholder={t('selectCustomer')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SELECT_CUSTOMER}>{t('selectCustomer')}</SelectItem>
                      {result.suggestedCustomers.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} ({c.passport_name}) {c.score}%
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-xs text-morandi-muted">{t('noSuggestion')}</span>
                )}
              </td>
              {isTourMode && (
                <td className="px-3 py-2">
                  <Select
                    value={selectedOrderIds[result.pnrPassenger] || SELECT_ORDER}
                    onValueChange={v =>
                      onSelectOrder(result.pnrPassenger, v === SELECT_ORDER ? '' : v)
                    }
                  >
                    <SelectTrigger
                      className={cn(
                        'text-xs h-auto py-1 w-full max-w-[150px]',
                        selectedOrderIds[result.pnrPassenger] &&
                          'border-status-info bg-status-info/10'
                      )}
                    >
                      <SelectValue placeholder={t('selectOrderPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SELECT_ORDER}>{t('selectOrderPlaceholder')}</SelectItem>
                      {orders.map(o => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.order_number} - {o.contact_person || t('noContact')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
