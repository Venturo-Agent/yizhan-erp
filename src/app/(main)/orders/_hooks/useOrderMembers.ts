/**
 * useOrderMembers - 訂單成員資料管理 Hook
 * 從 OrderMembersExpandable.tsx 拆分出來
 */

import { useState, useEffect, useCallback } from 'react'
import { mutate as globalMutate } from '@/lib/swr/scoped-mutate'
import { invalidate_cache_pattern } from '@/lib/cache/indexeddb-cache'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { confirm } from '@/lib/ui/alert-dialog'
import type { OrderMember, CustomCostField } from '../_types/order-member.types'
import {
  recalculateParticipants,
  recalculateTourRevenue,
} from '@/app/(main)/tours/_services/tour-stats.service'
import { recalculateOrderAmount } from '@/app/(main)/orders/_services/order-stats.service'

interface UseOrderMembersParams {
  orderId?: string
  tourId: string
  workspaceId: string
  mode: 'order' | 'tour'
}

interface UseOrderMembersReturn {
  // 資料
  members: OrderMember[]
  loading: boolean
  departureDate: string | null
  returnDate: string | null
  orderCount: number
  roomAssignments: Record<string, string>
  vehicleAssignments: Record<string, string>
  pnrValues: Record<string, string>
  customCostFields: CustomCostField[]

  // 操作
  loadMembers: () => Promise<void>
  addMembers: (count: number) => Promise<void>
  deleteMember: (memberId: string) => Promise<boolean>
  updateMember: (
    memberId: string,
    field: keyof OrderMember,
    value: string | number | null
  ) => Promise<void>
  updateMemberData: (memberId: string, data: Partial<OrderMember>) => Promise<void>
  setPnrValue: (memberId: string, value: string) => void
  setCustomCostFields: React.Dispatch<React.SetStateAction<CustomCostField[]>>
  refreshRoomAssignments: () => Promise<void>
  refreshVehicleAssignments: () => Promise<void>
}

export function useOrderMembers({
  orderId,
  tourId,
  workspaceId,
  mode,
}: UseOrderMembersParams): UseOrderMembersReturn {
  const [members, setMembers] = useState<OrderMember[]>([])
  const [loading, setLoading] = useState(false)
  const [departureDate, setDepartureDate] = useState<string | null>(null)
  const [returnDate, setReturnDate] = useState<string | null>(null)
  const [orderCount, setOrderCount] = useState(0)
  const [roomAssignments, setRoomAssignments] = useState<Record<string, string>>({})
  const [vehicleAssignments, setVehicleAssignments] = useState<Record<string, string>>({})
  const [pnrValues, setPnrValues] = useState<Record<string, string>>({})
  const [customCostFields, setCustomCostFields] = useState<CustomCostField[]>([])

  // 載入旅遊團出發/回程日期
  const loadTourDates = useCallback(async () => {
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

  // 分房 / 分車系統未啟用、stub 為 noop
  const loadRoomAssignments = useCallback(async () => {
    setRoomAssignments({})
  }, [])

  const loadVehicleAssignments = useCallback(async () => {
    setVehicleAssignments({})
  }, [])

  // 載入成員資料
  const loadMembers = useCallback(async () => {
    setLoading(true)
    try {
      let membersData: OrderMember[] = []

      if (mode === 'tour') {
        // 團體模式：取得該旅遊團所有訂單的成員
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('id, order_number')
          .eq('tour_id', tourId)

        if (ordersError) throw ordersError

        if (ordersData && ordersData.length > 0) {
          setOrderCount(ordersData.length)

          // 建立訂單編號對照表
          const orderCodeMap: Record<string, string> = {}
          ordersData.forEach(o => {
            const orderNum = o.order_number || ''
            const seqMatch = orderNum.match(/-(\d+)$/)
            orderCodeMap[o.id] = seqMatch ? seqMatch[1] : orderNum
          })

          const orderIds = ordersData.map(o => o.id)

          const { data: allMembersData, error: membersError } = await supabase
            .from('order_members')
            .select(
              'id, order_id, chinese_name, passport_name, passport_name_print, gender, age, birth_date, identity, member_type, id_number, passport_number, passport_expiry, passport_image_url, pnr, ticket_number, ticketing_deadline, hotel_1_name, hotel_1_checkin, hotel_1_checkout, hotel_2_name, hotel_2_checkin, hotel_2_checkout, selling_price, cost_price, flight_cost, transport_cost, misc_cost, profit, deposit_amount, balance_amount, deposit_receipt_no, balance_receipt_no, total_payable, special_meal, remarks, customer_id, checked_in, checked_in_at, sort_order, flight_self_arranged, custom_costs, workspace_id, created_at, created_by, updated_at, updated_by'
            )
            .in('order_id', orderIds)
            .order('created_at', { ascending: true })
            .limit(500)

          if (membersError) throw membersError
          membersData = (allMembersData || []).map(m => ({
            ...m,
            order_code: orderCodeMap[m.order_id] || '',
          }))
        }
      } else {
        // 單一訂單模式
        if (!orderId) {
          setMembers([])
          return
        }
        const { data, error: membersError } = await supabase
          .from('order_members')
          .select(
            'id, order_id, chinese_name, passport_name, passport_name_print, gender, age, birth_date, identity, member_type, id_number, passport_number, passport_expiry, passport_image_url, pnr, ticket_number, ticketing_deadline, hotel_1_name, hotel_1_checkin, hotel_1_checkout, hotel_2_name, hotel_2_checkin, hotel_2_checkout, selling_price, cost_price, flight_cost, transport_cost, misc_cost, profit, deposit_amount, balance_amount, deposit_receipt_no, balance_receipt_no, total_payable, special_meal, remarks, customer_id, checked_in, checked_in_at, sort_order, flight_self_arranged, custom_costs, workspace_id, created_at, created_by, updated_at, updated_by'
          )
          .eq('order_id', orderId)
          .order('created_at', { ascending: true })
          .limit(500)

        if (membersError) throw membersError
        membersData = data || []
      }

      // 取得關聯顧客的驗證狀態
      const customerIds = membersData.map(m => m.customer_id).filter((id): id is string => !!id)

      if (customerIds.length > 0) {
        const { data: customersData } = await supabase
          .from('customers')
          .select('id, verification_status')
          .in('id', customerIds)

        if (customersData) {
          const statusMap = new Map(customersData.map(c => [c.id, c.verification_status]))
          membersData = membersData.map(m => ({
            ...m,
            customer_verification_status: m.customer_id
              ? statusMap.get(m.customer_id) || null
              : null,
          }))
        }
      }

      setMembers(membersData)
    } catch (error) {
      logger.error('載入成員失敗:', error)
    } finally {
      setLoading(false)
    }
  }, [orderId, tourId, mode])

  // 新增成員
  const addMembers = useCallback(
    async (count: number) => {
      if (!orderId) return

      try {
        // 拿這張單目前最大 sort_order、新成員從 max+1 起遞增、避免一堆都搶 default 0 → 排序亂跳
        const { data: maxRow } = await supabase
          .from('order_members')
          .select('sort_order')
          .eq('order_id', orderId)
          .order('sort_order', { ascending: false })
          .limit(1)
          .maybeSingle()
        const baseSortOrder = (maxRow?.sort_order ?? 0)

        const newMembers = Array.from({ length: count }, (_, i) => ({
          order_id: orderId,
          workspace_id: workspaceId,
          member_type: 'adult' as const,
          identity: '大人',
          sort_order: baseSortOrder + i + 1,
        }))

        const { data, error } = await supabase.from('order_members').insert(newMembers).select()

        if (error) throw error

        if (data) {
          setMembers(prev => [...prev, ...data])
        }
        globalMutate(
          (key: string) => typeof key === 'string' && key.startsWith('entity:order_members'),
          undefined,
          { revalidate: true }
        )
        invalidate_cache_pattern('entity:order_members')

        // 重算團人數
        if (tourId) {
          recalculateParticipants(tourId).catch(err => {
            logger.error('重算團人數失敗:', err)
          })
        }
      } catch (error) {
        logger.error('新增成員失敗:', error)
        throw error
      }
    },
    [orderId, workspaceId, tourId]
  )

  // 刪除成員
  const deleteMember = useCallback(
    async (memberId: string): Promise<boolean> => {
      const confirmed = await confirm('確定要刪除此成員嗎？', {
        confirmText: '刪除',
        cancelText: '取消',
      })

      if (!confirmed) return false

      try {
        const { error } = await supabase.from('order_members').delete().eq('id', memberId)

        if (error) throw error

        setMembers(prev => prev.filter(m => m.id !== memberId))
        globalMutate(
          (key: string) => typeof key === 'string' && key.startsWith('entity:order_members'),
          undefined,
          { revalidate: true }
        )
        invalidate_cache_pattern('entity:order_members')

        // 重算團人數
        if (tourId) {
          recalculateParticipants(tourId).catch(err => {
            logger.error('重算團人數失敗:', err)
          })
        }

        return true
      } catch (error) {
        logger.error('刪除成員失敗:', error)
        return false
      }
    },
    [tourId]
  )

  // 更新成員單一欄位
  const updateMember = useCallback(
    async (memberId: string, field: keyof OrderMember, value: string | number | null) => {
      try {
        const { error } = await supabase
          .from('order_members')
          .update({ [field]: value })
          .eq('id', memberId)

        if (error) throw error

        setMembers(prev => prev.map(m => (m.id === memberId ? { ...m, [field]: value } : m)))
        globalMutate(
          (key: string) => typeof key === 'string' && key.startsWith('entity:order_members'),
          undefined,
          { revalidate: true }
        )
        invalidate_cache_pattern('entity:order_members')

        // 如果修改了金額欄位、重算訂單金額 + 團 revenue
        if (field === 'total_payable' || field === 'selling_price') {
          const member = members.find(m => m.id === memberId)
          if (member?.order_id) {
            recalculateOrderAmount(member.order_id).catch(err => {
              logger.error('重算訂單金額失敗:', err)
            })
          }
          // member 有 denorm tour_id（migration 加的）、直接拿來重算團統計
          const memberTourId = (member as unknown as { tour_id?: string | null })?.tour_id
          if (memberTourId) {
            recalculateTourRevenue(memberTourId).catch(err => {
              logger.error('重算團收入失敗:', err)
            })
          }
        }
      } catch (error) {
        logger.error('更新成員失敗:', error)
      }
    },
    [members]
  )

  // 更新成員多個欄位
  const updateMemberData = useCallback(
    async (memberId: string, data: Partial<OrderMember>) => {
      try {
        const { error } = await supabase.from('order_members').update(data).eq('id', memberId)

        if (error) throw error

        setMembers(prev => prev.map(m => (m.id === memberId ? { ...m, ...data } : m)))
        globalMutate(
          (key: string) => typeof key === 'string' && key.startsWith('entity:order_members'),
          undefined,
          { revalidate: true }
        )
        invalidate_cache_pattern('entity:order_members')

        // 如果修改了金額欄位，重算訂單金額
        if ('total_payable' in data || 'selling_price' in data) {
          const member = members.find(m => m.id === memberId)
          if (member?.order_id) {
            recalculateOrderAmount(member.order_id).catch(err => {
              logger.error('重算訂單金額失敗:', err)
            })
          }
        }
      } catch (error) {
        logger.error('更新成員失敗:', error)
        throw error
      }
    },
    [members]
  )

  // 設定 PNR 值
  const setPnrValue = useCallback((memberId: string, value: string) => {
    setPnrValues(prev => ({ ...prev, [memberId]: value }))
  }, [])

  // 初始載入
  useEffect(() => {
    loadMembers()
    loadTourDates()
    if (mode === 'tour') {
      loadRoomAssignments()
      loadVehicleAssignments()
    }
  }, [loadMembers, loadTourDates, loadRoomAssignments, loadVehicleAssignments, mode])

  return {
    members,
    loading,
    departureDate,
    returnDate,
    orderCount,
    roomAssignments,
    vehicleAssignments,
    pnrValues,
    customCostFields,
    loadMembers,
    addMembers,
    deleteMember,
    updateMember,
    updateMemberData,
    setPnrValue,
    setCustomCostFields,
    refreshRoomAssignments: loadRoomAssignments,
    refreshVehicleAssignments: loadVehicleAssignments,
  }
}
