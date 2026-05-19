'use client'

/**
 * useToursPage - Main hook for Tours list page
 *
 * Server-side pagination via useToursPaginated（無 client-side 過濾 / 分頁）
 */

import { useCallback, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Tour } from '@/stores/types'
import { useTourPageState } from './useTourPageState'
import { useToursPaginated, UseToursPaginatedResult } from './useToursPaginated'

interface UseToursPageReturn {
  // Data
  tours: Tour[]
  filteredTours: Tour[] // Now same as tours (server already filtered)
  loading: boolean

  // Pagination & Sorting
  currentPage: number
  setCurrentPage: (page: number) => void
  totalCount: number
  sortBy: string
  setSortBy: (field: string) => void
  sortOrder: 'asc' | 'desc'
  setSortOrder: (order: 'asc' | 'desc') => void
  handleSortChange: (field: string, order: 'asc' | 'desc') => void

  // Filtering & Search
  activeStatusTab: string
  setActiveStatusTab: (tab: string) => void
  searchQuery: string
  setSearchQuery: (query: string) => void

  // Row Expansion
  expandedRows: string[]
  toggleRowExpand: (id: string) => void

  // State
  state: ReturnType<typeof useTourPageState>

  // Actions
  actions: UseToursPaginatedResult['actions']

  // Helpers
  getStatusColor: (status: string) => string
  handleRowClick: (row: unknown) => void
}

export function useToursPage(): UseToursPageReturn {
  const searchParams = useSearchParams()

  const state = useTourPageState()
  const {
    currentPage,
    setCurrentPage,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    expandedRows,
    activeStatusTab,
    setActiveStatusTab,
    searchQuery,
    setSearchQuery,
    toggleRowExpand,
    setActiveTab,
    getStatusColor,
    setSelectedTour,
  } = state

  // ✅ Use server-side paginated hook
  const { tours, totalCount, loading, actions } = useToursPaginated({
    page: currentPage,
    pageSize: state.pageSize,
    status: activeStatusTab,
    search: searchQuery,
    sortBy,
    sortOrder,
  })

  // ✅ No more client-side filtering - server already does it
  const filteredTours = tours

  const handleSortChange = useCallback(
    (field: string, order: 'asc' | 'desc') => {
      setSortBy(field)
      setSortOrder(order)
      setCurrentPage(1)
    },
    [setSortBy, setSortOrder, setCurrentPage]
  )

  const handleRowClick = useCallback(
    (row: unknown) => {
      const tour = row as Tour
      setSelectedTour(tour)
    },
    [setSelectedTour]
  )

  // Handle navigation from quote
  useEffect(() => {
    const highlightId = searchParams.get('highlight')

    if (highlightId) {
      toggleRowExpand(highlightId)
      setActiveTab(highlightId, 'tasks')
    }
  }, [searchParams, toggleRowExpand, setActiveTab])

  return {
    tours: tours || [],
    filteredTours,
    loading,
    currentPage,
    setCurrentPage,
    totalCount, // ✅ Now from server
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    handleSortChange,
    activeStatusTab,
    setActiveStatusTab,
    searchQuery,
    setSearchQuery,
    expandedRows,
    toggleRowExpand,
    state,
    actions,
    getStatusColor,
    handleRowClick,
  }
}
