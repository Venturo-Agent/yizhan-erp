'use client'

/**
 * 報價草案 Dialog — 從拜訪 brand_card.priority_needs 對應到價目表
 */

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { Sparkles, ArrowRight, FileSpreadsheet } from 'lucide-react'

import { FormDialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'

import type { CisVisit, CisPricingItem, CisQuoteLine } from '@/types/cis.types'
import { buildQuoteDraft, formatTwd } from '@/lib/cis/quote-draft'

const PAGE_LABELS = {
  COL_ITEM: '項目',
  COL_MATCHED_NEED: '對應需求',
  COL_UNIT: '單位',
  COL_PRICE_RANGE: '價格區間',
} as const

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  visits: CisVisit[]
  pricingItems: CisPricingItem[]
  pricingLoading: boolean
  /** 轉換中、防連點（disable 確認 + 取消按鈕） */
  loading?: boolean
}

export function PricingDraftDialog({
  open,
  onOpenChange,
  visits,
  pricingItems,
  pricingLoading,
  loading = false,
}: Props) {
  const t = useTranslations('cis')
  const router = useRouter()
  const draft = useMemo(
    () => buildQuoteDraft(visits, pricingItems),
    [visits, pricingItems]
  )

  const totalNeeds =
    draft.must_do.length + draft.suggested.length + draft.optional.length

  const handleConvert = () => {
    if (loading) return
    toast(t('quoteStatusDev'), { duration: 6000 })
  }

  const showEmptyPricing = !pricingLoading && pricingItems.length === 0
  const showEmptyNeeds =
    !showEmptyPricing && totalNeeds === 0 && draft.unmatched_needs.length === 0

  const customFooter = (
    <div className="flex items-center justify-end gap-2">
      <Button
        variant="soft-gold"
        onClick={() => onOpenChange(false)}
        disabled={loading}
      >
        {t('quoteBtnClose')}
      </Button>
      {!showEmptyPricing && totalNeeds > 0 && (
        <Button onClick={handleConvert} disabled={loading}>
          <FileSpreadsheet size={14} className="mr-1" />
          {loading ? '處理中...' : '轉成正式報價單'}
        </Button>
      )}
    </div>
  )

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        <span className="flex items-center gap-2">
          <Sparkles size={18} className="text-morandi-gold" />
          {t('quoteDialogTitle')}
        </span>
      }
      subtitle={t('quoteSubtitle')}
      footer={customFooter}
      loading={loading}
      maxWidth="3xl"
      contentClassName="max-h-[90vh] overflow-y-auto"
    >
      <div className="grid gap-4 py-2">
        {showEmptyPricing && (
          <EmptyState
            message={t('quoteEmptyNoPricing')}
            actionLabel={t('quoteBtnSetupPricing')}
            onAction={() => {
              onOpenChange(false)
              router.push('/cis/pricing')
            }}
          />
        )}

        {showEmptyNeeds && <EmptyState message={t('quoteEmptyNoNeeds')} />}

        {!showEmptyPricing && !showEmptyNeeds && (
          <>
            <Bucket
              title={t('quoteSectionMustDo')}
              lines={draft.must_do}
              tone="danger"
              showTotal
            />
            <Bucket title={t('quoteSectionSuggested')} lines={draft.suggested} tone="gold" />
            <Bucket title={t('quoteSectionOptional')} lines={draft.optional} tone="secondary" />

            {draft.unmatched_needs.length > 0 && (
              <div className="rounded-md border border-status-warning/30 bg-status-warning-bg/40 p-3">
                <div className="text-xs font-semibold text-status-warning mb-1">
                  {t('quoteSectionUnmatched')}
                </div>
                <p className="text-[0.647rem] text-morandi-secondary mb-2">
                  {t('quoteUnmatchedHint')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {draft.unmatched_needs.map(n => (
                    <span
                      key={n}
                      className="text-xs px-2 py-0.5 rounded-full bg-status-warning-bg text-status-warning"
                    >
                      {n}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(draft.total_low > 0 || draft.total_high > 0) && (
              <div className="rounded-md border border-morandi-gold/40 bg-morandi-gold/8 p-3 flex items-center justify-between">
                <div className="text-xs font-medium text-morandi-secondary">
                  {t('quoteTotalLabel')}
                  <span className="ml-2 text-[0.588rem]">（必做項目區間）</span>
                </div>
                <div className="text-sm font-semibold text-morandi-gold">
                  {formatTwd(draft.total_low)} ～ {formatTwd(draft.total_high)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </FormDialog>
  )
}

function Bucket({
  title,
  lines,
  tone,
  showTotal,
}: {
  title: string
  lines: CisQuoteLine[]
  tone: 'danger' | 'gold' | 'secondary'
  showTotal?: boolean
}) {
  if (lines.length === 0) return null

  const headerCls =
    tone === 'danger'
      ? 'text-status-danger'
      : tone === 'gold'
        ? 'text-morandi-gold'
        : 'text-morandi-secondary'

  const sumLow = lines.reduce((s, l) => s + (Number(l.item.price_low) || 0), 0)
  const sumHigh = lines.reduce((s, l) => s + (Number(l.item.price_high) || 0), 0)

  return (
    <div className="space-y-2">
      <div className={`text-xs font-semibold ${headerCls}`}>{title}</div>
      <div className="rounded-md border border-morandi-muted/20 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-morandi-muted/8 text-morandi-secondary">
            <tr>
              <th className="text-left px-3 py-2 font-medium">{PAGE_LABELS.COL_ITEM}</th>
              <th className="text-left px-3 py-2 font-medium">{PAGE_LABELS.COL_MATCHED_NEED}</th>
              <th className="text-right px-3 py-2 font-medium">{PAGE_LABELS.COL_UNIT}</th>
              <th className="text-right px-3 py-2 font-medium">{PAGE_LABELS.COL_PRICE_RANGE}</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr
                key={`${l.item.id}-${i}`}
                className="border-t border-morandi-muted/10 hover:bg-morandi-muted/5"
              >
                <td className="px-3 py-2 text-morandi-primary">
                  <div className="font-medium">{l.item.name}</div>
                  <div className="text-[0.588rem] text-morandi-secondary font-mono">{l.item.code}</div>
                </td>
                <td className="px-3 py-2 text-morandi-secondary">
                  <span className="inline-flex items-center gap-1">
                    <ArrowRight size={10} />
                    {l.matched_need}
                  </span>
                </td>
                <td className="px-3 py-2 text-right text-morandi-secondary">{l.item.unit}</td>
                <td className="px-3 py-2 text-right text-morandi-primary tabular-nums">
                  {formatTwd(Number(l.item.price_low) || 0)} ～{' '}
                  {formatTwd(Number(l.item.price_high) || 0)}
                </td>
              </tr>
            ))}
            {showTotal && (
              <tr className="border-t border-morandi-muted/30 bg-morandi-muted/8">
                <td colSpan={3} className="px-3 py-2 text-right font-medium text-morandi-secondary">
                  小計
                </td>
                <td className="px-3 py-2 text-right font-semibold text-morandi-primary tabular-nums">
                  {formatTwd(sumLow)} ～ {formatTwd(sumHigh)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function EmptyState({
  message,
  actionLabel,
  onAction,
}: {
  message: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <div className="text-center py-8 px-4 border border-dashed border-morandi-muted/30 rounded-md">
      <p className="text-sm text-morandi-secondary mb-3">{message}</p>
      {actionLabel && onAction && (
        <Button size="sm" variant="soft-gold" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
