'use client'

import { useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTourPageState } from './useTourPageState'
import { useEmployeesSlim } from '@/data'
import { TOUR_STATUS } from '@/lib/constants/status-maps'
import { getTodayString } from '@/lib/utils/format-date'

interface UseToursFormReturn {
  handleOpenCreateDialog: (fromQuoteId?: string) => Promise<void>
  resetForm: () => void
  handleNavigationEffect: () => void
}

interface UseToursFormParams {
  state: ReturnType<typeof useTourPageState>
  openDialog: (type: string, data?: unknown, meta?: unknown) => void
}

export function useToursForm({ state, openDialog }: UseToursFormParams): UseToursFormReturn {
  const searchParams = useSearchParams()
  const { items: employees, refresh: fetchEmployees } = useEmployeesSlim({ all: true })

  const navigationProcessedRef = useRef(false)

  const { setNewTour, setAvailableCities, setNewOrder, setFormError } = state

  const handleOpenCreateDialog = useCallback(
    async (fromQuoteId?: string) => {
      setNewTour({
        name: '',
        countryId: '', // 🔧 核心表架構
        countryName: '', // 🔧 核心表架構
        countryCode: '', // 🔧 核心表架構
        cityCode: '',
        departure_date: getTodayString(),
        return_date: '',
        price: 0,
        status: TOUR_STATUS.UPCOMING,
        isSpecial: false,
        max_participants: 20,
        description: '',
      })
      setAvailableCities([])

      if (employees.length === 0) {
        await fetchEmployees()
      }
      openDialog('create', undefined, fromQuoteId)
    },
    [employees.length, fetchEmployees, openDialog, setNewTour, setAvailableCities]
  )

  const resetForm = useCallback(() => {
    setNewTour({
      name: '',
      countryCode: '',
      cityCode: '',
      departure_date: getTodayString(),
      return_date: '',
      price: 0,
      status: '待出發',
      isSpecial: false,
      max_participants: 20,
      description: '',
    })
    setAvailableCities([])
    setNewOrder({
      contact_person: '',
      sales_person: '',
      assistant: '',
      member_count: 1,
      total_amount: 0,
    })
    setFormError(null)
    navigationProcessedRef.current = false
  }, [setNewTour, setAvailableCities, setNewOrder, setFormError])

  const handleNavigationEffect = useCallback(async () => {
    const action = searchParams.get('action')

    if (action === 'create') {
      if (navigationProcessedRef.current) return
      navigationProcessedRef.current = true

      if (employees.length === 0) {
        await fetchEmployees()
      }
      openDialog('create')
    }
  }, [searchParams, employees.length, fetchEmployees, openDialog])

  return {
    handleOpenCreateDialog,
    resetForm,
    handleNavigationEffect,
  }
}
