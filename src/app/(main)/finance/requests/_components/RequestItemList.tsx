'use client'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import { DatePicker } from '@/components/ui/date-picker'
import { UserCheck, X, ArrowRightLeft } from 'lucide-react'
import { RequestItem } from '../_types'
import { useExpenseCategories } from '@/data/entities'
import {
  useAccountingSubjects,
  getDefaultSubjectByCategory,
} from '../../_hooks/useAccountingSubjects'
import { CurrencyCell } from '@/components/table-cells'
import { useTranslations } from 'next-intl'
import { InlineEditTable, type InlineEditColumn } from '@/components/ui/inline-edit-table'
import { DeferredInput } from './DeferredInput'
// SSOT：用公司共用的安全算式輸入框（CSP-safe shunting-yard、支援 +-*/ 與括號）
// 2026-05-26：原本地 ./CalcInput 只會加減、碰乘除丟值；改用共用版並刪除重複實作
import { CalcInput } from '@/components/ui/calc-input'

const COMPONENT_LABELS = {
  PH_PICK_DATE: '選擇日期',
  PH_PAYMENT_METHOD: '付款方式',
  PH_CATEGORY: '類別',
  PH_ADVANCED_BY: '代墊人',
} as const

interface SupplierOption {
  id: string
  name: string | null
  type: 'supplier' | 'employee'
  group: string
}

interface EditableRequestItemListProps {
  items: RequestItem[]
  suppliers: SupplierOption[]
  updateItem: (itemId: string, updatedFields: Partial<RequestItem>) => void
  removeItem: (itemId: string) => void
  addNewEmptyItem: () => void
  onCreateSupplier?: (name: string) => Promise<string | null>
  tourId?: string | null
  disabled?: boolean
  paymentMethods?: Array<{ id: string; name: string }>
  onTransfer?: () => void
  /** 隱藏 item 級日期欄（編輯模式用、SSOT：只有 header.request_date 才是真相）*/
  hideDateColumn?: boolean
  /** 公司請款模式：「類別」col 顯示費用類型選項（差旅 / 辦公 / 雜支等）取代供應商品項類別 */
  expenseTypeMode?: boolean
  /**
   * 對象為員工模式（公司請款 + expense_type='BNS' / 'SAL' 時設 true）
   * - 「供應商」column 標題改「員工」
   * - 選單來源改成 type='employee' 的選項
   * - 不顯示「新增供應商」入口
   * 2026-05-15 William 拍板：公司請款獎金 / 薪資時、對象本來就是員工、不該顯示供應商
   */
  payeeIsEmployee?: boolean
}

export function EditableRequestItemList({
  items,
  suppliers,
  updateItem,
  removeItem,
  addNewEmptyItem,
  onCreateSupplier,
  tourId: _tourId,
  disabled = false,
  paymentMethods = [],
  onTransfer,
  hideDateColumn = false,
  expenseTypeMode = false,
  payeeIsEmployee = false,
}: EditableRequestItemListProps) {
  const t = useTranslations('finance')
  // 從 DB 讀取 expense_categories（取代舊寫死 categoryOptions / EXPENSE_TYPE_CONFIG）
  // 2026-05-21：請款分類系統 Phase 2 — 下拉吃 entity hook、寫入時帶 category_id
  const { items: allCats } = useExpenseCategories({ all: true })
  const tourCats = (allCats ?? []).filter(
    c => (c.type === 'expense' || c.type === 'both') && c.is_active
  )
  const companyExpenseCats = (allCats ?? []).filter(
    c => c.type === 'company_expense' && c.is_active
  )
  // 公司請款模式：類別 col 用「公司費用」分類；否則用團體 expense/both
  const categoryColumnOptions = expenseTypeMode
    ? companyExpenseCats.map(c => ({ value: c.id, label: c.name }))
    : tourCats.map(c => ({ value: c.id, label: c.name }))
  // category_id → name 反查 map（顯示時用）
  const catNameById = new Map((allCats ?? []).map(c => [c.id, c.name]))
  const _total_amount = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)

  // 會計科目選項
  const { subjects, costOptions: _costOptions } = useAccountingSubjects()

  // TODO(P1-abstraction): SupplierSelect 共用組件評估
  // 此處供應商下拉與 tour-costs.tsx / AddRequestDialog.batch-tab.tsx 有類似 supplier 選取邏輯，
  // 但三處 prop shape 差異過大（Combobox + employee 混合 vs Select only vs Combobox only），
  // 且此處有 payeeIsEmployee 模式切換，抽取 SupplierSelect 不划算。
  // 若未來三處 API 對齊（統一 Combobox + 純供應商），再考慮抽取。
  // 供應商下拉只要供應商、員工走獨立的「代墊人」欄位（line 344）
  const supplierOptions = suppliers
    .filter(s => s.type === 'supplier')
    .map(s => ({
      value: s.id,
      label: s.name || t('requestDetailUnnamed'),
    }))

  // 無 focus 樣式的 input class（使用 globals.css 的 input-no-focus）
  const inputClass = 'input-no-focus w-full h-10 px-2 bg-transparent text-sm'

  const columns: InlineEditColumn<RequestItem>[] = [
    {
      key: 'date',
      label: '日期',
      width: '220px',
      render: ({ row, onUpdate }) => (
        <DatePicker
          value={row.custom_request_date || ''}
          onChange={date => onUpdate({ custom_request_date: date })}
          placeholder={COMPONENT_LABELS.PH_PICK_DATE}
          disabled={disabled}
          buttonClassName="h-10 p-0 px-2 border-0 shadow-none bg-transparent text-sm"
        />
      ),
    },
    {
      key: 'payment_method',
      label: '付款方式',
      width: '140px',
      render: ({ row, onUpdate }) => (
        <Select
          value={row.payment_method_id || ''}
          onValueChange={value => onUpdate({ payment_method_id: value || undefined })}
          disabled={disabled}
        >
          <SelectTrigger className="input-no-focus h-10 border-0 shadow-none bg-transparent text-sm px-2">
            <SelectValue placeholder={COMPONENT_LABELS.PH_PAYMENT_METHOD} />
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
      key: 'category',
      label: t('requestItemsCategory'),
      width: '130px',
      render: ({ row, onUpdate }) => {
        // 優先用 category_id；舊資料 fallback 從 row.category（文字）反查 id
        const currentId =
          row.category_id || categoryColumnOptions.find(o => o.label === row.category)?.value || ''
        return (
          <Select
            value={currentId}
            onValueChange={value => {
              const picked = categoryColumnOptions.find(o => o.value === value)
              const catName = picked?.label || ''
              // 會計科目預設仍依文字名稱推導（getDefaultSubjectByCategory 吃 name）
              const defaultSubject = getDefaultSubjectByCategory(catName, subjects)
              onUpdate({
                category_id: value || null,
                // 雙寫過渡：團體請款帶 cat name；公司請款 category 留空
                category: expenseTypeMode
                  ? ('' as RequestItem['category'])
                  : (catName as RequestItem['category']),
                accounting_subject_id: defaultSubject?.id || null,
                accounting_subject_name: defaultSubject
                  ? `${defaultSubject.code} ${defaultSubject.name}`
                  : null,
              })
            }}
            disabled={disabled}
          >
            <SelectTrigger className="input-no-focus h-10 border-0 shadow-none bg-transparent text-sm px-2">
              <SelectValue placeholder={COMPONENT_LABELS.PH_CATEGORY}>
                {/* 顯示優先：category_id → name；fallback row.category 文字 */}
                {currentId ? catNameById.get(currentId) || row.category || '' : row.category || ''}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {categoryColumnOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      },
    },
    {
      key: 'supplier',
      label: payeeIsEmployee ? '員工' : t('requestItemsSupplier'),
      render: ({ row, onUpdate }) => {
        const baseOpts = payeeIsEmployee
          ? suppliers
              .filter(s => s.type === 'employee')
              .map(s => ({ value: s.id, label: s.name || '未命名', group: s.group }))
          : supplierOptions
        // 保留歷史 free text supplier_name（請款前換廠商來不及建檔的情境）
        // 編輯模式打開舊單時、原字串以「（原紀錄）」標示注入下拉、避免空白誤導
        // 用戶選新供應商會自然覆寫；不選則 saveEditedRequest 經 resolveSupplierName 保留原字串
        const FREETEXT_PREFIX = '__freetext__:'
        const hasFreeTextSupplier = Boolean(
          !payeeIsEmployee && row.supplierName && !row.supplier_id && !row.selected_id
        )
        const opts = hasFreeTextSupplier
          ? [
              {
                value: `${FREETEXT_PREFIX}${row.supplierName}`,
                label: `${row.supplierName}（原紀錄）`,
              },
              ...baseOpts,
            ]
          : baseOpts
        const comboboxValue = hasFreeTextSupplier
          ? `${FREETEXT_PREFIX}${row.supplierName}`
          : row.selected_id || row.supplier_id
        return (
          <Combobox
            options={opts}
            value={comboboxValue}
            onChange={value => {
              if (value.startsWith(FREETEXT_PREFIX)) return
              const supplier = suppliers.find(s => s.id === value)
              const isEmployee = payeeIsEmployee || supplier?.type === 'employee'
              onUpdate({
                supplier_id: isEmployee ? '' : value,
                supplierName: supplier?.name || '',
                is_employee: isEmployee,
                selected_id: value,
              })
            }}
            placeholder={payeeIsEmployee ? '選擇員工' : t('requestItemsSelectSupplier')}
            className="input-no-focus [&_input]:h-9 [&_input]:px-1 [&_input]:bg-transparent"
            onCreate={payeeIsEmployee ? undefined : onCreateSupplier}
            showSearchIcon={false}
            disabled={disabled}
          />
        )
      },
    },
    {
      key: 'description',
      label: t('requestItemsDescription'),
      render: ({ row, onUpdate }) => (
        <div className="flex items-center gap-1">
          <DeferredInput
            value={row.description}
            onChange={val => onUpdate({ description: val })}
            className={`${inputClass} flex-1 disabled:cursor-default disabled:text-morandi-primary`}
            disabled={disabled}
          />
          {!row.advanced_by ? (
            <Button
              type="button"
              variant="ghost"
              size="iconSm"
              onClick={() => onUpdate({ advanced_by: '_pending' })}
              disabled={disabled}
              className="shrink-0 text-morandi-muted hover:text-morandi-primary disabled:text-morandi-primary"
              title={disabled ? '此請款單已加入出納單，無法修改' : '員工代墊'}
            >
              <UserCheck className="h-4 w-4" />
            </Button>
          ) : (
            <div className="shrink-0 flex items-center gap-1">
              <Combobox
                options={suppliers
                  .filter(s => s.type === 'employee')
                  .map(s => ({ value: s.id, label: s.name || '未命名' }))}
                value={row.advanced_by === '_pending' ? '' : row.advanced_by}
                defaultOpen={row.advanced_by === '_pending'}
                onChange={value => {
                  const emp = suppliers.find(s => s.id === value)
                  onUpdate({
                    advanced_by: value,
                    advanced_by_name: emp?.name || '',
                  })
                }}
                placeholder={COMPONENT_LABELS.PH_ADVANCED_BY}
                className="[&_input]:h-7 [&_input]:text-xs [&_input]:px-1 [&_input]:bg-morandi-gold/10 w-[120px]"
                showSearchIcon={false}
                showClearButton={false}
                disabled={disabled}
              />
              <Button
                type="button"
                variant="ghost"
                size="iconSm"
                onClick={() => onUpdate({ advanced_by: undefined, advanced_by_name: undefined })}
                disabled={disabled}
                className="shrink-0 h-6 w-6 text-morandi-muted hover:text-status-danger disabled:text-morandi-primary"
                title={disabled ? '此請款單已加入出納單，無法修改' : '取消代墊'}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'unit_price',
      label: t('requestItemsUnitPrice'),
      width: '96px',
      align: 'right',
      render: ({ row, onUpdate }) => (
        <CalcInput
          value={row.unit_price}
          onChange={val => onUpdate({ unit_price: val ?? 0 })}
          placeholder="0"
          className={`${inputClass} text-right placeholder:text-morandi-muted`}
          disabled={disabled}
        />
      ),
    },
    {
      key: 'quantity',
      label: t('requestItemsQuantity'),
      width: '80px',
      align: 'center',
      render: ({ row, onUpdate }) => (
        <CalcInput
          value={row.quantity}
          onChange={val => onUpdate({ quantity: val || 1 })}
          placeholder="1"
          className={`${inputClass} text-center placeholder:text-morandi-muted`}
          disabled={disabled}
        />
      ),
    },
    {
      key: 'subtotal',
      label: t('requestItemsSubtotal'),
      width: '128px',
      align: 'right',
      render: ({ row }) => (
        <CurrencyCell amount={row.unit_price * row.quantity} className="text-morandi-gold" />
      ),
    },
  ]

  // SSOT：編輯模式下隱藏 item 級日期欄、header.request_date 才是唯一真相
  const visibleColumns = hideDateColumn ? columns.filter(c => c.key !== 'date') : columns

  return (
    <InlineEditTable<RequestItem>
      title={t('requestItemsLabel')}
      rows={items}
      columns={visibleColumns}
      onUpdate={(index, patch) => updateItem(items[index].id, patch)}
      onAdd={disabled ? undefined : addNewEmptyItem}
      onRemove={disabled ? undefined : index => removeItem(items[index].id)}
      canRemove={() => items.length > 1}
      readonly={disabled}
      addLabel={t('requestItemsAddItem')}
      headerExtra={
        disabled && onTransfer ? (
          <Button
            size="sm"
            variant="soft-gold"
            onClick={onTransfer}
            className="text-morandi-secondary hover:text-morandi-gold hover:bg-morandi-gold/10"
          >
            <ArrowRightLeft size={14} className="mr-1" />
            {t('requestItemsCostTransfer')}
          </Button>
        ) : undefined
      }
      className="flex-1"
    />
  )
}
