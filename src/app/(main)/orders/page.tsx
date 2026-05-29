'use client'

import React, { useCallback, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createOrder, invalidateTours } from '@/data'
import { useToursSlim } from '@/data'
import { useAuthStore } from '@/stores/auth-store'
import { generateOrderNumber } from '@/lib/codes'
import { ShoppingCart, Plus } from 'lucide-react'
import { OrderListView } from './_components/OrderListView'
import { AddOrderForm } from './_components/add-order-form'
import { useOrdersListView } from './_hooks/useOrdersListView'
import type { Order } from '@/stores/types'
import { logger } from '@/lib/utils/logger'
import { alert as showAlert } from '@/lib/ui/alert-dialog'

export default function OrdersPage() {
  const t = useTranslations('orders')
  const { items: tours } = useToursSlim()
  const { user } = useAuthStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 15
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  // 業務員視角：由 HR 權限自動決定（2026-05-30 William 拍板砍切換按鈕）
  // - 有 cross_branch.read capability → useOrdersListView 內部不加 sales_id filter（顯示全部）
  // - 沒有此 capability → useOrdersListView 內部自動加 sales_id = currentUserId（只看我的）
  // 不再給 UI toggle、不再讀 localStorage 偏好；員工看到的範圍 = 該員工真正能看到的範圍。
  const {
    items: orders,
    totalCount,
    refresh: refreshOrders,
  } = useOrdersListView({
    page,
    pageSize: PAGE_SIZE,
    search: searchQuery.trim() || undefined,
    sortBy: 'departure_date',
    sortOrder: 'desc',
  })

  // 成員管理彈窗「關閉」時整理一次：刷訂單列表自訂分頁 key（人數/金額）+ 團（current_participants）。
  // 編輯過程不刷、避免畫面一直跳（William 2026-05-28 拍板：關閉才整理、不一直變）。
  const handleMembersClose = useCallback(async () => {
    await refreshOrders()
    await invalidateTours()
  }, [refreshOrders])

  const addOrder = createOrder
  const sortedOrders = orders

  const handleAddOrder = async (orderData: {
    tour_id: string
    contact_person: string
    sales_id: string
    sales_person: string
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
        sales_id: orderData.sales_id || null,
        sales_person: orderData.sales_person,
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
        onMembersClose={handleMembersClose}
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
