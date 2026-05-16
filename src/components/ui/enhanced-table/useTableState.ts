import { useState, useMemo, useEffect, useCallback } from 'react'

interface UseTableStateProps<T> {
  data: T[]
  searchTerm?: string
  searchableFields?: (keyof T)[]
  initialPageSize?: number
  defaultSort?: { key: string; direction: 'asc' | 'desc' }
}

export function useTableState<T>({
  data,
  searchTerm = '',
  searchableFields = [],
  initialPageSize = 15,
  defaultSort,
}: UseTableStateProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(defaultSort?.key ?? null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(
    defaultSort?.direction ?? 'asc'
  )
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [showFilters, setShowFilters] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)

  // 處理資料：搜尋、過濾、排序
  const processedData = useMemo(() => {
    let filtered = [...data]

    // 全文搜尋
    if (searchTerm && searchableFields.length > 0) {
      filtered = filtered.filter(row =>
        searchableFields.some(field => {
          const value = row[field]
          return value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
        })
      )
    }

    // 篩選器
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        filtered = filtered.filter(row => {
          const value = row[key as keyof T]
          return value && value.toString().toLowerCase().includes(filters[key].toLowerCase())
        })
      }
    })

    // 排序
    if (sortColumn) {
      filtered.sort((a, b) => {
        const aValue = a[sortColumn as keyof T]
        const bValue = b[sortColumn as keyof T]

        if (aValue === bValue) return 0

        const result = aValue < bValue ? -1 : 1
        return sortDirection === 'asc' ? result : -result
      })
    }

    return filtered
  }, [data, searchTerm, searchableFields, filters, sortColumn, sortDirection])

  // 分頁邏輯
  const totalPages = useMemo(
    () => Math.ceil(processedData.length / pageSize) || 1,
    [processedData.length, pageSize]
  )
  const startIndex = useMemo(() => (currentPage - 1) * pageSize, [currentPage, pageSize])
  const paginatedData = useMemo(
    () => processedData.slice(startIndex, startIndex + pageSize),
    [processedData, startIndex, pageSize]
  )

  // 當目前頁面超過總頁數時，調整到最後一頁（而非強制回第一頁）
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(Math.max(1, totalPages))
    }
  }, [currentPage, totalPages])

  const handleSort = useCallback(
    (columnKey: string) => {
      setSortDirection(prev => {
        // If same column, toggle; otherwise default to asc
        return sortColumn === columnKey && prev === 'asc' ? 'desc' : 'asc'
      })
      setSortColumn(columnKey)
    },
    [sortColumn]
  )

  const updateFilter = useCallback((key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value === '__all__' ? '' : value }))
  }, [])

  return {
    sortColumn,
    sortDirection,
    filters,
    showFilters,
    setShowFilters,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    processedData,
    paginatedData,
    totalPages,
    startIndex,
    handleSort,
    updateFilter,
  }
}
