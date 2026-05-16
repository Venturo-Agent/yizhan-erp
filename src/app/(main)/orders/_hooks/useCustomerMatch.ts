'use client'

import { useState } from 'react'
import { logger } from '@/lib/utils/logger'
import { supabase } from '@/lib/supabase/client'
import type { Customer } from '@/types/customer.types'
import type { OrderMember } from '@/app/(main)/orders/_types/order-member.types'

export type MatchType = 'name' | 'id_number'

export function useCustomerMatch(
  customers: Customer[],
  members: OrderMember[],
  setMembers: (members: OrderMember[]) => void
) {
  const [showCustomerMatchDialog, setShowCustomerMatchDialog] = useState(false)
  const [matchedCustomers, setMatchedCustomers] = useState<Customer[]>([])
  const [matchType, setMatchType] = useState<MatchType>('name')
  const [pendingMemberIndex, setPendingMemberIndex] = useState<number | null>(null)
  const [pendingMemberData, setPendingMemberData] = useState<Partial<OrderMember> | null>(null)

  // 根據姓名搜尋顧客（2字以上觸發）
  const checkCustomerMatchByName = (
    name: string,
    memberIndex: number,
    memberData: Partial<OrderMember>
  ) => {
    if (!name || name.length < 2) {
      return
    }

    // 模糊搜尋：顧客姓名包含輸入的字串
    const nameMatches = customers.filter(c => c.name?.includes(name) || name.includes(c.name || ''))

    if (nameMatches.length > 0) {
      setMatchedCustomers(nameMatches)
      setMatchType('name')
      setPendingMemberIndex(memberIndex)
      setPendingMemberData(memberData)
      setShowCustomerMatchDialog(true)
    }
  }

  // 根據身分證字號搜尋顧客（5字以上觸發）
  const checkCustomerMatchByIdNumber = async (
    idNumber: string,
    memberIndex: number,
    memberData: Partial<OrderMember>
  ) => {
    if (!idNumber || idNumber.length < 5) {
      return
    }

    // 雙向匹配身分證字號（輸入包含顧客ID 或 顧客ID包含輸入）
    const normalizedInput = idNumber.toUpperCase().trim()
    const idMatches = customers.filter(c => {
      if (!c.national_id) return false
      const normalizedCustomerId = c.national_id.toUpperCase().trim()
      // 前綴匹配或完全匹配
      return (
        normalizedCustomerId.startsWith(normalizedInput) ||
        normalizedInput.startsWith(normalizedCustomerId) ||
        normalizedCustomerId === normalizedInput
      )
    })

    if (idMatches.length > 0) {
      // 有找到顧客資料 → 彈出對話框選擇
      setMatchedCustomers(idMatches)
      setMatchType('id_number')
      setPendingMemberIndex(memberIndex)
      setPendingMemberData(memberData)
      setShowCustomerMatchDialog(true)
    } else if (normalizedInput.length >= 10) {
      // 沒有顧客資料 + 身分證字號完整 → 自動辨識性別
      const secondChar = normalizedInput.charAt(1)
      let gender: string | null = null

      if (secondChar === '1') {
        gender = 'M' // 男性
      } else if (secondChar === '2') {
        gender = 'F' // 女性
      }

      if (gender) {
        const member = members[memberIndex]
        if (!member) return

        // 更新本地狀態
        const updatedMembers = members.map((m, idx) => (idx === memberIndex ? { ...m, gender } : m))
        setMembers(updatedMembers)

        // 儲存到資料庫
        const { error } = await supabase
          .from('order_members')
          .update({ gender })
          .eq('id', member.id)

        if (error) {
          logger.error('更新成員資料失敗:', error)
        } else {
          logger.info(`自動辨識性別：${gender === 'M' ? '男性' : '女性'}`)
        }
      }
    }
  }

  // 選擇顧客後帶入資料
  const handleSelectCustomer = async (customer: Customer) => {
    if (pendingMemberIndex === null) return

    const member = members[pendingMemberIndex]
    if (!member) return

    // 列表模式不載入 passport_image_url，需要額外查詢
    let passportImageUrl = customer.passport_image_url || member.passport_image_url
    if (!passportImageUrl) {
      const { data: detail } = await supabase
        .from('customers')
        .select('passport_image_url')
        .eq('id', customer.id)
        .single()
      if (detail?.passport_image_url) {
        passportImageUrl = detail.passport_image_url
      }
    }

    // 更新本地狀態
    const updatedMember = {
      ...member,
      chinese_name: customer.name || member.chinese_name,
      passport_name: customer.passport_name || member.passport_name,
      birth_date: customer.birth_date || member.birth_date,
      gender: customer.gender || member.gender,
      id_number: customer.national_id || member.id_number,
      passport_number: customer.passport_number || member.passport_number,
      passport_expiry: customer.passport_expiry || member.passport_expiry,
      passport_image_url: passportImageUrl,
      customer_id: customer.id,
      customer_verification_status: customer.verification_status,
    }

    setMembers(members.map((m, i) => (i === pendingMemberIndex ? updatedMember : m)))

    // 儲存到資料庫
    try {
      await supabase
        .from('order_members')
        .update({
          chinese_name: updatedMember.chinese_name,
          passport_name: updatedMember.passport_name,
          birth_date: updatedMember.birth_date,
          gender: updatedMember.gender,
          id_number: updatedMember.id_number,
          passport_number: updatedMember.passport_number,
          passport_expiry: updatedMember.passport_expiry,
          passport_image_url: updatedMember.passport_image_url,
          customer_id: updatedMember.customer_id,
        })
        .eq('id', member.id)
    } catch (error) {
      logger.error('更新成員資料失敗:', error)
    }

    // 關閉對話框
    setShowCustomerMatchDialog(false)
    setPendingMemberIndex(null)
    setPendingMemberData(null)
  }

  const closeCustomerMatchDialog = () => {
    setShowCustomerMatchDialog(false)
    setPendingMemberIndex(null)
    setPendingMemberData(null)
  }

  return {
    showCustomerMatchDialog,
    setShowCustomerMatchDialog,
    matchedCustomers,
    matchType,
    pendingMemberIndex,
    pendingMemberData,
    checkCustomerMatchByName,
    checkCustomerMatchByIdNumber,
    handleSelectCustomer,
    closeCustomerMatchDialog,
  }
}
