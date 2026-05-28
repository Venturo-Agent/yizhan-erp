'use client'

/**
 * useOrderMembersData - 訂單成員資料管理與對話框狀態 Hook
 * 從 OrderMembersExpandable.tsx 拆分出來
 *
 * 此 hook 負責：
 * - 成員列表資料載入與狀態管理
 * - 旅遊團出發/回程日期載入
 * - 顧客資料合併與背景同步
 * - 初始化 useEffect
 *
 * 成員 CRUD 操作 → useOrderMemberActions
 * Realtime 訂閱   → useOrderMembersRealtime
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import type { OrderMember } from '../_types/order-member.types'
import { useOrderMemberActions } from './useOrderMemberActions'
import { useOrderMembersRealtime } from './useOrderMembersRealtime'

// 快取已同步的顧客 ID，避免重複同步
const syncedCustomerIds = new Set<string>()

// 成員列表 client 快取：關掉彈窗重開時先「秒顯示」上次的、背景再更新（stale-while-revalidate）。
// key 帶 workspaceId 防跨租戶污染（紅線 G 精神）。過渡做法、正解是遷進 entity hook。
const membersCache = new Map<string, OrderMember[]>()

interface UseOrderMembersDataParams {
  orderId?: string
  tourId: string
  workspaceId: string
  mode: 'order' | 'tour'
}

interface TourOrder {
  id: string
  order_number: string | null
}

export function useOrderMembersData({
  orderId,
  tourId,
  workspaceId,
  mode,
}: UseOrderMembersDataParams) {
  // ========== 成員資料狀態 ==========
  const [members, setMembers] = useState<OrderMember[]>([])
  const [loading, setLoading] = useState(false)
  const [departureDate, setDepartureDate] = useState<string | null>(null)
  const [returnDate, setReturnDate] = useState<string | null>(null)

  // ========== 團體模式相關狀態 ==========
  const [orderCount, setOrderCount] = useState(0)
  const [tourOrders, setTourOrders] = useState<TourOrder[]>([])

  /**
   * 載入旅遊團出發/回程日期
   */
  const loadTourDepartureDate = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('tours')
        .select('departure_date, return_date')
        .eq('id', tourId)
        .single()

      if (error) throw error
      setDepartureDate(data?.departure_date || null)
      setReturnDate(data?.return_date || null)
    } catch (error) {
      logger.error('載入出發日期失敗:', error)
    }
  }, [tourId])

  /**
   * 載入成員資料
   * - 單一訂單模式：載入該訂單的成員
   * - 團體模式：載入該旅遊團所有訂單的成員
   */
  const loadMembers = useCallback(async () => {
    // 快取 key 帶 workspaceId（防跨租戶污染）
    const cacheKey = `${workspaceId}:${mode === 'tour' ? `tour:${tourId}` : `order:${orderId ?? ''}`}`
    // 有上次的就先秒顯示、不轉圈；沒有才顯示 loading（關掉重開免空等）
    const cached = membersCache.get(cacheKey)
    if (cached) {
      setMembers(cached)
    } else {
      setLoading(true)
    }
    try {
      let membersData: OrderMember[] = []
      let orderCodeMap: Record<string, string> = {}

      if (mode === 'tour') {
        // 團體模式：載入旅遊團所有訂單的成員
        // 1. 先查詢該旅遊團的所有訂單
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('id, order_number')
          .eq('tour_id', tourId)
          .order('created_at', { ascending: true })

        if (ordersError) throw ordersError

        if (ordersData && ordersData.length > 0) {
          // 設定訂單數量和訂單列表
          setOrderCount(ordersData.length)
          setTourOrders(ordersData)

          // 建立訂單編號對應表（只取序號部分，如 "01"）
          orderCodeMap = Object.fromEntries(
            ordersData.map(o => {
              const orderNum = o.order_number || ''
              // 從 "CNX250128A-01" 提取 "01"
              const seqMatch = orderNum.match(/-(\d+)$/)
              return [o.id, seqMatch ? seqMatch[1] : orderNum]
            })
          )
          const orderIds = ordersData.map(o => o.id)

          // 2. 載入這些訂單的所有成員
          const { data: allMembersData, error: membersError } = await supabase
            .from('order_members')
            .select(
              'id, order_id, chinese_name, passport_name, passport_name_print, gender, age, birth_date, identity, member_type, id_number, passport_number, passport_expiry, passport_image_url, pnr, ticket_number, ticketing_deadline, hotel_1_name, hotel_1_checkin, hotel_1_checkout, hotel_2_name, hotel_2_checkin, hotel_2_checkout, selling_price, cost_price, flight_cost, transport_cost, misc_cost, profit, deposit_amount, balance_amount, deposit_receipt_no, balance_receipt_no, total_payable, special_meal, remarks, customer_id, checked_in, checked_in_at, sort_order, flight_self_arranged, custom_costs, workspace_id, created_at, created_by, updated_at, updated_by'
            )
            .in('order_id', orderIds)
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: true })
            .order('id', { ascending: true }) // 加上 id 確保順序穩定
            .limit(500)

          if (membersError) throw membersError
          membersData = allMembersData || []
        }
      } else if (orderId) {
        // 單一訂單模式
        const { data, error: membersError } = await supabase
          .from('order_members')
          .select(
            'id, order_id, chinese_name, passport_name, passport_name_print, gender, age, birth_date, identity, member_type, id_number, passport_number, passport_expiry, passport_image_url, pnr, ticket_number, ticketing_deadline, hotel_1_name, hotel_1_checkin, hotel_1_checkout, hotel_2_name, hotel_2_checkin, hotel_2_checkout, selling_price, cost_price, flight_cost, transport_cost, misc_cost, profit, deposit_amount, balance_amount, deposit_receipt_no, balance_receipt_no, total_payable, special_meal, remarks, customer_id, checked_in, checked_in_at, sort_order, flight_self_arranged, custom_costs, workspace_id, created_at, created_by, updated_at, updated_by'
          )
          .eq('order_id', orderId)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true })
          .order('id', { ascending: true }) // 加上 id 確保順序穩定
          .limit(500)

        if (membersError) throw membersError
        membersData = data || []
      }

      // 收集所有有 customer_id 的成員
      const customerIds = membersData.map(m => m.customer_id).filter(Boolean) as string[]

      // 如果有 customer_id，批次查詢顧客完整資料
      let customerDataMap: Record<
        string,
        {
          name: string | null
          passport_name: string | null
          birth_date: string | null
          passport_number: string | null
          passport_expiry: string | null
          gender: string | null
          verification_status: string
          passport_image_url: string | null
        }
      > = {}
      if (customerIds.length > 0) {
        const { data: customersData } = await supabase
          .from('customers')
          .select(
            'id, name, passport_name, birth_date, passport_number, passport_expiry, gender, verification_status, passport_image_url'
          )
          .in('id', customerIds)

        if (customersData) {
          customerDataMap = Object.fromEntries(
            customersData.map(c => [
              c.id,
              {
                name: c.name || null,
                passport_name: c.passport_name || null,
                birth_date: c.birth_date || null,
                passport_number: c.passport_number || null,
                passport_expiry: c.passport_expiry || null,
                gender: c.gender || null,
                verification_status: c.verification_status || '',
                passport_image_url: c.passport_image_url || null,
              },
            ])
          )
        }
      }

      // 合併驗證狀態和訂單編號到成員
      // 同時填補缺失的顧客資料（chinese_name, passport_name 等）並背景同步到資料庫
      const membersToSync: Array<{
        memberId: string
        customerId: string
        updateData: Record<string, unknown>
      }> = []

      const membersWithStatus = membersData.map(m => {
        const customerData = m.customer_id ? customerDataMap[m.customer_id] : null
        if (!customerData) {
          return {
            ...m,
            order_code: mode === 'tour' ? orderCodeMap[m.order_id] || null : null,
          }
        }

        // 準備合併的資料（優先使用 order_members 的資料，缺失時用 customers 的）
        const mergedData: Record<string, unknown> = {}
        const syncData: Record<string, unknown> = {}

        // 檢查並填補缺失的欄位
        const fieldsToCheck = [
          'chinese_name',
          'passport_name',
          'birth_date',
          'passport_number',
          'passport_expiry',
          'gender',
          'passport_image_url',
        ] as const

        fieldsToCheck.forEach(field => {
          const memberValue = m[field as keyof typeof m]
          const customerField =
            field === 'chinese_name' ? 'name' : (field as keyof typeof customerData)
          const customerValue = customerData[customerField]

          if (!memberValue && customerValue) {
            // order_members 沒資料但 customers 有，使用 customers 的資料
            mergedData[field] = customerValue
            syncData[field] = customerValue
          } else {
            // 使用 order_members 的資料
            mergedData[field] = memberValue
          }
        })

        // 如果有需要同步的資料且尚未同步過，加入同步列表
        if (
          Object.keys(syncData).length > 0 &&
          m.customer_id &&
          !syncedCustomerIds.has(m.customer_id)
        ) {
          membersToSync.push({
            memberId: m.id,
            customerId: m.customer_id,
            updateData: syncData,
          })
        }

        return {
          ...m,
          ...mergedData,
          customer_verification_status: customerData.verification_status || null,
          order_code: mode === 'tour' ? orderCodeMap[m.order_id] || null : null,
        }
      })

      // 背景同步：將顧客資料同步到成員資料庫（一次性修復）
      if (membersToSync.length > 0) {
        const uniqueCustomerIds = [...new Set(membersToSync.map(m => m.customerId))]
        uniqueCustomerIds.forEach(id => syncedCustomerIds.add(id))

        // 背景執行，不阻塞 UI
        void (async () => {
          for (const item of membersToSync) {
            await supabase.from('order_members').update(item.updateData).eq('id', item.memberId)
          }
          logger.info(
            `背景同步 ${membersToSync.length} 個成員的顧客資料（${Object.keys(membersToSync[0]?.updateData || {}).join(', ')}）`
          )
        })()
      }

      membersCache.set(cacheKey, membersWithStatus)
      setMembers(membersWithStatus)
    } catch (error) {
      logger.error('載入成員失敗:', error)
    } finally {
      setLoading(false)
    }
  }, [mode, tourId, orderId, workspaceId])

  /**
   * 初始載入
   */
  useEffect(() => {
    loadMembers()
    loadTourDepartureDate()
    // 顧客資料由 SWR 自動載入（用於編輯模式搜尋）
  }, [orderId, tourId, mode, loadMembers, loadTourDepartureDate])

  // ========== 成員 CRUD 操作（拆到獨立 hook）==========
  const actions = useOrderMemberActions({
    orderId,
    tourId,
    workspaceId,
    mode,
    members,
    setMembers,
    tourOrders,
    loadMembers,
  })

  // ========== Realtime 訂閱（拆到獨立 hook）==========
  useOrderMembersRealtime({
    orderId,
    tourId,
    mode,
    tourOrders,
    setMembers,
  })

  return {
    // 成員資料
    members,
    setMembers,
    loading,
    departureDate,
    returnDate,
    orderCount,
    tourOrders,

    // 資料載入函數
    loadMembers,
    loadTourDepartureDate,

    // 成員操作（從 useOrderMemberActions 展開）
    handleAddMember: actions.handleAddMember,
    confirmAddMembers: actions.confirmAddMembers,
    handleDeleteMember: actions.handleDeleteMember,
    handleReorderMembers: actions.handleReorderMembers,

    // 新增成員對話框狀態
    isAddDialogOpen: actions.isAddDialogOpen,
    setIsAddDialogOpen: actions.setIsAddDialogOpen,
    memberCountToAdd: actions.memberCountToAdd,
    setMemberCountToAdd: actions.setMemberCountToAdd,

    // 訂單選擇對話框狀態（團體模式）
    selectedOrderIdForAdd: actions.selectedOrderIdForAdd,
    setSelectedOrderIdForAdd: actions.setSelectedOrderIdForAdd,
    showOrderSelectDialog: actions.showOrderSelectDialog,
    setShowOrderSelectDialog: actions.setShowOrderSelectDialog,
  }
}
