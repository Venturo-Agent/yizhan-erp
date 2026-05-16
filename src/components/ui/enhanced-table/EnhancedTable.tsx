'use client'

// PERF-TODO: Word doc recommends adding react-virtuoso for large table rendering
// When table rowCount > 100, consider installing react-virtuoso and virtualizing tbody
// Current mitigation: server-side pagination at 15-20 rows prevents most cases

import React, { useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import {
  EnhancedTableProps,
  RowData,
  TableColumn,
  SelectionConfig,
  ExpandableConfig,
} from './types'
import { useTableState } from './useTableState'
import { TableHeader } from './TableHeader'
import { TableBody } from './TableBody'
import { TablePagination } from './TablePagination'
import { ENHANCED_TABLE_LABELS } from './constants/labels'

export function EnhancedTable<T extends RowData = RowData>({
  columns,
  data,
  loading = false,
  error = null,
  onSort,
  onFilter,
  onRowClick,
  onRowDoubleClick,
  className,
  showFilters: defaultShowFilters = false,
  searchableFields = [] as readonly string[],
  initialPageSize = 15,
  searchTerm: externalSearchTerm = '',
  emptyState,
  emptyMessage,
  defaultSort,
  selection,
  expandable,
  actions,
  actionsHeader,
  actionsWidth,
  rowClassName,
  striped = false,
  hoverable = true,
  isLoading,
  serverPagination,
}: EnhancedTableProps<T>) {
  // Generic type erasure: EnhancedTable accepts T extends RowData but internal
  // hooks/state use RowData. These casts are safe because T extends RowData.
  const typedColumns = columns as unknown as TableColumn<RowData>[]
  const typedData = data as unknown as RowData[]
  const typedSelection = selection as unknown as SelectionConfig<RowData> | undefined
  const typedExpandable = expandable as unknown as ExpandableConfig<RowData> | undefined
  const typedActions = actions as unknown as ((row: RowData) => React.ReactNode) | undefined
  const typedRowClassName = rowClassName as unknown as ((row: RowData) => string) | undefined
  const typedOnRowClick = onRowClick as unknown as
    | ((row: RowData, rowIndex?: number) => void)
    | undefined
  const typedOnRowDoubleClick = onRowDoubleClick as unknown as
    | ((row: RowData, rowIndex: number) => void)
    | undefined
  // Handle loading aliases
  const actualLoading = loading || isLoading || false
  const tableState = useTableState<RowData>({
    // server-side 分頁：data 已是「當前頁的 15 筆」、不能再被 useTableState 篩選 / 切片、直接全給
    data: typedData,
    // server-side 模式：不在 client 端再 filter（searchTerm / searchableFields）
    searchTerm: serverPagination ? '' : externalSearchTerm,
    searchableFields: serverPagination ? [] : (searchableFields as (keyof RowData)[]),
    initialPageSize,
    defaultSort,
  })

  const {
    sortColumn,
    sortDirection,
    filters,
    showFilters,
    setShowFilters,
    setCurrentPage,
    setPageSize,
    handleSort,
    updateFilter,
  } = tableState

  // server pagination 模式：分頁狀態直接用外部、paginatedData = data 本身
  const currentPage = serverPagination?.currentPage ?? tableState.currentPage
  const pageSize = serverPagination?.pageSize ?? tableState.pageSize
  const totalPages = serverPagination
    ? Math.max(1, Math.ceil(serverPagination.totalCount / serverPagination.pageSize))
    : tableState.totalPages
  const startIndex = serverPagination
    ? (serverPagination.currentPage - 1) * serverPagination.pageSize
    : tableState.startIndex
  const paginatedData = serverPagination ? typedData : tableState.paginatedData
  const processedData = serverPagination ? typedData : tableState.processedData

  // Helper functions for selection and expandable
  const getRowId = useCallback(
    (row: RowData, index: number): string => {
      if (typedSelection?.getRowId) return typedSelection.getRowId(row, index)
      if (typedExpandable?.getRowId) return typedExpandable.getRowId(row, index)
      return (
        ((row as Record<string, unknown>).id as string) ||
        ((row as Record<string, unknown>)._id as string) ||
        index.toString()
      )
    },
    [typedSelection, typedExpandable]
  )

  const isRowSelected = useCallback(
    (row: RowData, index: number): boolean => {
      if (!typedSelection) return false
      const rowId = getRowId(row, index)
      return typedSelection.selected.includes(rowId)
    },
    [typedSelection, getRowId]
  )

  const isRowExpanded = useCallback(
    (row: RowData, index: number): boolean => {
      if (!typedExpandable) return false
      const rowId = getRowId(row, index)
      return typedExpandable.expanded.includes(rowId)
    },
    [typedExpandable, getRowId]
  )

  const toggleSelection = useCallback(
    (row: RowData, index: number) => {
      if (!typedSelection) return
      const rowId = getRowId(row, index)
      const isSelected = typedSelection.selected.includes(rowId)

      if (isSelected) {
        typedSelection.onChange(typedSelection.selected.filter(id => id !== rowId))
      } else {
        typedSelection.onChange([...typedSelection.selected, rowId])
      }
    },
    [typedSelection, getRowId]
  )

  const toggleSelectAll = useCallback(() => {
    if (!typedSelection) return
    const allRowIds = paginatedData.map((row, index) => getRowId(row, startIndex + index))
    const allSelected = allRowIds.every(id => typedSelection.selected.includes(id))

    if (allSelected) {
      // Deselect all visible rows
      typedSelection.onChange(typedSelection.selected.filter(id => !allRowIds.includes(id)))
    } else {
      // Select all visible rows
      const newSelected = [...typedSelection.selected]
      allRowIds.forEach(id => {
        if (!newSelected.includes(id)) {
          newSelected.push(id)
        }
      })
      typedSelection.onChange(newSelected)
    }
  }, [typedSelection, paginatedData, getRowId, startIndex])

  // Calculate if all visible rows are selected
  const allVisibleSelected = useMemo(
    () =>
      typedSelection
        ? paginatedData.length > 0 &&
          paginatedData.every((row, index) => isRowSelected(row, startIndex + index))
        : false,
    [typedSelection, paginatedData, isRowSelected, startIndex]
  )
  const someVisibleSelected = useMemo(
    () =>
      typedSelection
        ? paginatedData.some((row, index) => isRowSelected(row, startIndex + index))
        : false,
    [typedSelection, paginatedData, isRowSelected, startIndex]
  )

  const handleSortWrapper = useCallback(
    (columnKey: string) => {
      handleSort(columnKey)
      onSort?.(columnKey, sortColumn === columnKey && sortDirection === 'asc' ? 'desc' : 'asc')
    },
    [handleSort, onSort, sortColumn, sortDirection]
  )

  const handleFilterChange = useCallback(
    (key: string, value: string) => {
      updateFilter(key, value)
      const newFilters = { ...filters, [key]: value === '__all__' ? '' : value }
      onFilter?.(newFilters)
    },
    [updateFilter, onFilter, filters]
  )

  // Error state (loading state now handled in TableBody to keep table structure visible)
  if (error) {
    return (
      <div
        className={cn(
          'border border-border rounded-xl overflow-hidden bg-card shadow-sm',
          className
        )}
      >
        <div className="flex items-center justify-center py-8 text-status-danger">
          <span>
            {ENHANCED_TABLE_LABELS.LABEL_6824} {error}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'border border-border rounded-xl overflow-hidden bg-card shadow-sm flex flex-col h-full',
        className
      )}
    >
      <div className="overflow-auto flex-1">
        <table className="w-full border-collapse min-w-[60rem]">
          <TableHeader
            columns={typedColumns}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            filters={filters}
            showFilters={showFilters}
            selection={typedSelection}
            actions={typedActions}
            actionsHeader={actionsHeader}
            actionsWidth={actionsWidth}
            allVisibleSelected={allVisibleSelected}
            someVisibleSelected={someVisibleSelected}
            onSort={handleSortWrapper}
            onFilterChange={handleFilterChange}
            onToggleFilters={() => setShowFilters(!showFilters)}
            onToggleSelectAll={toggleSelectAll}
          />
          <TableBody
            columns={typedColumns}
            paginatedData={paginatedData}
            startIndex={startIndex}
            emptyState={emptyState}
            selection={typedSelection}
            expandable={typedExpandable}
            actions={typedActions}
            rowClassName={typedRowClassName}
            striped={striped}
            hoverable={hoverable}
            loading={actualLoading}
            onRowClick={typedOnRowClick}
            onRowDoubleClick={typedOnRowDoubleClick}
            getRowId={getRowId}
            isRowSelected={isRowSelected}
            isRowExpanded={isRowExpanded}
            toggleSelection={toggleSelection}
          />
        </table>
      </div>

      <TablePagination
        currentPage={serverPagination?.currentPage ?? currentPage}
        totalPages={
          serverPagination
            ? Math.max(1, Math.ceil(serverPagination.totalCount / serverPagination.pageSize))
            : totalPages
        }
        pageSize={serverPagination?.pageSize ?? pageSize}
        startIndex={
          serverPagination
            ? (serverPagination.currentPage - 1) * serverPagination.pageSize
            : startIndex
        }
        totalItems={serverPagination?.totalCount ?? processedData.length}
        onPageChange={serverPagination?.onPageChange ?? setCurrentPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  )
}
