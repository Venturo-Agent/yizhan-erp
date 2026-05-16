'use client'

import { useState, useMemo, useCallback } from 'react'
import { RowData } from './types'

interface UseEnhancedTableResult<T> {
  data: T[]
  handleSort: (column: string, direction: 'asc' | 'desc') => void
  handleFilter: (filters: Record<string, string>) => void
}

export function useEnhancedTable<T extends RowData>(
  initialData: T[],
  sortFunction: (data: T[], column: string, direction: 'asc' | 'desc') => T[],
  filterFunction: (data: T[], filters: Record<string, string>) => T[]
): UseEnhancedTableResult<T> {
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [filters, setFilters] = useState<Record<string, string>>({})

  const processedData = useMemo(() => {
    let result = [...initialData]

    // Apply filters
    if (Object.keys(filters).some(key => filters[key])) {
      result = filterFunction(result, filters)
    }

    // Apply sorting
    if (sortColumn) {
      result = sortFunction(result, sortColumn, sortDirection)
    }

    return result
  }, [initialData, sortColumn, sortDirection, filters, sortFunction, filterFunction])

  const handleSort = useCallback((column: string, direction: 'asc' | 'desc') => {
    setSortColumn(column)
    setSortDirection(direction)
  }, [])

  const handleFilter = useCallback((newFilters: Record<string, string>) => {
    setFilters(newFilters)
  }, [])

  return {
    data: processedData,
    handleSort,
    handleFilter,
  }
}
