import { usePaymentRequests, useDisbursementOrders, invalidateDisbursementOrders } from '@/data'
import { paymentRequestService } from '../_services/payment-request.service'
import { disbursementOrderService } from '../_services/disbursement-order.service'
import { PaymentRequest, PaymentRequestItem, DisbursementOrder } from '@/stores/types'

/**
 * Payments Hook - 統一財務操作接口
 *
 * 使用 @/data 的 SWR hooks + Service 層業務邏輯
 */
export const usePayments = () => {
  // 使用 @/data 的 SWR hooks（自動載入）
  const { items: payment_requests, loading: requestsLoading } = usePaymentRequests({ all: true })
  const { items: disbursement_orders, loading: ordersLoading } = useDisbursementOrders({ all: true })

  // 合併 loading 狀態
  const loading = requestsLoading || ordersLoading

  return {
    // ========== 資料 ==========
    payment_requests,
    disbursement_orders,
    loading,

    // ========== PaymentRequest CRUD 操作 ==========
    createPaymentRequest: async (
      data: Omit<PaymentRequest, 'id' | 'created_at' | 'updated_at'>
    ) => {
      return await paymentRequestService.create(
        data as Parameters<typeof paymentRequestService.create>[0]
      )
    },

    updatePaymentRequest: async (id: string, data: Partial<PaymentRequest>) => {
      return await paymentRequestService.update(id, data)
    },

    deletePaymentRequest: async (id: string) => {
      return await paymentRequestService.delete(id)
    },

    // SWR 自動載入，不需要手動 fetchAll
    loadPaymentRequests: async () => {
      // 已由 SWR 自動處理
    },

    // ========== PaymentRequestItem 操作 ==========
    addPaymentItem: async (
      requestId: string,
      item: Omit<
        PaymentRequestItem,
        'id' | 'request_id' | 'item_number' | 'subtotal' | 'created_at' | 'updated_at'
      >
    ) => {
      return await paymentRequestService.addItem(requestId, item)
    },

    addPaymentItems: async (
      requestId: string,
      items: Array<
        Omit<
          PaymentRequestItem,
          'id' | 'request_id' | 'item_number' | 'subtotal' | 'created_at' | 'updated_at'
        >
      >
    ) => {
      return await paymentRequestService.addItems(requestId, items)
    },

    updatePaymentItem: async (
      requestId: string,
      itemId: string,
      data: Partial<PaymentRequestItem>
    ) => {
      return await paymentRequestService.updateItem(requestId, itemId, data)
    },

    deletePaymentItem: async (requestId: string, itemId: string) => {
      return await paymentRequestService.deleteItem(requestId, itemId)
    },

    // ========== PaymentRequest 業務邏輯 ==========
    createFromQuote: async (
      tourId: string,
      quoteId: string,
      requestDate: string,
      tourName: string,
      code: string
    ) => {
      return await paymentRequestService.createFromQuote(
        tourId,
        quoteId,
        requestDate,
        tourName,
        code
      )
    },

    calculateTotalAmount: async (requestId: string) => {
      return await paymentRequestService.calculateTotalAmount(requestId)
    },

    getItemsByCategory: async (requestId: string, category: PaymentRequestItem['category']) => {
      return await paymentRequestService.getItemsByCategory(requestId, category)
    },

    getPendingRequests: async () => {
      return await paymentRequestService.getPendingRequests()
    },

    getProcessingRequests: async () => {
      return await paymentRequestService.getBilledRequests()
    },

    // ========== DisbursementOrder CRUD 操作 ==========
    createDisbursementOrder: async (paymentRequestIds: string[], note?: string) => {
      return await disbursementOrderService.createWithRequests(paymentRequestIds, note)
    },

    updateDisbursementOrder: async (id: string, data: Partial<DisbursementOrder>) => {
      return await disbursementOrderService.update(id, data)
    },

    deleteDisbursementOrder: async (id: string) => {
      return await disbursementOrderService.delete(id)
    },

    loadDisbursementOrders: async () => {
      await invalidateDisbursementOrders()
    },

    // ========== DisbursementOrder 業務邏輯 ==========
    confirmDisbursementOrder: async (id: string, confirmedBy: string) => {
      return await disbursementOrderService.confirmOrder(id, confirmedBy)
    },

    addToCurrentDisbursementOrder: async (paymentRequestIds: string[]) => {
      return await disbursementOrderService.addToCurrentWeekOrder(paymentRequestIds)
    },

    removeFromDisbursementOrder: async (orderId: string, requestId: string) => {
      return await disbursementOrderService.removePaymentRequest(orderId, requestId)
    },

    addPaymentRequestsToOrder: async (orderId: string, requestIds: string[]) => {
      return await disbursementOrderService.addPaymentRequests(orderId, requestIds)
    },

    getCurrentWeekDisbursementOrder: async () => {
      return await disbursementOrderService.getCurrentWeekOrderAsync()
    },

    getNextThursday: () => {
      return disbursementOrderService.getNextThursday()
    },

    getPendingOrders: async () => {
      return await disbursementOrderService.getPendingOrdersAsync()
    },

    getConfirmedOrders: async () => {
      return await disbursementOrderService.getConfirmedOrdersAsync()
    },
  }
}
