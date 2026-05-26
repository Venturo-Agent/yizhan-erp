import { useState, useCallback, useMemo } from 'react'
import { useToursSlim, useOrders, useSuppliersSlim } from '@/data'
import { useEmployeesWithCapability } from '@/lib/permissions/useEmployeesWithCapability'
import { CAPABILITIES } from '@/lib/permissions'
import { useAuthStore } from '@/stores'
import { getTodayString } from '@/lib/utils/format-date'
import { RequestFormData, RequestItem } from '../_types'
import type { PaymentItemCategory } from '@/stores/types'
import type { RequestMode } from '../_components/AddRequestDialog.types'

export function useRequestForm(opts?: { mode?: RequestMode; defaultDate?: string }) {
  const mode = opts?.mode
  // 預設請款日期：caller（AddRequestDialog）依公司預設出帳日算好傳入；未傳則退回今天
  const defaultDate = opts?.defaultDate ?? getTodayString()
  // 使用 @/data 的 SWR hooks（和 usePaymentForm 一致）
  const { items: tours } = useToursSlim({ all: true })
  const { items: suppliers } = useSuppliersSlim({ all: true })
  // 代墊人候選池（5/24 純角色 SSOT）：有「可代墊款」能力的人
  const advanceEmployees = useEmployeesWithCapability(CAPABILITIES.FINANCE_ADVANCE_PAYMENT_WRITE)

  // 獲取當前登入用戶
  const currentUser = useAuthStore(state => state.user)

  const [formData, setFormData] = useState<RequestFormData>({
    request_category: 'tour', // 預設團體請款
    tour_id: '',
    order_id: '',
    expense_type: '', // 公司請款時使用
    request_date: defaultDate,
    notes: '',
    is_special_billing: false,
    created_by: currentUser?.id || undefined,
    payment_method_id: '', // 付款方式
  })

  // 訂單載入（效能：不全撈、規格書效能契約）：
  //   批次模式需跨團全部訂單；單筆(tour)模式只撈選定團的訂單；未選團 / 公司請款不撈。
  //   mode 未傳時保守全撈（不破壞既有 caller）。
  const ordersQuery: { all?: boolean; filter?: { tour_id: string }; enabled?: boolean } =
    mode === 'batch' || mode === undefined
      ? { all: true }
      : mode === 'tour' && formData.tour_id
        ? { all: true, filter: { tour_id: formData.tour_id } }
        : { enabled: false }
  const { items: orders } = useOrders(ordersQuery)

  const [requestItems, setRequestItems] = useState<RequestItem[]>(() => [
    {
      id: Math.random().toString(36).substr(2, 9),
      custom_request_date: defaultDate,
      payment_method_id: undefined,
      category: '' as PaymentItemCategory, // 不預設類別，由用戶選擇
      supplier_id: '',
      supplierName: '',
      description: '',
      unit_price: 0,
      quantity: 1,
    },
  ])

  // Search states
  const [tourSearchValue, setTourSearchValue] = useState('')
  const [orderSearchValue, setOrderSearchValue] = useState('')
  const [showTourDropdown, setShowTourDropdown] = useState(false)
  const [showOrderDropdown, setShowOrderDropdown] = useState(false)

  // Filter tours by search
  const filteredTours = useMemo(
    () =>
      tours.filter(tour => {
        const searchTerm = tourSearchValue.toLowerCase()
        if (!searchTerm) return true

        const tourCode = tour.code?.toLowerCase() || ''
        const tour_name = tour.name?.toLowerCase() || ''
        const departure_date = tour.departure_date || ''
        const dateNumbers = departure_date.replace(/\D/g, '').slice(-4)

        return (
          tourCode.includes(searchTerm) ||
          tour_name.includes(searchTerm) ||
          dateNumbers.includes(searchTerm.replace(/\D/g, ''))
        )
      }),
    [tours, tourSearchValue]
  )

  // Filter orders by search and selected tour
  const filteredOrders = useMemo(
    () =>
      orders.filter(order => {
        if (!formData.tour_id) return false
        if (order.tour_id !== formData.tour_id) return false

        const searchTerm = orderSearchValue.toLowerCase()
        if (!searchTerm) return true

        const order_number = order.order_number?.toLowerCase() || ''
        const contact_person = order.contact_person?.toLowerCase() || ''

        return order_number.includes(searchTerm) || contact_person.includes(searchTerm)
      }),
    [orders, formData.tour_id, orderSearchValue]
  )

  // Calculate total amount
  const total_amount = useMemo(
    () => requestItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0),
    [requestItems]
  )

  // 供應商 + 合格代墊員工（代墊人下拉從 type='employee' 過濾）
  const combinedSuppliers = useMemo(
    () => [
      ...suppliers.map(s => ({
        id: s.id,
        name: s.name,
        type: 'supplier' as const,
        group: 'supplier',
      })),
      ...advanceEmployees.map(e => ({
        id: e.id,
        name: e.display_name || e.chinese_name || e.english_name || '',
        type: 'employee' as const,
        group: 'employee',
      })),
    ],
    [suppliers, advanceEmployees]
  )

  // Add a new empty item to the list
  const addNewEmptyItem = useCallback(() => {
    const newItem: RequestItem = {
      id: Math.random().toString(36).substr(2, 9),
      custom_request_date: defaultDate,
      payment_method_id: undefined,
      category: '' as PaymentItemCategory, // 不預設類別，由用戶選擇
      supplier_id: '',
      supplierName: '',
      description: '',
      unit_price: 0,
      quantity: 1,
    }
    setRequestItems(prev => [...prev, newItem])
  }, [defaultDate])

  // Update an item in the list
  const updateItem = useCallback((itemId: string, updatedFields: Partial<RequestItem>) => {
    setRequestItems(prev =>
      prev.map(item => (item.id === itemId ? { ...item, ...updatedFields } : item))
    )
  }, [])

  // Remove item from list
  const removeItem = useCallback((itemId: string) => {
    setRequestItems(prev => prev.filter(item => item.id !== itemId))
  }, [])

  // Reset form
  const resetForm = useCallback(() => {
    setFormData({
      request_category: 'tour',
      tour_id: '',
      order_id: '',
      expense_type: '',
      request_date: defaultDate, // 預設公司出帳日（無設定則今天）
      notes: '',
      is_special_billing: false,
      created_by: currentUser?.id || undefined,
    })
    setRequestItems([
      {
        id: Math.random().toString(36).substr(2, 9),
        custom_request_date: defaultDate,
        payment_method_id: undefined,
        category: '' as PaymentItemCategory, // 不預設類別，由用戶選擇
        supplier_id: '',
        supplierName: '',
        description: '',
        unit_price: 0,
        quantity: 1,
      },
    ])
    setTourSearchValue('')
    setOrderSearchValue('')
    setShowTourDropdown(false)
    setShowOrderDropdown(false)
  }, [currentUser?.id, defaultDate])

  return {
    formData,
    setFormData,
    requestItems,
    setRequestItems,
    tourSearchValue,
    setTourSearchValue,
    orderSearchValue,
    setOrderSearchValue,
    showTourDropdown,
    setShowTourDropdown,
    showOrderDropdown,
    setShowOrderDropdown,
    filteredTours,
    filteredOrders,
    total_amount,
    addNewEmptyItem,
    updateItem,
    removeItem,
    resetForm,
    suppliers: combinedSuppliers,
    tours,
    orders,
    currentUser, // 當前登入用戶
  }
}
