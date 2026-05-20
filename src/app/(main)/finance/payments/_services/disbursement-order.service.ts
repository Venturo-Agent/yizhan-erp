import { formatDate } from '@/lib/utils/format-date'
import { BaseService, StoreOperations } from '@/core/services/base.service'
import { DisbursementOrder, PaymentRequest } from '@/stores/types'
import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'
import { invalidateDisbursementOrders, invalidatePaymentRequests } from '@/data'
import { softDelete } from '@/lib/data/soft-delete'
import { useAuthStore } from '@/stores/auth-store'

type DisbursementOrderInsert = Database['public']['Tables']['disbursement_orders']['Insert']
type DisbursementOrderUpdate = Database['public']['Tables']['disbursement_orders']['Update']

const DO_COLS =
  'id, order_number, status, amount, payment_method, bank_account, confirmed_by, confirmed_at, notes, workspace_id, created_at, created_by, updated_at, disbursement_date, pdf_url, code'

// 透過 FK 取得出納單關聯的 request IDs
async function fetchRequestIdsByOrder(orderId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('payment_requests')
    .select('id')
    .eq('disbursement_order_id', orderId)
  if (error) throw new Error(error.message)
  return (data || []).map(r => r.id)
}
import { ValidationError } from '@/core/errors/app-errors'
import { logger } from '@/lib/utils/logger'
// workspace_id is now auto-set by DB trigger

class DisbursementOrderService extends BaseService<DisbursementOrder> {
  protected resourceName = 'disbursement_orders'

  // 使用 Supabase 直接查詢取代 store
  private cachedItems: DisbursementOrder[] = []

  protected getStore = (): StoreOperations<DisbursementOrder> => {
    return {
      getAll: () => this.cachedItems,
      getById: (id: string) => this.cachedItems.find(o => o.id === id),
      add: async (order: DisbursementOrder) => {
        const { id: _id, created_at: _created_at, updated_at: _updated_at, ...createData } = order
        const { data, error } = await supabase
          .from('disbursement_orders')
          .insert(createData as unknown as DisbursementOrderInsert)
          .select()
          .single()
        if (error) throw new Error(error.message)
        await invalidateDisbursementOrders()
        return data as unknown as DisbursementOrder
      },
      update: async (id: string, data: Partial<DisbursementOrder>) => {
        const { error } = await supabase
          .from('disbursement_orders')
          .update(data as unknown as DisbursementOrderUpdate)
          .eq('id', id)
        if (error) throw new Error(error.message)
        await invalidateDisbursementOrders()
      },
      delete: async (id: string) => {
        // 1. 先把綁到此出納單的請款單「釋放」回 pending、並解除 FK
        //    沒做這步、刪了出納單會留下 status='confirmed' 但沒對應出納單的孤兒 PR、
        //    再也撈不回 pending pool、選不到
        const { error: releaseErr } = await supabase
          .from('payment_requests')
          .update({
            disbursement_order_id: null,
            status: 'pending',
          } as never)
          .eq('disbursement_order_id', id)
        if (releaseErr) throw new Error(releaseErr.message)

        // 2. 軟刪除出納單本身（保留 DB row）
        const currentUser = useAuthStore.getState().user
        const sdResult = await softDelete(
          supabase as never,
          {
            workspaceId: currentUser?.workspace_id ?? '',
            actorId: currentUser?.id ?? '',
          },
          { table: 'disbursement_orders', id }
        )
        if (!sdResult.ok) throw new Error(sdResult.error ?? '軟刪除出納單失敗')
        await invalidateDisbursementOrders()
        await invalidatePaymentRequests()
      },
    }
  }

  // 載入快取資料
  private async loadItems(): Promise<DisbursementOrder[]> {
    const { data, error } = await supabase
      .from('disbursement_orders')
      .select(DO_COLS)
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) throw new Error(error.message)
    this.cachedItems = (data || []) as unknown as DisbursementOrder[]
    return this.cachedItems
  }

  protected validate(data: Partial<DisbursementOrder>): void {
    if (data.amount !== undefined && data.amount < 0) {
      throw new ValidationError('amount', '總金額不能為負數')
    }

    if (data.disbursement_date) {
      const date = new Date(data.disbursement_date)
      const dayOfWeek = date.getDay()
      if (dayOfWeek !== 4) {
        throw new ValidationError('disbursement_date', '出納日期必須為週四')
      }
    }
  }

  // ========== 業務邏輯方法 ==========

  /**
   * 取得下週四日期
   */
  getNextThursday(): string {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const daysUntilThursday = (4 - dayOfWeek + 7) % 7
    const nextThursday = new Date(today)

    // 如果今天是週四且超過 17:00，則為下週四
    if (daysUntilThursday === 0 && today.getHours() >= 17) {
      nextThursday.setDate(today.getDate() + 7)
    } else if (daysUntilThursday === 0) {
      nextThursday.setDate(today.getDate())
    } else {
      nextThursday.setDate(today.getDate() + daysUntilThursday)
    }

    return formatDate(nextThursday)
  }

  /**
   * 取得當週出納單（待處理）
   */
  async getCurrentWeekOrderAsync(): Promise<DisbursementOrder | null> {
    const nextThursday = this.getNextThursday()
    const { data, error } = await supabase
      .from('disbursement_orders')
      .select(DO_COLS)
      .eq('disbursement_date', nextThursday)
      .eq('status', 'pending')
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new Error(error.message)
    }
    return data as unknown as DisbursementOrder | null
  }

  /**
   * 使用請款單創建出納單
   */
  async createWithRequests(paymentRequestIds: string[], note?: string): Promise<DisbursementOrder> {
    // 從 Supabase 取得請款單並計算總金額
    const { data: requests, error: reqError } = await supabase
      .from('payment_requests')
      .select('id, amount')
      .in('id', paymentRequestIds)
    if (reqError) throw new Error(reqError.message)

    const totalAmount = (requests || []).reduce((sum, r) => sum + (Number(r.amount) || 0), 0)

    // 從 Supabase 取得同日期的出納單數量生成編號
    const disbursementDate = this.getNextThursday()
    const { data: existingOrders, error: ordError } = await supabase
      .from('disbursement_orders')
      .select('id')
      .eq('disbursement_date', disbursementDate)
    if (ordError) throw new Error(ordError.message)

    const orderNumber = `P${disbursementDate.replace(/-/g, '').slice(2)}${String.fromCharCode(65 + (existingOrders?.length || 0))}`

    const orderData = {
      order_number: orderNumber,
      disbursement_date: disbursementDate,
      amount: totalAmount,
      status: 'pending' as const,
      notes: note,
      // created_by 由 DB trigger 或呼叫端覆寫；這裡不要寫死不合法的 uuid
      created_by: null as unknown as string,
      id: '',
      created_at: this.now(),
      updated_at: this.now(),
    } as DisbursementOrder

    const order = await this.create(orderData)

    // 把選中的請款單綁到此出納單 + PR → confirmed（已綁出納單、等付）
    // 2026-05-15 SSOT 對齊：billed 已併入 paid、綁定階段用 confirmed
    for (const requestId of paymentRequestIds) {
      await this.linkRequestToOrder(requestId, order.id, 'confirmed')
    }

    return order
  }

  /**
   * 確認出納單（含 rollback 保護）
   * 如果請款單狀態更新失敗、會回滾出納單狀態
   */
  async confirmOrder(orderId: string, confirmedBy: string): Promise<void> {
    const order = await this.getById(orderId)
    if (!order) {
      throw new Error(`找不到出納單: ${orderId}`)
    }

    if (order.status !== 'pending') {
      throw new Error('只能確認待處理的出納單')
    }

    const now = this.now()

    // 更新出納單狀態
    await this.update(orderId, {
      status: 'confirmed',
      confirmed_by: confirmedBy,
      confirmed_at: now,
      updated_at: now,
    })

    // 更新所有關聯請款單狀態為 confirmed（含 rollback）
    const requestIds = await fetchRequestIdsByOrder(orderId)
    const updatedRequestIds: string[] = []

    try {
      for (const requestId of requestIds) {
        // 確認出納單 → PR 維持 confirmed（綁了等付）
        // 2026-05-15 SSOT 對齊：billed 已併入 paid
        await this.updatePaymentRequestStatus(requestId, 'confirmed')
        updatedRequestIds.push(requestId)
      }
    } catch (error) {
      // 回滾：將已更新的請款單改回 confirmed
      for (const requestId of updatedRequestIds) {
        try {
          await this.updatePaymentRequestStatus(requestId, 'confirmed')
        } catch (rollbackError) {
          logger.error(`回滾請款單 ${requestId} 狀態失敗:`, rollbackError)
        }
      }
      // 回滾出納單狀態
      try {
        await this.update(orderId, {
          status: 'pending',
          confirmed_by: undefined,
          confirmed_at: undefined,
          updated_at: now,
        })
      } catch (rollbackError) {
        logger.error(`回滾出納單 ${orderId} 狀態失敗:`, rollbackError)
      }
      throw new Error(
        `確認出納單失敗，已回滾: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * 添加請款單到出納單
   */
  async addPaymentRequests(orderId: string, requestIds: string[]): Promise<void> {
    const order = await this.getById(orderId)
    if (!order) {
      throw new Error(`找不到出納單: ${orderId}`)
    }

    if (order.status !== 'pending') {
      throw new Error('只能修改待處理的出納單')
    }

    // 用 FK 算新的綁定總額（既有 + 新加入）
    const existingIds = await fetchRequestIdsByOrder(orderId)
    const newRequestIds = [...existingIds, ...requestIds]

    const { data: requests, error } = await supabase
      .from('payment_requests')
      .select('id, amount')
      .in('id', newRequestIds)
    if (error) throw new Error(error.message)

    const newTotalAmount = (requests || []).reduce((sum, r) => sum + (Number(r.amount) || 0), 0)

    // 更新出納單金額（不寫 array、FK 端負責綁定）
    await this.update(orderId, {
      amount: newTotalAmount,
      updated_at: this.now(),
    })

    // 把新加入的 request 綁到此出納單 + PR → confirmed
    // 2026-05-15 SSOT 對齊：billed 已併入 paid
    for (const requestId of requestIds) {
      await this.linkRequestToOrder(requestId, orderId, 'confirmed')
    }
  }

  /**
   * 從出納單移除請款單
   */
  async removePaymentRequest(orderId: string, requestId: string): Promise<void> {
    const order = await this.getById(orderId)
    if (!order) {
      throw new Error(`找不到出納單: ${orderId}`)
    }

    if (order.status !== 'pending') {
      throw new Error('只能修改待處理的出納單')
    }

    // 計算新的總金額：用 FK 重新查、扣掉要移除的那筆
    const existingIds = await fetchRequestIdsByOrder(orderId)
    const newRequestIds = existingIds.filter(id => id !== requestId)

    let newTotalAmount = 0
    if (newRequestIds.length > 0) {
      const { data: requests, error } = await supabase
        .from('payment_requests')
        .select('id, amount')
        .in('id', newRequestIds)
      if (error) throw new Error(error.message)
      newTotalAmount = (requests || []).reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
    }

    // 更新出納單金額
    await this.update(orderId, {
      amount: newTotalAmount,
      updated_at: this.now(),
    })

    // 解除綁定（FK 設 null）+ 狀態改回 confirmed
    await this.linkRequestToOrder(requestId, null, 'confirmed')
  }

  /**
   * 添加到當週出納單（找不到則創建新的）
   */
  async addToCurrentWeekOrder(requestIds: string[]): Promise<DisbursementOrder> {
    const currentOrder = await this.getCurrentWeekOrderAsync()

    if (currentOrder) {
      // 已有當週出納單，直接添加
      await this.addPaymentRequests(currentOrder.id, requestIds)
      return (await this.getById(currentOrder.id)) as DisbursementOrder
    } else {
      // 沒有當週出納單，創建新的
      return await this.createWithRequests(requestIds)
    }
  }

  // ========== Helper 方法 ==========

  /**
   * 更新請款單狀態（私有方法）- 使用 Supabase 直接查詢
   */
  private async updatePaymentRequestStatus(
    requestId: string,
    status: PaymentRequest['status']
  ): Promise<void> {
    const { error } = await supabase
      .from('payment_requests')
      .update({
        status,
        updated_at: this.now(),
      })
      .eq('id', requestId)
    if (error) throw new Error(error.message)
    await invalidatePaymentRequests()
  }

  /**
   * 綁定 / 解除綁定請款單到出納單（FK 標籤式）+ 同步 status
   * orderId=null → 解除綁定
   */
  private async linkRequestToOrder(
    requestId: string,
    orderId: string | null,
    status: PaymentRequest['status']
  ): Promise<void> {
    const { error } = await supabase
      .from('payment_requests')
      .update({
        disbursement_order_id: orderId,
        status,
        updated_at: this.now(),
      })
      .eq('id', requestId)
    if (error) throw new Error(error.message)
    await invalidatePaymentRequests()
  }

  // ========== Query 方法 ==========

  /**
   * 取得待處理出納單（非同步）
   */
  async getPendingOrdersAsync(): Promise<DisbursementOrder[]> {
    const { data, error } = await supabase
      .from('disbursement_orders')
      .select(DO_COLS)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) throw new Error(error.message)
    return (data || []) as unknown as DisbursementOrder[]
  }

  /**
   * 取得已確認出納單（非同步）
   */
  async getConfirmedOrdersAsync(): Promise<DisbursementOrder[]> {
    const { data, error } = await supabase
      .from('disbursement_orders')
      .select(DO_COLS)
      .eq('status', 'confirmed')
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) throw new Error(error.message)
    return (data || []) as unknown as DisbursementOrder[]
  }

  /**
   * 按日期取得出納單（非同步）
   */
  async getOrdersByDateAsync(date: string): Promise<DisbursementOrder[]> {
    const { data, error } = await supabase
      .from('disbursement_orders')
      .select(DO_COLS)
      .eq('disbursement_date', date)
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) throw new Error(error.message)
    return (data || []) as unknown as DisbursementOrder[]
  }
}

export const disbursementOrderService = new DisbursementOrderService()
