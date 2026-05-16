'use client'

import React from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TableColumn, SelectionConfig, ExpandableConfig, RowData } from './types'
import { ENHANCED_TABLE_LABELS } from './constants/labels'

interface TableBodyProps<T extends RowData = RowData> {
  columns: TableColumn<T>[]
  paginatedData: T[]
  startIndex: number
  emptyState?: React.ReactNode
  selection?: SelectionConfig<T>
  expandable?: ExpandableConfig<T>
  actions?: (row: T, index: number) => React.ReactNode
  rowClassName?: (row: T) => string
  striped?: boolean
  hoverable?: boolean
  loading?: boolean
  onRowClick?: (row: T, rowIndex: number) => void
  onRowDoubleClick?: (row: T, rowIndex: number) => void
  getRowId: (row: T, index: number) => string
  isRowSelected: (row: T, index: number) => boolean
  isRowExpanded: (row: T, index: number) => boolean
  toggleSelection: (row: T, index: number) => void
}

export const TableBody = React.memo(function TableBody({
  columns,
  paginatedData,
  startIndex,
  emptyState,
  selection,
  expandable,
  actions,
  rowClassName,
  striped,
  hoverable,
  loading,
  onRowClick,
  onRowDoubleClick,
  getRowId,
  isRowSelected,
  isRowExpanded,
  toggleSelection,
}: TableBodyProps) {
  // 載入狀態：顯示骨架屏
  if (loading) {
    const skeletonRows = 5 // 預設顯示 5 行骨架
    const totalColumns = columns.length + (selection ? 1 : 0) + (actions ? 1 : 0)

    return (
      <tbody>
        {Array.from({ length: skeletonRows }).map((_, rowIndex) => (
          <tr key={`skeleton-${rowIndex}`} className="border-b border-border/40">
            {selection && (
              <td className="[padding-block:1.1em] px-4">
                <div className="w-4 h-4 bg-morandi-container/50 rounded animate-pulse" />
              </td>
            )}
            {columns.map((column, colIndex) => (
              <td
                key={`skeleton-${rowIndex}-${colIndex}`}
                className="[padding-block:1.1em] px-4"
                style={{ width: column.width || undefined }}
              >
                <div
                  className="h-4 bg-morandi-container/50 rounded animate-pulse"
                  style={{
                    width: colIndex === 0 ? '60%' : colIndex === columns.length - 1 ? '40%' : '80%',
                  }}
                />
              </td>
            ))}
            {actions && (
              <td className="[padding-block:1.1em] px-4" style={{ width: '50%' }}>
                <div className="flex gap-2">
                  <div className="w-16 h-6 bg-morandi-container/50 rounded animate-pulse" />
                  <div className="w-16 h-6 bg-morandi-container/50 rounded animate-pulse" />
                </div>
              </td>
            )}
          </tr>
        ))}
        {/* 載入中提示 */}
        <tr>
          <td colSpan={totalColumns} className="py-4">
            <div className="flex items-center justify-center text-morandi-secondary">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm">{ENHANCED_TABLE_LABELS.LOADING_6912}</span>
            </div>
          </td>
        </tr>
      </tbody>
    )
  }

  if (paginatedData.length === 0) {
    return (
      <tbody>
        <tr className="h-[60vh]">
          <td
            colSpan={columns.length + (selection ? 1 : 0) + (actions ? 1 : 0)}
            className="py-12 px-6 text-center text-sm text-morandi-secondary align-middle"
          >
            {emptyState || (
              <div className="flex flex-col items-center justify-center h-full min-h-[18.75rem] text-morandi-secondary">
                <svg
                  className="w-16 h-16 mb-4 opacity-50"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
                <p className="text-sm">{ENHANCED_TABLE_LABELS.NOT_FOUND_8580}</p>
              </div>
            )}
          </td>
        </tr>
      </tbody>
    )
  }

  return (
    <tbody>
      {paginatedData.map((row, index) => {
        const actualRowIndex = startIndex + index
        const rowId = getRowId(row, actualRowIndex)
        const isSelected = isRowSelected(row, actualRowIndex)
        const isExpanded = isRowExpanded(row, actualRowIndex)
        const isDisabled = selection?.disabled?.(row) ?? false

        return (
          <React.Fragment key={rowId}>
            <tr
              className={cn(
                'relative group border-b border-border/40 last:border-b-0',
                isSelected && 'bg-morandi-gold/10',
                (onRowClick || onRowDoubleClick) && !selection && 'cursor-pointer',
                hoverable && 'hover:bg-morandi-container/20 transition-all duration-150',
                striped && index % 2 === 0 && 'bg-morandi-container/20',
                rowClassName?.(row)
              )}
              onClick={() => {
                // Don't trigger row click if selection mode is active
                if (selection) return
                onRowClick?.(row, actualRowIndex)
              }}
              onDoubleClick={() => onRowDoubleClick?.(row, actualRowIndex)}
            >
              {/* Selection checkbox */}
              {selection && (
                <td className="[padding-block:1.1em] px-4 align-middle">
                  <Checkbox
                    checked={isSelected}
                    disabled={isDisabled}
                    onCheckedChange={() => toggleSelection(row, actualRowIndex)}
                    onClick={e => e.stopPropagation()}
                  />
                </td>
              )}

              {/* Data columns */}
              {columns.map((column, colIndex) => (
                <td
                  key={String(column.key)}
                  className={cn(
                    '[padding-block:1.1em] px-4 text-sm text-morandi-primary',
                    colIndex === columns.length - 1 && 'pr-4',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right',
                    column.className
                  )}
                  style={{
                    minWidth: column.minWidth || column.width || undefined,
                    maxWidth: column.maxWidth,
                  }}
                >
                  {column.render ? (
                    column.render(row[column.key as keyof typeof row], row)
                  ) : (
                    <span>{String(row[column.key as keyof typeof row] ?? '')}</span>
                  )}
                </td>
              ))}

              {/* Actions column - 寬度跟 header 一致（auto-shrink，內容決定） */}
              {actions && (
                <td className="[padding-block:1.1em] px-4 align-middle whitespace-nowrap w-px">
                  <div onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                    {actions(row, actualRowIndex)}
                  </div>
                </td>
              )}
            </tr>

            {/* Expanded content row */}
            {expandable && isExpanded && (
              <tr>
                <td
                  colSpan={columns.length + (selection ? 1 : 0) + (actions ? 1 : 0)}
                  className="py-0 px-0"
                >
                  <div className="bg-morandi-container/20 p-4 border-t border-border/40">
                    {expandable.renderExpanded(row)}
                  </div>
                </td>
              </tr>
            )}
          </React.Fragment>
        )
      })}
    </tbody>
  )
})
