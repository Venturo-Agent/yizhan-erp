'use client'

/**
 * BonusSettingsDialog — 獎金設定 Dialog（多列、仿請款單樣式）
 *
 * 設計重點：
 * - 預設 5 列：營收稅額 / OP / 業務 / 團隊 / 行政費用
 * - 已存在的 settings 直接帶入、缺的類型從 workspace defaults 補空白列
 * - 類別、員工、項目說明、單價、計算方式、金額（試算）皆 inline edit
 * - 行政費用列：計算方式鎖「元/人」、金額 = 單價 × 人數
 * - 「+ 新增獎金項目」可加列、滿足多 OP / 多業務需求
 *
 * 列資料管理已拆到 useBonusRows.ts。
 */

import { useMemo, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useAsyncSubmit } from '@/hooks/useAsyncSubmit'
import { FormDialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { InlineEditTable, type InlineEditColumn } from '@/components/ui/inline-edit-table'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { useAuthStore } from '@/stores/auth-store'
import { BonusSettingType, BonusCalculationType } from '@/types/bonus.types'
import type { Tour } from '@/stores/types'
import {
  useTourBonusSettings,
  useWorkspaceBonusDefaults,
  useEmployeesSlim,
  useMembers,
  useOrdersSlim,
  useReceipts,
  usePaymentRequests,
  createTourBonusSetting,
  updateTourBonusSetting,
  deleteTourBonusSetting,
  invalidateTourBonusSettings,
} from '@/data'
import { BONUS_TYPE_LABELS, BONUS_TAB_LABELS } from '../_constants/bonus-labels'
import { formatMoney } from '@/lib/utils/format-currency'
import { Spinner } from '@/components/ui/spinner'
import {
  useBonusRows,
  DEFAULT_TYPE_ORDER,
  isCostRow,
  isAdminRow,
  type BonusRow,
} from './useBonusRows'

const COMPONENT_LABELS = {
  SAVE_SUCCESS: '獎金設定已儲存',
  SAVE_FAILED: '儲存失敗',
  OPTIONAL_PLACEHOLDER: '（選填）',
  UNIT_DOLLAR: '元',
} as const

interface BonusSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tour: Tour
}

export function BonusSettingsDialog({ open, onOpenChange, tour }: BonusSettingsDialogProps) {
  const t = useTranslations('tour')
  const workspace_id = useAuthStore(s => s.user?.workspace_id) ?? ''

  const { items: allSettings } = useTourBonusSettings({
    all: true,
    filter: { tour_id: tour.id },
  })
  const { items: defaults } = useWorkspaceBonusDefaults({ all: true })
  const { items: employees } = useEmployeesSlim({ all: true })
  const { items: allMembers } = useMembers({ all: true })
  const { items: allOrders } = useOrdersSlim({ all: true, filter: { tour_id: tour.id } })
  const { items: allReceipts } = useReceipts({ all: true, filter: { tour_id: tour.id } })
  const { items: allPaymentRequests } = usePaymentRequests({
    all: true,
    filter: { tour_id: tour.id },
  })

  const orders = useMemo(
    () => (allOrders ?? []).filter(o => o.tour_id === tour.id),
    [allOrders, tour.id]
  )
  const orderIds = useMemo(() => new Set(orders.map(o => o.id)), [orders])
  const memberCount = useMemo(
    () => (allMembers ?? []).filter(m => m.order_id && orderIds.has(m.order_id)).length,
    [allMembers, orderIds]
  )

  const tourReceipts = useMemo(
    () =>
      (allReceipts ?? []).filter(
        r => r.tour_id === tour.id || (r.order_id && orderIds.has(r.order_id))
      ),
    [allReceipts, tour.id, orderIds]
  )
  const tourExpenses = useMemo(
    () =>
      (allPaymentRequests ?? [])
        .filter(pr => pr.tour_id === tour.id)
        .filter(pr => {
          const rt = (pr.request_type || '').toLowerCase()
          return !rt.includes('bonus') && !rt.includes('獎金')
        })
        .map(pr => ({ amount: Number(pr.amount) || 0 })),
    [allPaymentRequests, tour.id]
  )

  const existingSettings = useMemo(
    () => (allSettings ?? []).filter(s => s.tour_id === tour.id),
    [allSettings, tour.id]
  )

  const adaptedReceipts = useMemo(
    () =>
      tourReceipts.map(r => ({
        receipt_amount: r.receipt_amount,
        actual_amount: r.actual_amount,
      })),
    [tourReceipts]
  )

  const { rows, originalIds, profitContext, computeRowAmount, updateRow, addRow, removeRow } =
    useBonusRows({
      open,
      existingSettings,
      defaults: defaults ?? [],
      receipts: adaptedReceipts,
      expenses: tourExpenses,
      memberCount,
      workspace_id,
      tour_id: tour.id,
    })

  // === 員工選項 ===
  const employeeOptions = useMemo(
    () =>
      (employees ?? []).map(e => ({
        value: e.id,
        label: e.display_name || e.chinese_name || e.english_name || e.id,
      })),
    [employees]
  )

  // === Save: diff existing vs current rows ===
  const saveFn = useCallback(async () => {
    const currentIds = new Set(rows.filter(r => r.id).map(r => r.id as string))
    const toDelete = [...originalIds].filter(id => !currentIds.has(id))

    const tasks: Promise<unknown>[] = []

    for (const r of rows) {
      const payload = {
        type: r.type,
        bonus: Number(r.bonus) || 0,
        bonus_type: r.bonus_type,
        employee_id: r.employee_id,
        description: r.description.trim() || null,
        disbursement_date: null,
      }
      if (r.id) {
        tasks.push(updateTourBonusSetting(r.id, payload))
      } else {
        tasks.push(
          createTourBonusSetting({
            ...payload,
            workspace_id,
            tour_id: tour.id,
          })
        )
      }
    }

    for (const id of toDelete) {
      tasks.push(deleteTourBonusSetting(id))
    }

    await Promise.all(tasks)
    await invalidateTourBonusSettings()
    toast.success(COMPONENT_LABELS.SAVE_SUCCESS)
    onOpenChange(false)
  }, [rows, originalIds, workspace_id, tour.id, onOpenChange])

  const { isSubmitting: saving, execute: handleSave } = useAsyncSubmit(saveFn, {
    onError: (err) => {
      logger.error('儲存獎金設定失敗', err)
      toast.error(COMPONENT_LABELS.SAVE_FAILED)
    },
  })

  // === Columns ===
  const inputClass = 'input-no-focus w-full h-10 px-2 bg-transparent text-sm'

  const typeOptions = DEFAULT_TYPE_ORDER.map(t => ({
    value: String(t),
    label: BONUS_TYPE_LABELS[t],
  }))

  const columns: InlineEditColumn<BonusRow>[] = [
    {
      key: 'type',
      label: '類別',
      width: '120px',
      render: ({ row, onUpdate }) => (
        <Select
          value={String(row.type)}
          onValueChange={v => onUpdate({ type: Number(v) as BonusSettingType })}
        >
          <SelectTrigger className="input-no-focus h-10 border-0 shadow-none bg-transparent text-sm px-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {typeOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      key: 'employee',
      label: '員工',
      width: '160px',
      render: ({ row, onUpdate }) => {
        if (isCostRow(row.type)) {
          return <span className="text-xs text-morandi-muted/60 px-2">—</span>
        }
        return (
          <Combobox
            options={employeeOptions}
            value={row.employee_id ?? ''}
            onChange={v => onUpdate({ employee_id: v || null })}
            placeholder={COMPONENT_LABELS.OPTIONAL_PLACEHOLDER}
            className="input-no-focus [&_input]:h-9 [&_input]:px-1 [&_input]:bg-transparent"
            showSearchIcon={false}
          />
        )
      },
    },
    {
      key: 'bonus',
      label: '單價',
      width: '110px',
      align: 'right',
      render: ({ row, onUpdate }) => (
        <input
          type="number"
          value={row.bonus || ''}
          onChange={e => onUpdate({ bonus: Number(e.target.value) || 0 })}
          placeholder="0"
          min={0}
          step="0.01"
          className={`${inputClass} text-right placeholder:text-morandi-muted/60`}
        />
      ),
    },
    {
      key: 'bonus_type',
      label: '計算方式',
      width: '110px',
      render: ({ row, onUpdate }) => {
        if (isAdminRow(row.type)) {
          return <span className="text-xs text-morandi-muted/60 px-2">—</span>
        }
        return (
          <Select
            value={String(row.bonus_type)}
            onValueChange={v => onUpdate({ bonus_type: Number(v) as BonusCalculationType })}
          >
            <SelectTrigger className="input-no-focus h-10 border-0 shadow-none bg-transparent text-sm px-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={String(BonusCalculationType.PERCENT)}>%</SelectItem>
              <SelectItem value={String(BonusCalculationType.FIXED_AMOUNT)}>
                {COMPONENT_LABELS.UNIT_DOLLAR}
              </SelectItem>
            </SelectContent>
          </Select>
        )
      },
    },
    {
      key: 'amount',
      label: '金額（試算）',
      width: '120px',
      align: 'right',
      render: ({ row }) => {
        const amount = computeRowAmount(row)
        return (
          <span className="text-morandi-gold font-medium pr-2">
            {formatMoney(amount)}
          </span>
        )
      },
    },
  ]

  const customFooter = (
    <div className="flex items-center justify-end gap-2">
      <Button type="button" variant="soft-gold" onClick={() => onOpenChange(false)} disabled={saving}>
        {BONUS_TAB_LABELS.CANCEL}
      </Button>
      <Button type="button" onClick={handleSave} disabled={saving}>
        {saving ? <Spinner size="md" className="mr-2" /> : null}
        {BONUS_TAB_LABELS.SAVE}
      </Button>
    </div>
  )

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`${t('bonusSettingsTitle')} ${tour.code}${tour.name ? ` ${tour.name}` : ''}`}
      onSubmit={handleSave}
      submitDisabled={saving}
      loading={saving}
      footer={customFooter}
      level={1}
      maxWidth="5xl"
    >
      <div className="space-y-4 py-2">
        <div className="text-xs text-morandi-secondary flex flex-wrap gap-x-4 gap-y-1">
          <span>
            {t('bonusMemberCount')}
            {memberCount} {t('bonusMemberUnit')}
          </span>
          <span>
            {t('bonusReceiptEstimate')}
            {formatMoney(profitContext.receipt_total)}
          </span>
          <span>
            {t('bonusPaymentEstimate')}
            {formatMoney(profitContext.expense_total)}
          </span>
          <span>
            {t('bonusNetProfitEstimate')}
            {formatMoney(profitContext.net_profit)}
          </span>
        </div>

        <InlineEditTable<BonusRow>
          rows={rows}
          columns={columns}
          onUpdate={updateRow}
          onAdd={addRow}
          onRemove={removeRow}
          canRemove={() => true}
          addLabel="新增獎金項目"
          rowClassName={row =>
            isCostRow(row.type) ? 'bg-morandi-container/40' : undefined
          }
        />

        <p className="text-xs text-morandi-muted">{t('bonusAmountNote')}</p>
      </div>
    </FormDialog>
  )
}
