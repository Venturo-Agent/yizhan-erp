'use client'

/**
 * PNR 配對對話框
 *
 * 功能：
 * 1. 貼上 PNR 電報
 * 2. 自動解析旅客姓名
 * 3. 比對團員名單（護照拼音）
 * 4. 若團員名單為空或無匹配，自動從客戶資料庫搜尋
 * 5. 顯示配對結果與建議客戶
 * 6. 批量儲存 PNR 到團員或建立新團員
 */

import { useState, useMemo, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { isValidRecordLocator } from '@/lib/pnr-parser/utils'
import { Check, X, AlertCircle, Plane, Save, RefreshCw, Users } from 'lucide-react'
import { parseFlightConfirmation, type ParsedPNR } from '@/lib/pnr-parser'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { findBestMatch } from './pnr-name-matcher'
import { searchCustomersForPassengers, type SuggestedCustomer } from './pnr-customer-search'
import { useTranslations } from 'next-intl'

import { PnrSourceBadge } from './PnrMatchDialog.badge'
import { PnrMatchStats } from './PnrMatchDialog.stats'
import { PnrMatchTable } from './PnrMatchDialog.table'
import { UnmatchedMembersSection, FlightInfoSection } from './PnrMatchDialog.sections'
import { usePnrMatchSave } from './usePnrMatchSave'

interface TourMember {
  id: string
  chinese_name: string | null
  passport_name: string | null
  pnr?: string | null
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

interface PnrMatchDialogProps {
  isOpen: boolean
  onClose: () => void
  members: TourMember[]
  orderId?: string
  workspaceId?: string
  /** 旅遊團 ID，用於更新航班資訊 */
  tourId?: string
  /** 團體模式下的訂單列表（用於讓使用者選擇每位旅客屬於哪個訂單） */
  orders?: OrderInfo[]
  onSuccess?: () => void
}

export function PnrMatchDialog({
  isOpen,
  onClose,
  members,
  orderId,
  workspaceId,
  tourId: _tourId,
  orders = [],
  onSuccess,
}: PnrMatchDialogProps) {
  const t = useTranslations('orders')
  const [rawPnr, setRawPnr] = useState('')
  const [parsedPnr, setParsedPnr] = useState<ParsedPNR | null>(null)
  const [manualPnr, setManualPnr] = useState('')
  const [matchResults, setMatchResults] = useState<MatchResult[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [manualMatches, setManualMatches] = useState<Record<string, string>>({})
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false)
  const [selectedOrderIds, setSelectedOrderIds] = useState<Record<string, string>>({})

  const isTourMode = orders.length > 0

  const handleClose = useCallback(() => {
    setRawPnr('')
    setParsedPnr(null)
    setMatchResults([])
    setManualMatches({})
    setSelectedOrderIds({})
    onClose()
  }, [onClose])

  // 解析 PNR 並進行配對
  const handleParse = useCallback(async () => {
    if (!rawPnr.trim()) {
      toast.error(t('pastePnr'))
      return
    }

    const parsed = parseFlightConfirmation(rawPnr) as ParsedPNR
    setParsedPnr(parsed)
    setManualPnr(isValidRecordLocator(parsed.recordLocator) ? parsed.recordLocator : '')

    const memberResults = parsed.passengerNames.map(pnrName => ({
      pnrName,
      match: findBestMatch(pnrName, members),
    }))

    const exactCount = memberResults.filter(r => r.match.confidence === 'exact').length
    const partialCount = memberResults.filter(r => r.match.confidence === 'partial').length
    const noneCount = memberResults.filter(r => r.match.confidence === 'none').length

    const unmatchedNames = memberResults
      .filter(r => r.match.confidence !== 'exact')
      .map(r => r.pnrName)

    let customerSuggestions: Record<string, SuggestedCustomer[]> = {}
    if (unmatchedNames.length > 0) {
      setIsSearchingCustomers(true)
      customerSuggestions = await searchCustomersForPassengers(unmatchedNames)
      setIsSearchingCustomers(false)
    }

    const results: MatchResult[] = memberResults.map(({ pnrName, match }) => ({
      pnrPassenger: pnrName,
      matchedMember: match.member,
      suggestedCustomers: customerSuggestions[pnrName] || [],
      selectedCustomerId: null,
      confidence: match.confidence,
      score: match.score,
    }))

    setMatchResults(results)
    setManualMatches({})

    const suggestedCount = results.filter(r => r.suggestedCustomers.length > 0).length

    if (noneCount === 0 && partialCount === 0) {
      toast.success(`${t('allMatchedPrefix')}${results.length}${t('passengerUnit')}`)
    } else if (suggestedCount > 0) {
      toast.info(
        `${t('matchComplete')}${exactCount} ${t('fullMatch')}, ${partialCount} ${t('partialMatch')}, ${noneCount} ${t('noMatch')}${t('foundPrefix')}${suggestedCount}${t('possibleSuggestions')}`
      )
    } else {
      toast.info(
        `${t('matchComplete')}${exactCount} ${t('fullMatch')}, ${partialCount} ${t('partialMatch')}, ${noneCount} ${t('noMatch')}`
      )
    }

    if (parsed.fareData && parsed.sourceFormat === 'ticket_order_detail') {
      toast.success(`${t('parsedTicketAmount')}${parsed.fareData.totalFare.toLocaleString()}${t('amountPerPerson')}`)
    } else if (parsed.sourceFormat === 'ticket_order_detail' && !parsed.fareData) {
      toast.warning(t('ticketAmountWarning'))
    }
  }, [rawPnr, members])

  // 手動選擇配對（現有成員）或取消配對
  const handleManualMatch = (pnrPassenger: string, memberId: string) => {
    if (memberId === '__NONE__') {
      setManualMatches(prev => ({ ...prev, [pnrPassenger]: '__NONE__' }))
    } else if (memberId === '') {
      setManualMatches(prev => {
        const next = { ...prev }
        delete next[pnrPassenger]
        return next
      })
    } else {
      setManualMatches(prev => ({ ...prev, [pnrPassenger]: memberId }))
    }
    setMatchResults(prev =>
      prev.map(r => (r.pnrPassenger === pnrPassenger ? { ...r, selectedCustomerId: null } : r))
    )
  }

  // 選擇建議客戶
  const handleSelectCustomer = (pnrPassenger: string, customerId: string) => {
    setMatchResults(prev =>
      prev.map(r =>
        r.pnrPassenger === pnrPassenger ? { ...r, selectedCustomerId: customerId || null } : r
      )
    )
    if (customerId) {
      setManualMatches(prev => ({ ...prev, [pnrPassenger]: '__NONE__' }))
    } else {
      setManualMatches(prev => {
        const next = { ...prev }
        delete next[pnrPassenger]
        return next
      })
    }
  }

  // 團體模式：選擇旅客所屬的訂單
  const handleSelectOrder = (pnrPassenger: string, selectedOrderId: string) => {
    setSelectedOrderIds(prev => {
      if (selectedOrderId) return { ...prev, [pnrPassenger]: selectedOrderId }
      const next = { ...prev }
      delete next[pnrPassenger]
      return next
    })
  }

  // 團體模式：全部設為同一個訂單
  const handleSetAllOrders = (selectedOrderId: string) => {
    if (!selectedOrderId) { setSelectedOrderIds({}); return }
    const newIds: Record<string, string> = {}
    matchResults.forEach(r => { newIds[r.pnrPassenger] = selectedOrderId })
    setSelectedOrderIds(newIds)
  }

  // 計算最終配對結果（包含手動調整）
  const finalResults = useMemo(() => {
    return matchResults.map(result => {
      const manualMemberId = manualMatches[result.pnrPassenger]
      if (manualMemberId === '__NONE__') {
        return { ...result, matchedMember: null, confidence: 'none' as const, score: 0 }
      }
      if (manualMemberId) {
        const manualMember = members.find(m => m.id === manualMemberId) || null
        return {
          ...result,
          matchedMember: manualMember,
          confidence: manualMember ? ('exact' as const) : ('none' as const),
        }
      }
      return result
    })
  }, [matchResults, manualMatches, members])

  const stats = useMemo(() => {
    const exact = finalResults.filter(r => r.confidence === 'exact').length
    const partial = finalResults.filter(r => r.confidence === 'partial').length
    const none = finalResults.filter(r => r.confidence === 'none').length
    const withSuggestions = finalResults.filter(r => r.suggestedCustomers.length > 0 && !r.matchedMember).length
    const selectedCustomers = finalResults.filter(r => r.selectedCustomerId && !r.matchedMember).length
    return { exact, partial, none, withSuggestions, selectedCustomers, total: finalResults.length }
  }, [finalResults])

  const savableCount = useMemo(() => {
    const matchedCount = finalResults.filter(r => r.matchedMember).length
    const selectedCount = finalResults.filter(r => r.selectedCustomerId && !r.matchedMember).length
    return matchedCount + selectedCount
  }, [finalResults])

  const unmatchedMembers = useMemo(() => {
    const matchedIds = new Set(finalResults.map(r => r.matchedMember?.id).filter(Boolean))
    return members.filter(m => !matchedIds.has(m.id) && !m.pnr)
  }, [members, finalResults])

  const { handleSave } = usePnrMatchSave({
    parsedPnr,
    manualPnr,
    finalResults,
    isTourMode,
    orderId,
    workspaceId,
    selectedOrderIds,
    onSuccess,
    onClose: handleClose,
    setIsSaving,
  })

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && handleClose()}>
      <DialogContent level={2} className="w-[90vw] max-w-6xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plane size={20} className="text-morandi-gold" />
            {t('pnrMatch')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          {/* 輸入區域 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-morandi-primary">
              {t('pastePnr')}
            </label>
            <Textarea
              value={rawPnr}
              onChange={e => setRawPnr(e.target.value)}
              placeholder={t('pastePnrPlaceholder')}
              className="min-h-[120px] font-mono text-xs"
            />
            <div className="flex gap-2">
              <Button onClick={handleParse} disabled={!rawPnr.trim() || isSearchingCustomers}>
                <RefreshCw
                  size={16}
                  className={cn('mr-1', isSearchingCustomers && 'animate-spin')}
                />
                {isSearchingCustomers ? t('searchingCustomers') : t('parseAndMatch')}
              </Button>
            </div>

            {/* 解析後：訂位代號可編輯 input + 信心度 badge */}
            {parsedPnr && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-morandi-container/30">
                <label className="text-sm font-medium text-morandi-primary whitespace-nowrap">
                  {t('bookingCode2')}
                </label>
                <Input
                  value={manualPnr}
                  onChange={e => setManualPnr(e.target.value.toUpperCase())}
                  placeholder="請手動輸入訂位代號"
                  className={cn(
                    'w-40 font-mono text-sm',
                    !isValidRecordLocator(manualPnr) && 'border-status-danger'
                  )}
                  maxLength={8}
                />
                <PnrSourceBadge source={parsedPnr.recordLocatorSource} valid={isValidRecordLocator(manualPnr)} />
                {!isValidRecordLocator(manualPnr) && (
                  <span className="text-xs text-status-danger">
                    格式不對（需 5-8 字、純英數）
                  </span>
                )}
              </div>
            )}

            {/* 提示：無團員時會搜尋客戶資料庫 */}
            {members.length === 0 && (
              <p className="text-xs text-morandi-gold bg-morandi-gold/10 px-3 py-2 rounded-lg">
                <AlertCircle size={12} className="inline mr-1" />
                {t('noMembersHint')}
              </p>
            )}
          </div>

          {/* 配對結果 */}
          {matchResults.length > 0 && (
            <div className="space-y-3">
              <PnrMatchStats
                stats={stats}
                orderId={orderId}
                isTourMode={isTourMode}
                orders={orders}
                onSetAllOrders={handleSetAllOrders}
              />

              <PnrMatchTable
                finalResults={finalResults}
                members={members}
                orders={orders}
                isTourMode={isTourMode}
                manualMatches={manualMatches}
                selectedOrderIds={selectedOrderIds}
                onManualMatch={handleManualMatch}
                onSelectCustomer={handleSelectCustomer}
                onSelectOrder={handleSelectOrder}
              />

              <UnmatchedMembersSection unmatchedMembers={unmatchedMembers} />

              {parsedPnr && <FlightInfoSection parsedPnr={parsedPnr} />}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="soft-gold" className="gap-1" onClick={handleClose}>
            <X size={16} />
            {t('cancel')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!parsedPnr || savableCount === 0 || isSaving}
          >
            <Save size={16} className="mr-1" />
            {isSaving
              ? t('saving')
              : `${t('savePairs')} (${savableCount} ${t('personUnit')})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
