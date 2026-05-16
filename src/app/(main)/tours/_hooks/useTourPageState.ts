'use client'

import { useState, useCallback } from 'react'
import { Tour } from '@/stores/types'
import { City } from '@/stores/region-store'
import { NewTourData, TourExtraFields, DeleteConfirmState } from '../_types'
import { OrderFormData } from '@/app/(main)/orders/_components/add-order-form'
import { TOUR_STATUS } from '@/lib/constants/status-maps'

export function useTourPageState() {
  // Selected tour
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null)

  // Pagination and filtering state
  const [currentPage, setCurrentPage] = useState(1)
  const [sortBy, setSortBy] = useState('departure_date')
  // 預設 tab 是「待出發」、出發日期近到遠（asc）合理；其他 tab user 可自行切 desc
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [expandedRows, setExpandedRows] = useState<string[]>([])

  // 每次進入預設「待出發」、不記憶上次的 tab
  const [activeStatusTab, setActiveStatusTab] = useState<string>(TOUR_STATUS.UPCOMING)
  const [viewMode, setViewMode] = useState<'card' | 'list'>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({
    isOpen: false,
    tour: null,
  })
  const pageSize = 10

  // UI state
  const [activeTabs, setActiveTabs] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Expanded mode triggers for each tour
  const [triggerAddOnAdd, setTriggerAddOnAdd] = useState<Record<string, boolean>>({})
  const [triggerRefundAdd, setTriggerRefundAdd] = useState<Record<string, boolean>>({})
  const [triggerPaymentAdd, setTriggerPaymentAdd] = useState<Record<string, boolean>>({})
  const [triggerCostAdd, setTriggerCostAdd] = useState<Record<string, boolean>>({})

  // Dynamic field state - tracks enabled extra fields for each tour
  const [tourExtraFields, setTourExtraFields] = useState<Record<string, TourExtraFields>>({})

  // New tour form data
  const [newTour, setNewTour] = useState<NewTourData>({
    name: '',
    countryCode: '',
    cityCode: '',
    departure_date: '',
    return_date: '',
    price: 0,
    status: 'proposed',
    isSpecial: false,
    max_participants: 20,
    description: '',
  })

  // New order form data
  const [newOrder, setNewOrder] = useState<Partial<OrderFormData>>({
    contact_person: '',
    sales_person: '',
    assistant: '',
    member_count: 1,
    total_amount: 0,
  })

  // Available cities for selected country
  const [availableCities, setAvailableCities] = useState<City[]>([])

  // Toggle row expand
  const toggleRowExpand = useCallback((tour_id: string) => {
    setExpandedRows(prev =>
      prev.includes(tour_id) ? prev.filter(id => id !== tour_id) : [...prev, tour_id]
    )
    // Set default tab to overview
    setActiveTabs(prev => {
      if (!prev[tour_id]) {
        return { ...prev, [tour_id]: 'overview' }
      }
      return prev
    })
  }, [])

  // Set active tab
  const setActiveTab = useCallback((tour_id: string, tabId: string) => {
    setActiveTabs(prev => ({ ...prev, [tour_id]: tabId }))
  }, [])

  // Get status color
  const getStatusColor = useCallback((status: string) => {
    const colors: Record<string, string> = {
      提案: 'text-morandi-gold font-medium',
      進行中: 'text-morandi-gold',
      結案: 'text-morandi-green',
      取消: 'text-morandi-red',
    }
    return colors[status] || 'text-morandi-secondary'
  }, [])

  return {
    // State
    selectedTour,
    setSelectedTour,
    currentPage,
    setCurrentPage,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    selectedRows,
    setSelectedRows,
    expandedRows,
    setExpandedRows,
    activeStatusTab,
    setActiveStatusTab,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    deleteConfirm,
    setDeleteConfirm,
    pageSize,
    activeTabs,
    setActiveTabs,
    submitting,
    setSubmitting,
    formError,
    setFormError,
    triggerAddOnAdd,
    setTriggerAddOnAdd,
    triggerRefundAdd,
    setTriggerRefundAdd,
    triggerPaymentAdd,
    setTriggerPaymentAdd,
    triggerCostAdd,
    setTriggerCostAdd,
    tourExtraFields,
    setTourExtraFields,
    newTour,
    setNewTour,
    newOrder,
    setNewOrder,
    availableCities,
    setAvailableCities,

    // Methods
    toggleRowExpand,
    setActiveTab,
    getStatusColor,
  }
}
