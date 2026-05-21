/**
 * AddRequestDialog.batch-tab.tsx
 *
 * 批量請款分頁的 JSX（從 AddRequestDialog 抽出）。
 * 接收所有需要的 state / callback 作為 props。
 */

import { TabsContent } from '@/components/ui/tabs'
import { Combobox } from '@/components/ui/combobox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CurrencyCell } from '@/components/table-cells'
import { InlineEditTable, type InlineEditColumn } from '@/components/ui/inline-edit-table'
import { useExpenseCategories } from '@/data/entities'
import { TourAllocation, COMPONENT_LABELS } from './AddRequestDialog.types'
import { useTranslations } from 'next-intl'
import { useTourOptions } from '@/hooks'

interface Tour {
  id: string
  code?: string | null
  name?: string | null
}

interface Order {
  id: string
  tour_id?: string | null
  order_number?: string | null
}

interface Supplier {
  id: string
  name?: string | null
  type?: string | null
}

interface PaymentMethod {
  id: string
  name: string
}

interface BatchTabContentProps {
  tourAllocations: TourAllocation[]
  availableTours: Tour[]
  orders: Order[]
  suppliers: Supplier[]
  paymentMethods: PaymentMethod[]
  /** 批次類別 — 改吃 expense_categories.id（uuid）；2026-05-21 Phase 2 */
  batchCategoryId: string
  batchSupplierId: string
  batchPaymentMethodId: string | undefined
  totalAllocatedAmount: number
  onUpdateAllocation: (index: number, patch: Partial<TourAllocation>) => void
  onAddAllocation: () => void
  onRemoveAllocation: (index: number) => void
  onSelectTour: (index: number, tourId: string) => void
  onCategoryChange: (value: string) => void
  onSupplierChange: (value: string) => void
  onPaymentMethodChange: (value: string | undefined) => void
  onCreateSupplier: (name: string) => Promise<string | null>
}

export function BatchTabContent({
  tourAllocations,
  availableTours,
  orders,
  suppliers,
  paymentMethods,
  batchCategoryId,
  batchSupplierId,
  batchPaymentMethodId,
  totalAllocatedAmount,
  onUpdateAllocation,
  onAddAllocation,
  onRemoveAllocation,
  onSelectTour,
  onCategoryChange,
  onSupplierChange,
  onPaymentMethodChange,
  onCreateSupplier,
}: BatchTabContentProps) {
  const t = useTranslations('finance')
  const availableTourOptions = useTourOptions(availableTours)
  // 類別下拉吃 entity hook（取代寫死 categoryOptions）— 團體請款用 type IN ('expense','both')
  const { items: allCats } = useExpenseCategories({ all: true })
  const tourCatOptions = (allCats ?? [])
    .filter(c => (c.type === 'expense' || c.type === 'both') && c.is_active)
    .map(c => ({ value: c.id, label: c.name }))
  return (
    <TabsContent
      value="batch"
      className="flex-1 overflow-y-auto pt-4 border-t border-morandi-container/30 space-y-3"
    >
      <InlineEditTable<TourAllocation>
        title={t('batchTabTourAllocation')}
        rows={tourAllocations}
        columns={
          [
            {
              key: 'tour',
              label: t('batchTabTourLabel'),
              width: '220px',
              render: ({ row, index }) => (
                <Combobox
                  options={[
                    ...(row.tour_id
                      ? [
                          {
                            value: row.tour_id,
                            label: `${row.tour_code} - ${row.tour_name}`,
                          },
                        ]
                      : []),
                    ...availableTourOptions,
                  ]}
                  value={row.tour_id}
                  onChange={value => onSelectTour(index, value)}
                  placeholder={t('batchTabSearchTour')}
                />
              ),
            },
            {
              key: 'order',
              label: COMPONENT_LABELS.COL_ORDER,
              width: '180px',
              render: ({ row, onUpdate }) => {
                const tourOrders = orders.filter(o => o.tour_id === row.tour_id)
                return (
                  <Combobox
                    options={tourOrders.map(o => ({
                      value: o.id,
                      label: o.order_number || '',
                    }))}
                    value={row.order_id || ''}
                    onChange={value => {
                      const matched = tourOrders.find(o => o.id === value)
                      onUpdate({
                        order_id: value || undefined,
                        order_number: matched?.order_number || undefined,
                      })
                    }}
                    placeholder={
                      !row.tour_id
                        ? COMPONENT_LABELS.PLACEHOLDER_PICK_TOUR_FIRST
                        : COMPONENT_LABELS.PLACEHOLDER_ORDER_OPT
                    }
                    disabled={!row.tour_id}
                  />
                )
              },
            },
            {
              key: 'category',
              label: t('batchTabCategory'),
              width: '120px',
              render: () => (
                // batch state、所有 row 共用、任一 row 改即 sync 全 row
                <Select
                  value={batchCategoryId}
                  onValueChange={value => onCategoryChange(value)}
                >
                  <SelectTrigger className="input-no-focus h-10 border-0 shadow-none bg-transparent text-sm px-2">
                    <SelectValue placeholder={COMPONENT_LABELS.PLACEHOLDER_CATEGORY} />
                  </SelectTrigger>
                  <SelectContent>
                    {tourCatOptions.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ),
            },
            {
              key: 'supplier',
              label: t('batchTabSupplier'),
              width: '180px',
              render: () => (
                <Combobox
                  value={batchSupplierId}
                  onChange={onSupplierChange}
                  options={suppliers
                    .filter(s => s.type === 'supplier')
                    .map(s => ({ value: s.id, label: s.name || '' }))}
                  placeholder={COMPONENT_LABELS.PLACEHOLDER_SUPPLIER_OPT}
                  showSearchIcon={false}
                  onCreate={onCreateSupplier}
                  disablePortal
                />
              ),
            },
            {
              key: 'payment_method',
              label: COMPONENT_LABELS.COL_PAY_METHOD,
              width: '140px',
              render: () => (
                <Select
                  value={batchPaymentMethodId || ''}
                  onValueChange={value => onPaymentMethodChange(value || undefined)}
                >
                  <SelectTrigger className="input-no-focus h-10 border-0 shadow-none bg-transparent text-sm px-2">
                    <SelectValue placeholder={COMPONENT_LABELS.PLACEHOLDER_PAY_METHOD} />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map(method => (
                      <SelectItem key={method.id} value={method.id}>
                        {method.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ),
            },
            {
              key: 'allocated_amount',
              label: t('batchTabAllocatedAmount'),
              width: '120px',
              align: 'right',
              render: ({ row, onUpdate }) => (
                <input
                  type="number"
                  placeholder="0"
                  value={row.allocated_amount || ''}
                  onChange={e => onUpdate({ allocated_amount: parseFloat(e.target.value) || 0 })}
                  className="input-no-focus w-full bg-transparent text-sm text-right"
                />
              ),
            },
          ] satisfies InlineEditColumn<TourAllocation>[]
        }
        onUpdate={(index, patch) => onUpdateAllocation(index, patch)}
        onAdd={onAddAllocation}
        onRemove={onRemoveAllocation}
        canRemove={() => true}
        addLabel={t('batchTabAddTour')}
        emptyMessage={t('batchTabEmpty')}
        footer={
          <tr className="bg-morandi-container/20 font-medium">
            <td colSpan={5} className="py-2.5 px-3 text-sm text-morandi-primary">
              {t('batchTabRowCount', { count: tourAllocations.length })}
            </td>
            <td className="py-2.5 px-3 text-right">
              <CurrencyCell amount={totalAllocatedAmount} className="text-sm" />
            </td>
            <td />
          </tr>
        }
      />

      {/* 類別 / 供應商 / 付款方式 是 batch state、所有 row 共用：在任一 row 改、自動 sync 全部 */}
      <p className="text-xs text-morandi-muted">{COMPONENT_LABELS.CATEGORY_HINT}</p>
    </TabsContent>
  )
}
