'use client'

import React from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const COMPONENT_LABELS = {
  DELETE: '刪除',
} as const

export interface InlineEditColumn<T> {
  key: string
  label: React.ReactNode
  /** 固定像素寬 "150px" 或彈性 "1fr"；省略表示 auto */
  width?: string
  align?: 'left' | 'center' | 'right'
  render: (ctx: {
    row: T
    index: number
    onUpdate: (patch: Partial<T>) => void
    readonly: boolean
  }) => React.ReactNode
}

interface InlineEditTableProps<T> {
  title?: React.ReactNode
  rows: T[]
  columns: InlineEditColumn<T>[]
  /** 以 columns.render 管理 cell 時必填；使用 rowRender 時可省略 */
  onUpdate?: (index: number, patch: Partial<T>) => void
  onAdd?: () => void
  onRemove?: (index: number) => void
  canRemove?: (row: T, index: number) => boolean
  readonly?: boolean
  addLabel?: string
  emptyMessage?: string
  /** 總計列等 tbody 最後的靜態內容 */
  footer?: React.ReactNode
  /** header 右側補充按鈕（新增按鈕左邊） */
  headerExtra?: React.ReactNode
  /** 每個 row 後可 append 額外 row（如展開區） */
  renderAfterRow?: (row: T, index: number) => React.ReactNode
  /** Escape hatch：整個 row 由外部 render（回傳 <tr>...</tr>）。
   *  提供時，columns.render 被忽略、刪除按鈕也要自己畫。
   *  通常配合自訂 row 元件（如 PaymentItemRow）使用。*/
  rowRender?: (row: T, index: number) => React.ReactNode
  /** 外層容器 className 覆寫 */
  className?: string
  /** 視覺樣式：default=金色 header（適合 dialog 主表格）；minimal=灰字 label（適合 inline 設定） */
  variant?: 'default' | 'minimal'
  /** 每列額外 className（如要把特定列底色標出來、跟其他列做視覺區隔） */
  rowClassName?: (row: T, index: number) => string | undefined
}

const alignClass: Record<NonNullable<InlineEditColumn<unknown>['align']>, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
}

export function InlineEditTable<T>({
  title,
  rows,
  columns,
  onUpdate,
  onAdd,
  onRemove,
  canRemove,
  readonly = false,
  addLabel = '新增項目',
  emptyMessage,
  footer,
  headerExtra,
  renderAfterRow,
  rowRender,
  className,
  variant = 'default',
  rowClassName,
}: InlineEditTableProps<T>) {
  const showActionColumn = !!onRemove && !rowRender
  const totalCols = columns.length + (showActionColumn ? 1 : 0)
  const isMinimal = variant === 'minimal'

  return (
    <div className={cn('flex flex-col min-h-0', className)}>
      {(title || onAdd || headerExtra) && (
        <div className="flex items-center justify-between mb-3">
          {title ? <h3 className="text-sm font-medium text-morandi-primary">{title}</h3> : <span />}
          <div className="flex items-center gap-2">
            {headerExtra}
            {onAdd && !readonly && (
              <Button onClick={onAdd} size="sm" variant="morandi-gold">
                <Plus size="0.875em" className="mr-1" />
                {addLabel}
              </Button>
            )}
          </div>
        </div>
      )}

      <div
        className={cn(
          isMinimal ? 'overflow-hidden' : 'border border-border/50 rounded-lg overflow-hidden'
        )}
      >
        <table className="w-full border-collapse">
          <thead>
            <tr
              className={cn(
                isMinimal
                  ? 'text-xs text-morandi-secondary'
                  : 'bg-morandi-gold-header border-b border-border'
              )}
            >
              {columns.map(col => (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className={cn(
                    isMinimal
                      ? 'py-1.5 px-2 font-medium'
                      : 'py-2.5 px-3 text-sm font-semibold text-morandi-primary',
                    alignClass[col.align ?? 'left']
                  )}
                >
                  {col.label}
                </th>
              ))}
              {showActionColumn && <th style={{ width: '3rem' }} />}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && emptyMessage ? (
              <tr>
                <td
                  colSpan={totalCols || columns.length}
                  className="text-center py-6 text-morandi-secondary text-sm bg-card"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : rowRender ? (
              rows.map((row, index) => (
                <React.Fragment key={index}>
                  {rowRender(row, index)}
                  {renderAfterRow?.(row, index)}
                </React.Fragment>
              ))
            ) : (
              rows.map((row, index) => {
                const canRemoveRow =
                  onRemove && (canRemove ? canRemove(row, index) : rows.length > 1)
                return (
                  <React.Fragment key={index}>
                    <tr
                      className={cn(
                        isMinimal ? '' : 'bg-card border-b border-border/50 last:border-b-0',
                        rowClassName?.(row, index)
                      )}
                    >
                      {columns.map(col => (
                        <td
                          key={col.key}
                          className={cn(
                            isMinimal
                              ? 'py-1 px-2 text-sm align-middle'
                              : 'py-2 px-3 text-sm text-morandi-primary align-middle',
                            alignClass[col.align ?? 'left']
                          )}
                        >
                          {col.render({
                            row,
                            index,
                            onUpdate: patch => onUpdate?.(index, patch),
                            readonly,
                          })}
                        </td>
                      ))}
                      {showActionColumn && (
                        <td className="py-2 px-3 text-center align-middle">
                          {canRemoveRow && (
                            <button
                              type="button"
                              onClick={() => onRemove?.(index)}
                              disabled={readonly}
                              className="text-morandi-secondary/60 hover:text-morandi-red transition-colors p-1 rounded hover:bg-morandi-red/10 disabled:cursor-default disabled:opacity-40"
                              title={COMPONENT_LABELS.DELETE}
                            >
                              <Trash2 size="0.875em" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                    {renderAfterRow?.(row, index)}
                  </React.Fragment>
                )
              })
            )}
            {footer}
          </tbody>
        </table>
      </div>
    </div>
  )
}
