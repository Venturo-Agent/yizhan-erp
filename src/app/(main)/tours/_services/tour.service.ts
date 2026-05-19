import { formatDate } from '@/lib/utils/format-date'
import { BaseService, StoreOperations } from '@/core/services/base.service'
import { Tour } from '@/stores/types'
import { ValidationError } from '@/core/errors/app-errors'
import { getCurrentWorkspaceId } from '@/lib/workspace-helpers'
// workspace_id is now auto-set by DB trigger
import { BaseEntity } from '@/core/types/common'
import { supabase } from '@/lib/supabase/client'
import { generateTourCode as generateTourCodeShared } from '@/lib/codes'
import { invalidateTours } from '@/data'
import { useTourStore } from '@/stores'
import { TOUR_STATUS } from '@/lib/constants/status-maps'

class TourService extends BaseService<Tour & BaseEntity> {
  protected resourceName = 'tours'

  // 使用 Store 提供同步讀取，搭配 invalidateTours 確保 SWR 快取同步
  protected getStore = (): StoreOperations<Tour & BaseEntity> => {
    const store = useTourStore.getState()
    return {
      getAll: () => store.items as (Tour & BaseEntity)[],
      getById: (id: string) =>
        store.items.find(t => t.id === id) as (Tour & BaseEntity) | undefined,
      add: async (tour: Tour & BaseEntity) => {
        // Store.create 內部會處理類型轉換，這裡使用 unknown 轉換避免類型差異
        const result = await store.create(tour as unknown as Parameters<typeof store.create>[0])
        await invalidateTours()
        return result as (Tour & BaseEntity) | undefined
      },
      update: async (id: string, data: Partial<Tour & BaseEntity>) => {
        // Store.update 內部會處理類型轉換，這裡使用 unknown 轉換避免類型差異
        await store.update(id, data as unknown as Parameters<typeof store.update>[1])
        await invalidateTours()
      },
      delete: async (id: string) => {
        await store.delete(id)
        await invalidateTours()
      },
    }
  }

  protected validate(data: Partial<Tour & BaseEntity>): void {
    super.validate(data)

    if (data.name && data.name.trim().length < 2) {
      throw new ValidationError('name', '旅遊團名稱至少需要 2 個字符')
    }

    if (data.max_participants && data.max_participants < 1) {
      throw new ValidationError('max_participants', '最大參與人數必須大於 0')
    }

    if (data.price && data.price < 0) {
      throw new ValidationError('price', '價格不能為負數')
    }

    // 出發日期允許過去日期、可建立歷史旅遊團資料

    if (data.return_date && data.departure_date) {
      const depDate = new Date(data.departure_date)
      const retDate = new Date(data.return_date)

      if (retDate < depDate) {
        throw new ValidationError('return_date', '返回日期不能早於出發日期')
      }
    }
  }

  // 檢查團號是否已存在（直接查 DB，避免快取不一致）
  async isTourCodeExists(code: string): Promise<boolean> {
    const { count } = await supabase
      .from('tours')
      .select('id', { count: 'exact', head: true })
      .eq('code', code)
    return (count ?? 0) > 0
  }

  /**
   * 生成團號
   * @param cityCode - 3碼城市代號 (如: CNX, BKK, OSA)
   * @param date - 出發日期
   * @param isSpecial - 是否為特殊團（目前未使用）
   * @returns 團號 (格式: CNX250128A)
   */
  async generateTourCode(
    cityCode: string,
    date: Date,
    _isSpecial: boolean = false
  ): Promise<string> {
    const workspaceId = getCurrentWorkspaceId()
    if (!workspaceId) {
      throw new Error('無法取得 workspace code，請重新登入')
    }
    // 統一走中央 codes module（@/lib/codes）— DB RPC + advisory lock 防競態
    return generateTourCodeShared(workspaceId, cityCode, date)
  }

  // 檢查團體是否可以取消
  async canCancelTour(tour_id: string): Promise<{ canCancel: boolean; reason?: string }> {
    const tour = await this.getById(tour_id)
    if (!tour) {
      return { canCancel: false, reason: '找不到該旅遊團' }
    }

    // Tour 狀態檢查
    if (tour.status === TOUR_STATUS.CLOSED) {
      return { canCancel: false, reason: '該旅遊團已經結案，無法取消' }
    }

    const departure_date = new Date(tour.departure_date || '')
    const now = new Date()
    const daysDiff = Math.ceil((departure_date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysDiff < 3) {
      return { canCancel: false, reason: '出發前3天內無法取消' }
    }

    return { canCancel: true }
  }

  // 更新團體狀態
  async updateTourStatus(tour_id: string, newStatus: Tour['status']): Promise<Tour> {
    const tour = await this.getById(tour_id)
    if (!tour) {
      throw new Error('Tour not found')
    }

    const currentStatus = tour.status

    // If the status is not changing, do nothing.
    if (currentStatus === newStatus) {
      return tour
    }

    // 狀態轉換規則（6 狀態單向流水線）
    // template → proposal → upcoming → ongoing → returned → closed
    // 取消走封存（archived=true, archive_reason='cancelled'）、不是狀態轉換
    const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
      [TOUR_STATUS.TEMPLATE]: [TOUR_STATUS.PROPOSAL], // 複製
      [TOUR_STATUS.PROPOSAL]: [TOUR_STATUS.UPCOMING], // 開團
      [TOUR_STATUS.UPCOMING]: [TOUR_STATUS.ONGOING], // 自動：出發日到
      [TOUR_STATUS.ONGOING]: [TOUR_STATUS.RETURNED], // 自動：回程日過
      [TOUR_STATUS.RETURNED]: [TOUR_STATUS.CLOSED], // 結案按鈕
      [TOUR_STATUS.CLOSED]: [], // 終點
    }

    const allowedTransitions = ALLOWED_STATUS_TRANSITIONS[currentStatus || ''] || []
    if (!newStatus || !allowedTransitions.includes(newStatus)) {
      throw new ValidationError(
        'status',
        `不允許的狀態轉換：無法從 "${currentStatus || ''}" 更新為 "${newStatus || ''}"`
      )
    }

    const result = await this.update(tour_id, {
      status: newStatus,
      updated_at: this.now(),
    })

    return result
  }

  /**
   * 建立 ad-hoc 旅遊團 — 用於散客情境
   * 出發日 = 今天、名稱依類型 + 客戶名自動產生
   * @param serviceType 團服務類型（flight / flight_hotel / hotel）
   * @param customerName 客戶名稱（會放入團名稱）
   */
  async createAdHocTour(
    serviceType: 'flight' | 'flight_hotel' | 'hotel',
    customerName?: string
  ): Promise<Tour> {
    const today = new Date()
    const dateStr = formatDate(today)
    const yymmdd = dateStr.replace(/-/g, '').slice(2)

    // 產生唯一團號 — 例如 F260412A001
    const prefixMap: Record<string, string> = {
      flight: 'F',
      flight_hotel: 'FH',
      hotel: 'H',
    }
    const prefix = prefixMap[serviceType] || 'X'
    const random = Math.random().toString(36).slice(2, 5).toUpperCase()
    const code = `${prefix}${yymmdd}${random}`

    const labelMap: Record<string, string> = {
      flight: '機票',
      flight_hotel: '機加酒',
      hotel: '訂房',
    }
    const typeLabel = labelMap[serviceType] || serviceType
    const name = customerName ? `${customerName} ${typeLabel}` : `${typeLabel} ${dateStr}`

    const adHocTour: Partial<Tour> = {
      code,
      name,
      departure_date: dateStr,
      return_date: dateStr,
      status: '待出發',
      tour_service_type: serviceType,
      max_participants: 99,
      contract_status: 'pending',
      total_revenue: 0,
      total_cost: 0,
      profit: 0,
      created_at: this.now(),
      updated_at: this.now(),
    }

    return await this.create(adHocTour as unknown as Tour & BaseEntity)
  }
}

export const tourService = new TourService()
