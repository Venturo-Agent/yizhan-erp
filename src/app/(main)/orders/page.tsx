'use client'

import React, { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createOrder } from '@/data'
import { useToursSlim } from '@/data'
import { useAuthStore } from '@/stores/auth-store'
import { generateOrderNumber } from '@/lib/codes'
import { ShoppingCart, Plus, Users, User } from 'lucide-react'
import { OrderListView } from './_components/OrderListView'
import { AddOrderForm } from './_components/add-order-form'
import {
  useOrdersListView,
  type OrdersViewMode,
} from './_hooks/useOrdersListView'
import type { Order } from '@/stores/types'
import { logger } from '@/lib/utils/logger'
import { alert as showAlert } from '@/lib/ui/alert-dialog'

// 業務員視角偏好（localStorage key）
const VIEW_MODE_STORAGE_KEY = 'orders.viewMode'

export default function OrdersPage() {
  const t = useTranslations('orders')
  const { items: tours } = useToursSlim()
  const { user } = useAuthStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 15
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  // 業務員視角 toggle：'all' = 全部訂單（需 cross_branch.read）、'mine' = 只看我的
  // 預設「只看我的」、切換記住偏好（localStorage）
  const [viewMode, setViewMode] = useState<OrdersViewMode>('mine')

  // hydrate localStorage 偏好（必 useEffect、避免 SSR mismatch）
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY)
      if (saved === 'mine' || saved === 'all') {
        setViewMode(saved)
      }
      // 沒有 localStorage 紀錄 → 維持預設 'mine'
    } catch {
      // localStorage 不可用（隱私模式）→ 用預設值 'mine'
    }
  }, [])

  const handleViewModeChange = (mode: string) => {
    if (mode !== 'all' && mode !== 'mine') return
    setViewMode(mode)
    setPage(1) // 切視角必歸第一頁、避免空頁
    try {
      window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode)
    } catch {
      // 隱私模式忽略
    }
  }

  // Server-side 分頁 + 搜尋 + 業務員視角過濾
  // 「全部」/「只看我的」共用 server-side pagination + .or() filter（見 useOrdersListView）
  const { items: orders, totalCount } = useOrdersListView({
    page,
    pageSize: PAGE_SIZE,
    search: searchQuery.trim() || undefined,
    viewMode,
    sortBy: 'departure_date',
    sortOrder: 'desc',
  })

  const addOrder = createOrder
  const sortedOrders = orders

  const handleAddOrder = async (orderData: {
    tour_id: string
    contact_person: string
    sales_id: string
    sales_person: string
    assistant_id: string
    assistant: string
  }) => {
    const selectedTour = tours.find(t => t.id === orderData.tour_id)
    if (!selectedTour) {
      void showAlert(t('selectTour'), 'warning')
      return
    }
    if (!user?.workspace_id) {
      void showAlert(t('workspaceError'), 'error')
      return
    }
    if (!orderData.sales_person?.trim()) {
      void showAlert(t('selectSales'), 'warning')
      return
    }

    try {
      // 訂單編號走 RPC + advisory lock、防同 tour 並發新增撞號
      const orderNumber = await generateOrderNumber(orderData.tour_id)

      const estimatedPeople = 2
      const sellingPricePerPerson = selectedTour.selling_price_per_person || 0
      const initialTotalAmount = sellingPricePerPerson * estimatedPeople

      await addOrder({
        order_number: orderNumber,
        tour_id: orderData.tour_id,
        tour_name: selectedTour.name,
        contact_person: orderData.contact_person,
        contact_phone: null,
        // 5/13 雙寫：sales_id/assistant_id FK + sales_person/assistant text fallback
        sales_id: orderData.sales_id || null,
        sales_person: orderData.sales_person,
        assistant_id: orderData.assistant_id || null,
        assistant: orderData.assistant,
        member_count: 0,
        total_amount: initialTotalAmount,
        paid_amount: 0,
        payment_status: 'unpaid',
        remaining_amount: initialTotalAmount,
        status: 'hk',
        notes: null,
        customer_id: null,
      } as Omit<Order, 'id' | 'created_at' | 'updated_at'>)

      setIsAddDialogOpen(false)
    } catch (error) {
      logger.error('[Orders] 新增訂單失敗:', error)
      void showAlert(error instanceof Error ? error.message : t('addOrderFailed'), 'error')
    }
  }

  return (
    <ContentPageLayout
      title={t('pageTitle')}
      icon={ShoppingCart}
      showSearch={true}
      searchTerm={searchQuery}
      onSearchChange={value => {
        setSearchQuery(value)
        setPage(1) // 搜尋變更必歸第一頁、避免分頁錯位
      }}
      searchPlaceholder="搜尋團號 / 團名"
      tabs={[
        { value: 'mine', label: '我的訂單', icon: User },
        { value: 'all', label: '全部訂單', icon: Users },
      ]}
      activeTab={viewMode}
      onTabChange={handleViewModeChange}
      primaryAction={{
        label: t('addOrder'),
        icon: Plus,
        onClick: () => setIsAddDialogOpen(true),
      }}
      contentClassName="flex-1 overflow-auto flex flex-col"
    >
      <OrderListView
        className="flex-1"
        orders={sortedOrders}
        tours={tours}
        showTourInfo={true}
        serverPagination={{
          currentPage: page,
          pageSize: PAGE_SIZE,
          totalCount,
          onPageChange: setPage,
        }}
      />

      {/* 新增訂單對話框 */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent level={1} className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('addOrder')}</DialogTitle>
          </DialogHeader>
          <AddOrderForm onSubmit={handleAddOrder} onCancel={() => setIsAddDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </ContentPageLayout>
  )
}
