'use client'

import React, { useRef, useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { CalcInput } from '@/components/ui/calc-input'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { QuickQuoteItem } from '@/stores/types'
import { evaluateExpression } from '@/components/widgets/calculator/calculatorUtils'
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useDefaultDndSensors, getDragStyle } from '@/lib/dnd'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

interface QuickQuoteItemsTableProps {
  items: QuickQuoteItem[]
  isEditing: boolean
  /** embedded：合進大卡時不畫自己的外殼 */
  embedded?: boolean
  onAddItem: () => void
  onRemoveItem: (id: string) => void
  onUpdateItem: <K extends keyof QuickQuoteItem>(
    id: string,
    field: K,
    value: QuickQuoteItem[K]
  ) => void
  onReorderItems?: (oldIndex: number, newIndex: number) => void
}

// 可排序的表格列
interface SortableRowProps {
  item: QuickQuoteItem
  isEditing: boolean
  isLast: boolean
  onUpdateItem: <K extends keyof QuickQuoteItem>(
    id: string,
    field: K,
    value: QuickQuoteItem[K]
  ) => void
  onRemoveItem: (id: string) => void
  handleTextChange: (
    id: string,
    field: 'description' | 'notes',
    e: React.ChangeEvent<HTMLInputElement>
  ) => void
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  handleCompositionStart: () => void
  handleCompositionEnd: (
    id: string,
    field: 'description' | 'notes',
    e: React.CompositionEvent<HTMLInputElement>
  ) => void
  normalizeNumber: (val: string) => string
  cleanExpressionInput: (val: string) => string
}

// Excel 風 cell + input class
const cellCls = 'px-2 py-1 table-divider'
const lastCellCls = 'px-2 py-1'
const inputCls =
  'w-full h-7 text-sm text-center border-0 bg-transparent shadow-none px-0 py-0 focus-visible:ring-0 rounded-none'

const SortableRow: React.FC<SortableRowProps> = ({
  item,
  isEditing,
  isLast,
  onUpdateItem,
  onRemoveItem,
  handleTextChange,
  handleKeyDown,
  handleCompositionStart,
  handleCompositionEnd,
  normalizeNumber: _normalizeNumber,
  cleanExpressionInput,
}) => {
  const t = useTranslations('orders')
  // 本地狀態：用於暫存計算式（如 "18000+45"）
  const [_costExpr, _setCostExpr] = useState<string>(
    item.cost === 0 || item.cost === undefined ? '' : String(item.cost)
  )
  const [_unitPriceExpr, _setUnitPriceExpr] = useState<string>(
    !item.unit_price ? '' : String(item.unit_price)
  )
  const [_quantityExpr, _setQuantityExpr] = useState<string>(
    item.quantity === 0 ? '' : String(item.quantity)
  )

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !isEditing,
  })

  const style = getDragStyle({ transform, transition, isDragging })

  // 處理聚焦 - Excel 式行為：顯示公式
  const _handleFocus = (
    field: 'cost' | 'unit_price' | 'quantity',
    setExpr: (val: string) => void
  ) => {
    const formulaField = `${field}_formula` as
      | 'cost_formula'
      | 'unit_price_formula'
      | 'quantity_formula'
    const formula = item[formulaField]
    if (formula) {
      setExpr(formula)
    }
  }

  // 處理計算式欄位的 Enter 或 blur - 計算並更新
  const _handleExpressionCommit = (
    field: 'cost' | 'unit_price' | 'quantity',
    expr: string,
    setExpr: (val: string) => void
  ) => {
    const cleaned = cleanExpressionInput(expr)
    const formulaField = `${field}_formula` as
      | 'cost_formula'
      | 'unit_price_formula'
      | 'quantity_formula'

    if (!cleaned || cleaned === '-') {
      onUpdateItem(item.id, field, 0)
      onUpdateItem(item.id, formulaField, undefined)
      setExpr('')
      return
    }

    // 檢查是否包含運算符號（是計算式）
    const hasOperator = /[+\-*/()]/.test(cleaned.replace(/^-/, '')) // 忽略開頭的負號

    if (hasOperator) {
      // 有運算符號，計算結果並儲存公式
      const result = evaluateExpression(cleaned, NaN)
      if (!isNaN(result)) {
        onUpdateItem(item.id, field, result)
        onUpdateItem(item.id, formulaField, cleaned) // 儲存公式
        setExpr(String(result))
      }
    } else {
      // 純數字，清除公式
      const num = parseFloat(cleaned)
      if (!isNaN(num)) {
        onUpdateItem(item.id, field, num)
        onUpdateItem(item.id, formulaField, undefined)
        setExpr(String(num))
      }
    }
  }

  // 最後一欄（編輯：刪除按鈕；非編輯：notes）不加 table-divider
  // notes 在 isEditing 時不是最後欄、加 table-divider
  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={cn(
        'hover:bg-muted/10',
        !isLast && 'border-b border-border/40',
        isDragging && 'opacity-50 bg-morandi-gold/10'
      )}
    >
      {/* 拖曳把手 */}
      {isEditing && (
        <td className={cn(cellCls, 'text-center')}>
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-morandi-secondary hover:text-morandi-primary p-1 inline-flex items-center justify-center"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </td>
      )}
      <td className={cellCls}>
        <input
          value={item.description}
          onChange={e => handleTextChange(item.id, 'description', e)}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={e => handleCompositionEnd(item.id, 'description', e)}
          placeholder={t('quickQuoteItemsItemDesc')}
          disabled={!isEditing}
          className={cn(inputCls, 'text-left')}
        />
      </td>
      <td className={cellCls}>
        <CalcInput
          value={item.quantity || null}
          formula={item.quantity_formula}
          onChange={v => onUpdateItem(item.id, 'quantity', v ?? 0)}
          onFormulaChange={f => onUpdateItem(item.id, 'quantity_formula', f)}
          disabled={!isEditing}
          placeholder={t('quickQuoteItemsFormulaHint')}
          className={inputCls}
        />
      </td>
      {isEditing && (
        <td className={cellCls}>
          <CalcInput
            value={item.cost ?? null}
            formula={item.cost_formula}
            onChange={v => onUpdateItem(item.id, 'cost', v ?? 0)}
            onFormulaChange={f => onUpdateItem(item.id, 'cost_formula', f)}
            placeholder={t('quickQuoteItemsFormulaHint')}
            className={inputCls}
          />
        </td>
      )}
      <td className={cellCls}>
        <CalcInput
          value={item.unit_price || null}
          formula={item.unit_price_formula}
          onChange={v => onUpdateItem(item.id, 'unit_price', v ?? 0)}
          onFormulaChange={f => onUpdateItem(item.id, 'unit_price_formula', f)}
          disabled={!isEditing}
          placeholder={t('quickQuoteItemsFormulaHint')}
          className={inputCls}
        />
      </td>
      <td className={cn(cellCls, 'text-center font-medium text-sm')}>
        {(item.amount || 0).toLocaleString()}
      </td>
      {isEditing && (
        <td className={cn(cellCls, 'text-center font-medium text-sm')}>
          <span
            className={
              (item.unit_price - (item.cost || 0)) * item.quantity >= 0
                ? 'text-morandi-green'
                : 'text-morandi-red'
            }
          >
            {((item.unit_price - (item.cost || 0)) * item.quantity).toLocaleString()}
          </span>
        </td>
      )}
      <td className={isEditing ? cellCls : lastCellCls}>
        <input
          value={item.notes}
          onChange={e => handleTextChange(item.id, 'notes', e)}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={e => handleCompositionEnd(item.id, 'notes', e)}
          placeholder={t('quoteAccommodationRemarks')}
          disabled={!isEditing}
          className={inputCls}
        />
      </td>
      {isEditing && (
        <td className={cn(lastCellCls, 'text-center')}>
          <button
            type="button"
            onClick={() => onRemoveItem(item.id)}
            className="text-morandi-red hover:text-status-danger inline-flex items-center justify-center"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </td>
      )}
    </tr>
  )
}

export const QuickQuoteItemsTable: React.FC<QuickQuoteItemsTableProps> = ({
  items,
  isEditing,
  embedded = false,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
  onReorderItems,
}) => {
  const t = useTranslations('orders')
  // IME 組合輸入狀態追蹤
  const isComposingRef = useRef(false)

  const sensors = useDefaultDndSensors()

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id && onReorderItems) {
      const oldIndex = items.findIndex(item => item.id === active.id)
      const newIndex = items.findIndex(item => item.id === over.id)
      onReorderItems(oldIndex, newIndex)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // 組合輸入中按 Enter 不處理
    if (e.key === 'Enter' && isComposingRef.current) {
      e.preventDefault()
      e.stopPropagation()
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      e.currentTarget.blur()
    }
  }

  /**
   * 清理輸入：移除中文、轉換全形為半形
   * 支援計算式輸入（如 18000+45）
   */
  const cleanExpressionInput = (text: string): string => {
    let result = text

    // 移除中文字符
    result = result.replace(/[一-龥]/g, '')

    // 轉換全形數字為半形 (０１２３４５６７８９)
    result = result.replace(/[０１２３４５６７８９]/g, char =>
      String.fromCharCode(char.charCodeAt(0) - 0xfee0)
    )

    // 轉換全形符號為半形（直接用字元比對更可靠）
    const fullToHalf: Record<string, string> = {
      '＋': '+',
      '－': '-',
      '＊': '*',
      '×': '*',
      '／': '/',
      '÷': '/',
      '（': '(',
      '）': ')',
      '．': '.',
      '。': '.',
    }
    result = result
      .split('')
      .map(char => fullToHalf[char] || char)
      .join('')

    // 移除所有空白
    result = result.replace(/\s/g, '')

    // 只保留數字、運算符號、小數點、括號
    result = result.replace(/[^0-9+\-*/.()]/g, '')

    return result
  }

  const normalizeNumber = (val: string): string => {
    // 全形轉半形
    val = val.replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    val = val.replace(/[．]/g, '.')
    val = val.replace(/[－]/g, '-')
    return val
  }

  // 處理文字欄位變更
  const handleTextChange = useCallback(
    (id: string, field: 'description' | 'notes', e: React.ChangeEvent<HTMLInputElement>) => {
      // 直接更新，不阻擋 IME 輸入
      onUpdateItem(id, field, e.target.value)
    },
    [onUpdateItem]
  )

  // 組合輸入結束時更新
  const handleCompositionEnd = useCallback(
    (id: string, field: 'description' | 'notes', e: React.CompositionEvent<HTMLInputElement>) => {
      isComposingRef.current = false
      onUpdateItem(id, field, e.currentTarget.value)
    },
    [onUpdateItem]
  )

  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true
  }, [])

  // colspan 計算（空狀態用）
  const colCount =
    1 /* desc */ +
    1 /* quantity */ +
    1 /* unit_price */ +
    1 /* amount */ +
    1 /* notes */ +
    (isEditing ? 1 /* drag handle */ + 1 /* cost */ + 1 /* profit */ + 1 /* remove */ : 0)

  // thead cell class — 跟行程頁同樣 bg-morandi-gold-header
  const headerCellCls =
    'px-2 py-1.5 text-center font-medium text-xs text-morandi-primary table-divider whitespace-nowrap'
  const headerLastCellCls =
    'px-2 py-1.5 text-center font-medium text-xs text-morandi-primary whitespace-nowrap'

  // table 容器外殼：embedded 不畫框（讓大卡負責）、非 embedded 自畫一張卡
  const wrapperCls = embedded
    ? 'border-b border-border'
    : 'border border-border bg-card rounded-xl shadow-sm overflow-hidden'

  return (
    <div className={wrapperCls}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <table className="w-full border-collapse table-fixed text-sm">
          <colgroup>
            {isEditing && <col style={{ width: '32px' }} />}
            <col />
            <col style={{ width: '72px' }} />
            {isEditing && <col style={{ width: '96px' }} />}
            <col style={{ width: '104px' }} />
            <col style={{ width: '104px' }} />
            {isEditing && <col style={{ width: '96px' }} />}
            <col style={{ width: '160px' }} />
            {isEditing && <col style={{ width: '48px' }} />}
          </colgroup>
          <thead className="bg-morandi-gold-header">
            <tr>
              {isEditing && <th className={headerCellCls}></th>}
              <th className={headerCellCls}>{t('quickQuoteItemsItemDesc')}</th>
              <th className={headerCellCls}>{t('quickQuoteItemsQuantity')}</th>
              {isEditing && (
                <th className={headerCellCls}>{t('quickQuoteItemsCost')}</th>
              )}
              <th className={headerCellCls}>{t('quickQuoteItemsUnitPrice')}</th>
              <th className={headerCellCls}>{t('quickQuoteItemsAmount')}</th>
              {isEditing && (
                <th className={headerCellCls}>{t('quickQuoteItemsProfit')}</th>
              )}
              <th className={isEditing ? headerCellCls : headerLastCellCls}>
                {t('quickQuoteItemsRemarks')}
              </th>
              {isEditing && (
                <th className={headerLastCellCls}>
                  {/* 刪除欄、用「＋ 新增」按鈕當 header */}
                  <button
                    type="button"
                    onClick={onAddItem}
                    className="inline-flex items-center justify-center text-morandi-primary hover:text-morandi-gold"
                    title={t('quickQuoteItemsAddItem')}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            <SortableContext
              items={items.map(item => item.id)}
              strategy={verticalListSortingStrategy}
            >
              {items.map((item, idx) => (
                <SortableRow
                  key={item.id}
                  item={item}
                  isEditing={isEditing}
                  isLast={idx === items.length - 1}
                  onUpdateItem={onUpdateItem}
                  onRemoveItem={onRemoveItem}
                  handleTextChange={handleTextChange}
                  handleKeyDown={handleKeyDown}
                  handleCompositionStart={handleCompositionStart}
                  handleCompositionEnd={handleCompositionEnd}
                  normalizeNumber={normalizeNumber}
                  cleanExpressionInput={cleanExpressionInput}
                />
              ))}
            </SortableContext>
            {items.length === 0 && (
              <tr>
                <td
                  colSpan={colCount}
                  className="px-3 py-8 text-center text-sm text-morandi-secondary"
                >
                  {t('quickQuoteItemsEmpty')}
                  {isEditing && t('quickQuoteItemsClickToAdd')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </DndContext>
      {/* 非編輯模式仍提供 add（如果還想保留入口）：移到 thead 內、這裡不再放 button */}
      {/* 編輯但沒項目時、額外底部一個明顯的「新增」按鈕 */}
      {isEditing && items.length === 0 && (
        <div className="flex items-center justify-center py-2 border-t border-border/40">
          <Button
            onClick={onAddItem}
            size="sm"
            variant="ghost"
            className="gap-1 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            {t('quickQuoteItemsAddItem')}
          </Button>
        </div>
      )}
    </div>
  )
}
