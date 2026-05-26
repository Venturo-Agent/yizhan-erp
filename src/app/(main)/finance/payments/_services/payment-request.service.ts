import { BaseService, StoreOperations } from '@/core/services/base.service'
import { PaymentRequest, PaymentRequestItem } from '@/stores/types'
import { ValidationError } from '@/core/errors/app-errors'
import { logger } from '@/lib/utils/logger'
import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'
import { invalidatePaymentRequests } from '@/data'
import { softDelete } from '@/lib/data/soft-delete'
import { useAuthStore } from '@/stores/auth-store'
import { recalculateExpenseStats } from '@/app/(main)/finance/payments/_services/expense-core.service'
import { isDraftTourStatus } from '@/lib/constants/tour-status'
import {
  addItem as itemsAddItem,
  addItems as itemsAddItems,
  updateItem as itemsUpdateItem,
  deleteItem as itemsDeleteItem,
  getItemsByRequestIdAsync,
  getItemsByCategory,
  loadPaymentRequestItems,
  PAYMENT_REQUEST_ITEMS_SELECT,
  AddItemData,
} from './payment-request-items.service'

type PaymentRequestInsert = Database['public']['Tables']['payment_requests']['Insert']

// DB select fragment（請款單完整欄位）
const PAYMENT_REQUESTS_SELECT =
  'id, code, request_number, request_type, request_category, request_date, amount, total_amount, status, tour_id, tour_code, tour_name, order_id, order_number, supplier_id, supplier_name, expense_type, accounting_subject_id, notes, batch_id, budget_warning, is_special_billing, created_by, created_by_name, approved_by, approved_at, paid_by, paid_at, workspace_id, created_at, updated_at, updated_by, items:payment_request_items(*)' as const

class PaymentRequestService extends BaseService<PaymentRequest> {
  protected resourceName = 'payment_requests'

  // 內部快取（用於同步方法）
  private _items: PaymentRequest[] = []
  private _itemsLoaded = false

  protected getStore = (): StoreOperations<PaymentRequest> => {
    return {
      getAll: () => this._items,
      getById: (id: string) => this._items.find(r => r.id === id),
      add: async (request: PaymentRequest) => {
        const { id: _id, created_at: _created_at, updated_at: _updated_at, ...createData } = request
        const insertData = {
          id: request.id,
          ...createData,
          created_at: request.created_at,
          updated_at: request.updated_at,
        }
        logger.log('Creating payment_request with data:', insertData)
        const { data, error } = await supabase
          .from('payment_requests')
          .insert(insertData as unknown as PaymentRequestInsert)
          .select()
          .single()
        if (error) {
          logger.error('Supabase error creating payment_request:', error)
          throw new Error(`新增請款單失敗: ${error.message || JSON.stringify(error)}`)
        }
        // 更新內部快取，確保 getById 可以找到新建立的請款單
        const newRequest = data as unknown as PaymentRequest
        this._items = [newRequest, ...this._items]
        await invalidatePaymentRequests()
        return newRequest
      },
      update: async (id: string, data: Partial<PaymentRequest>) => {
        const { error } = await supabase.from('payment_requests').update(data).eq('id', id)
        if (error) throw error
        await invalidatePaymentRequests()
      },
      delete: async (id: string) => {
        const currentUser = useAuthStore.getState().user
        const result = await softDelete(
          supabase as never,
          {
            workspaceId: currentUser?.workspace_id ?? '',
            actorId: currentUser?.id ?? '',
          },
          { table: 'payment_requests', id }
        )
        if (!result.ok) throw new Error(result.error ?? '軟刪除請款單失敗')
        await invalidatePaymentRequests()
      },
    }
  }

  // 載入資料到內部快取（供同步方法使用）
  private async loadItems(): Promise<void> {
    const { data, error } = await supabase
      .from('payment_requests')
      .select(PAYMENT_REQUESTS_SELECT)
      .order('created_at', { ascending: false })
      .limit(1000)
    if (error) throw error
    this._items = (data || []) as unknown as PaymentRequest[]
    this._itemsLoaded = true
  }

  // 載入請款項目（委派給 items service）
  private async loadPaymentRequestItems(): Promise<PaymentRequestItem[]> {
    return loadPaymentRequestItems()
  }

  protected validate(data: Partial<PaymentRequest>): void {
    if (data.tour_id && !data.tour_id.trim()) {
      throw new ValidationError('tour_id', '必須關聯旅遊團')
    }

    if (data.amount !== undefined && data.amount < 0) {
      throw new ValidationError('amount', '總金額不能為負數')
    }

    if (data.created_at) {
      const requestDate = new Date(data.created_at)
      const dayOfWeek = requestDate.getDay()
      if (dayOfWeek !== 4) {
        throw new ValidationError('created_at', '請款日期必須為週四')
      }
    }
  }

  // 守門：提案 / 模板狀態的旅遊團不可開立請款單（業務規則）
  // 譬喻：飯店不對「報價單客人」或「房型範本」開帳單、必須是已成立的訂單
  // DB trigger 是最後一道保險、這邊先在 client 端快速擋住、給 user 明確訊息
  private async assertTourIsActive(tourId: string | null | undefined): Promise<void> {
    if (!tourId) return
    const { data: tourRow } = await supabase
      .from('tours')
      .select('status')
      .eq('id', tourId)
      .maybeSingle()
    if (isDraftTourStatus(tourRow?.status)) {
      throw new ValidationError(
        'tour_id',
        '提案 / 模板狀態的旅遊團不可開立請款單、請先將提案轉為正式團'
      )
    }
  }

  async create(
    data: Omit<PaymentRequest, 'id' | 'created_at' | 'updated_at'>
  ): Promise<PaymentRequest> {
    await this.assertTourIsActive((data as Partial<PaymentRequest>).tour_id)
    return super.create(data)
  }

  // ============ 內部工具：更新請款單總金額 ============

  private async updateRequestTotal(
    requestId: string,
    amount: number,
    updatedAt: string
  ): Promise<void> {
    // amount 是主欄、total_amount 為冗餘同步、保持兩欄一致避免報表讀錯
    await this.update(requestId, {
      amount,
      total_amount: amount,
      updated_at: updatedAt,
    } as Partial<PaymentRequest>)
  }

  // ============ PaymentRequestItem 管理（委派給 items service） ============

  /** 取得請款單的所有項目 */
  async getItemsByRequestIdAsync(requestId: string): Promise<PaymentRequestItem[]> {
    return getItemsByRequestIdAsync(requestId)
  }

  // 同步介面（同步呼叫端用、需自行確保資料已載入）。一般情況請用 getItemsByRequestIdAsync。
  getItemsByRequestId(_requestId: string): PaymentRequestItem[] {
    return []
  }

  /** 新增請款項目 */
  async addItem(requestId: string, itemData: AddItemData): Promise<PaymentRequestItem> {
    const request = await this.getById(requestId)
    if (!request) throw new Error(`找不到請款單: ${requestId}`)

    return itemsAddItem(request, itemData, this.now(), this.updateRequestTotal.bind(this))
  }

  /** 批次新增請款項目（sequential insert，防撞號） */
  async addItems(requestId: string, itemsData: AddItemData[]): Promise<PaymentRequestItem[]> {
    const request = await this.getById(requestId)
    if (!request) throw new Error(`找不到請款單: ${requestId}`)

    return itemsAddItems(request, itemsData, this.now(), this.updateRequestTotal.bind(this))
  }

  /** 更新請款項目 */
  async updateItem(
    requestId: string,
    itemId: string,
    itemData: Partial<PaymentRequestItem>
  ): Promise<void> {
    const request = await this.getById(requestId)
    if (!request) throw new Error(`找不到請款單: ${requestId}`)

    return itemsUpdateItem(
      request,
      itemId,
      itemData,
      this.now(),
      this.updateRequestTotal.bind(this)
    )
  }

  /** 刪除請款項目 */
  async deleteItem(requestId: string, itemId: string): Promise<void> {
    const request = await this.getById(requestId)
    if (!request) throw new Error(`找不到請款單: ${requestId}`)

    return itemsDeleteItem(request, itemId, this.now(), this.updateRequestTotal.bind(this))
  }

  // ============ 業務邏輯方法 ============

  /** 計算請款單總金額（手動觸發） */
  async calculateTotalAmount(requestId: string): Promise<number> {
    const request = await this.getById(requestId)
    if (!request) throw new Error(`找不到請款單: ${requestId}`)

    const items = await getItemsByRequestIdAsync(requestId)
    const totalAmount = items.reduce((sum, item) => sum + (item.subtotal || 0), 0)

    await this.update(requestId, {
      amount: totalAmount,
      total_amount: totalAmount,
      updated_at: this.now(),
    } as Partial<PaymentRequest>)

    return totalAmount
  }

  /** 按類別取得請款項目 */
  async getItemsByCategory(
    requestId: string,
    category: PaymentRequestItem['category']
  ): Promise<PaymentRequestItem[]> {
    return getItemsByCategory(requestId, category)
  }

  /** 從報價單創建請款單 */
  async createFromQuote(
    tourId: string,
    quoteId: string,
    requestDate: string,
    tourName: string,
    code: string
  ): Promise<PaymentRequest> {
    const requestData = {
      tour_id: tourId,
      code,
      request_number: code,
      request_date: requestDate,
      request_type: '從報價單自動生成',
      amount: 0,
      status: 'pending' as const,
      note: '從報價單自動生成',
    }

    return await this.create(requestData)
  }

  // ============ Query 方法 ============

  /** 取得待處理請款單 */
  async getPendingRequests(): Promise<PaymentRequest[]> {
    const { data, error } = await supabase
      .from('payment_requests')
      .select(PAYMENT_REQUESTS_SELECT)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) throw error
    return (data || []) as unknown as PaymentRequest[]
  }

  /** 取得已付款請款單（5/15 SSOT 對齊：billed 已併入 paid） */
  async getBilledRequests(): Promise<PaymentRequest[]> {
    const { data, error } = await supabase
      .from('payment_requests')
      .select(PAYMENT_REQUESTS_SELECT)
      .eq('status', 'paid')
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) throw error
    return (data || []) as unknown as PaymentRequest[]
  }

  /** 按旅遊團取得請款單 */
  async getRequestsByTour(tourId: string): Promise<PaymentRequest[]> {
    const { data, error } = await supabase
      .from('payment_requests')
      .select(PAYMENT_REQUESTS_SELECT)
      .eq('tour_id', tourId)
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) throw error
    return (data || []) as unknown as PaymentRequest[]
  }

  /** 按訂單取得請款單 */
  async getRequestsByOrder(orderId: string): Promise<PaymentRequest[]> {
    const { data, error } = await supabase
      .from('payment_requests')
      .select(PAYMENT_REQUESTS_SELECT)
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) throw error
    return (data || []) as unknown as PaymentRequest[]
  }

  // ============ 狀態流轉 ============

  /** ✅ 標記為已付款（5/15 SSOT 對齊：billed → paid） */
  async markAsBilled(requestId: string): Promise<void> {
    const request = await this.getById(requestId)
    if (!request) throw new Error(`找不到請款單: ${requestId}`)

    if (request.status === 'paid') {
      throw new Error('此請款單已出帳')
    }

    const now = this.now()
    await this.update(requestId, {
      status: 'paid',
      updated_at: now,
    })

    if (request.tour_id) {
      await recalculateExpenseStats(request.tour_id)
    }
  }

  /** 取消出帳（將狀態改回已確認） */
  async cancelBilling(requestId: string): Promise<void> {
    const request = await this.getById(requestId)
    if (!request) throw new Error(`找不到請款單: ${requestId}`)

    if (request.status !== 'paid') {
      throw new Error('只能取消已出帳的請款單')
    }

    await this.update(requestId, {
      status: 'confirmed',
      updated_at: this.now(),
    })

    if (request.tour_id) {
      await recalculateExpenseStats(request.tour_id)
    }

    logger.warn('⚠️ 出帳已取消', { requestId })
  }
}

export const paymentRequestService = new PaymentRequestService()

// Re-export items select fragment for external consumers
export { PAYMENT_REQUEST_ITEMS_SELECT }
