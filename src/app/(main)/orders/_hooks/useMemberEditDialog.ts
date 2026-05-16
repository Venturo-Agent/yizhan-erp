'use client'

import { useState } from 'react'
import { logger } from '@/lib/utils/logger'
import { supabase } from '@/lib/supabase/client'
import { useCustomersSlim, createCustomer } from '@/data'
import { alert } from '@/lib/ui/alert-dialog'
import type { OrderMember } from '@/app/(main)/orders/_types/order-member.types'
import { useTranslations } from 'next-intl'

interface UseMemberEditDialogParams {
  members: OrderMember[]
  setMembers: React.Dispatch<React.SetStateAction<OrderMember[]>>
}

export function useMemberEditDialog({ members, setMembers }: UseMemberEditDialogParams) {
  const t = useTranslations('orders')
  const [editingMember, setEditingMember] = useState<OrderMember | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editMode, setEditMode] = useState<'verify' | 'edit'>('edit')
  const [editFormData, setEditFormData] = useState<Partial<OrderMember>>({})
  const [isSaving, setIsSaving] = useState(false)

  const { items: customers } = useCustomersSlim({ all: true })

  // 打開編輯/驗證彈窗
  const openEditDialog = (member: OrderMember, mode: 'verify' | 'edit') => {
    setEditingMember(member)
    setEditMode(mode)
    setEditFormData({
      chinese_name: member.chinese_name || '',
      passport_name: member.passport_name || '',
      passport_name_print: member.passport_name_print || '',
      birth_date: member.birth_date || '',
      gender: member.gender || '',
      id_number: member.id_number || '',
      passport_number: member.passport_number || '',
      passport_expiry: member.passport_expiry || '',
      special_meal: member.special_meal || '',
      remarks: member.remarks || '',
    })
    setIsEditDialogOpen(true)
  }

  // 儲存編輯/驗證（同步更新 order_members + customers）
  // 注意：圖片旋轉/翻轉/裁剪現在由工具列即時儲存，此處只處理表單資料
  const handleSaveEdit = async () => {
    if (!editingMember) return
    setIsSaving(true)

    try {
      // 1. 更新 order_members
      // 空字串轉 null（日期欄位不接受空字串）
      const memberUpdateData: Record<string, unknown> = {
        chinese_name: editFormData.chinese_name || null,
        passport_name: editFormData.passport_name || null,
        passport_name_print: editFormData.passport_name_print || null,
        birth_date: editFormData.birth_date || null,
        gender: editFormData.gender || null,
        id_number: editFormData.id_number || null,
        passport_number: editFormData.passport_number || null,
        passport_expiry: editFormData.passport_expiry || null,
        special_meal: editFormData.special_meal || null,
        remarks: editFormData.remarks || null,
      }

      const { error: memberError } = await supabase
        .from('order_members')
        .update(memberUpdateData)
        .eq('id', editingMember.id)

      if (memberError) throw memberError

      // 2. 處理顧客資料
      let newCustomerId: string | null = null

      if (editingMember.customer_id) {
        // 2a. 有關聯的顧客，同步更新 customers
        // 空字串轉 null（日期欄位不接受空字串）
        const customerUpdateData: Record<string, unknown> = {
          name: editFormData.chinese_name || null,
          passport_name: editFormData.passport_name || null,
          birth_date: editFormData.birth_date || null,
          gender: editFormData.gender || null,
          national_id: editFormData.id_number || null,
          passport_number: editFormData.passport_number || null,
          passport_expiry: editFormData.passport_expiry || null,
        }

        // 儲存時自動更新驗證狀態為 verified（無論是編輯或驗證模式）
        // 因為使用者已經看過並確認資料了
        customerUpdateData.verification_status = 'verified'

        const { error: customerError } = await supabase
          .from('customers')
          .update(customerUpdateData)
          .eq('id', editingMember.customer_id)

        if (customerError) {
          logger.error(t('updateCustomerFailed'), customerError)
        }
      } else if (
        editFormData.chinese_name ||
        editFormData.passport_number ||
        editFormData.id_number
      ) {
        // 2b. 沒有關聯顧客但有填寫資料，嘗試比對或建立新顧客
        const passportNumber = editFormData.passport_number?.trim() || null
        const idNumber = editFormData.id_number?.trim() || null
        const birthDate = editFormData.birth_date || null
        const cleanChineseName = editFormData.chinese_name?.replace(/\([^)]+\)$/, '').trim() || null

        // 先比對現有顧客
        const existingCustomer = customers.find(c => {
          // 1. 優先用護照號碼比對
          if (passportNumber && c.passport_number === passportNumber) return true
          // 2. 其次用身分證比對
          if (idNumber && c.national_id === idNumber) return true
          // 3. 備用：姓名+生日比對
          if (
            cleanChineseName &&
            birthDate &&
            c.name?.replace(/\([^)]+\)$/, '').trim() === cleanChineseName &&
            c.birth_date === birthDate
          )
            return true
          return false
        })

        if (existingCustomer) {
          // 找到現有顧客，關聯到成員（同時同步護照圖片）
          newCustomerId = existingCustomer.id
          const memberUpdate: Record<string, unknown> = { customer_id: existingCustomer.id }
          // 如果客戶有護照圖片且成員沒有，同步過來
          if (existingCustomer.passport_image_url && !editingMember.passport_image_url) {
            memberUpdate.passport_image_url = existingCustomer.passport_image_url
          }
          await supabase.from('order_members').update(memberUpdate).eq('id', editingMember.id)

          // 同時更新顧客資料
          await supabase
            .from('customers')
            .update({
              name: editFormData.chinese_name || existingCustomer.name,
              passport_name: editFormData.passport_name || existingCustomer.passport_name,
              birth_date: editFormData.birth_date || existingCustomer.birth_date,
              gender: editFormData.gender || existingCustomer.gender,
              national_id: editFormData.id_number || existingCustomer.national_id,
              passport_number: editFormData.passport_number || existingCustomer.passport_number,
              passport_expiry: editFormData.passport_expiry || existingCustomer.passport_expiry,
              verification_status: 'verified',
            })
            .eq('id', existingCustomer.id)

          logger.info(`✅ 已關聯現有顧客: ${existingCustomer.name}`)
        } else {
          // 沒找到，建立新顧客
          const newCustomer = await createCustomer({
            name: editFormData.chinese_name || '',
            passport_name: editFormData.passport_name || '',
            passport_number: passportNumber || null,
            passport_expiry: editFormData.passport_expiry || null,
            national_id: idNumber || null,
            birth_date: birthDate || null,
            gender: editFormData.gender || null,
            phone: '',
            is_vip: false,
            is_active: true,
            total_spent: 0,
            total_orders: 0,
            verification_status: 'verified',
            member_type: 'member',
          })

          if (newCustomer) {
            newCustomerId = newCustomer.id
            await supabase
              .from('order_members')
              .update({ customer_id: newCustomer.id })
              .eq('id', editingMember.id)
            logger.info(`✅ 已建立新顧客: ${newCustomer.name}`)
          }
        }
      }

      // 3. 更新本地狀態（儲存後即為已驗證）
      // 注意：同時同步 passport_image_url（可能在編輯過程中被裁剪/旋轉更新）
      setMembers(
        members.map(m =>
          m.id === editingMember.id
            ? {
                ...m,
                ...memberUpdateData,
                passport_image_url: editingMember.passport_image_url,
                customer_id: newCustomerId || editingMember.customer_id,
                customer_verification_status: 'verified',
              }
            : m
        )
      )

      // 4. 關閉彈窗
      setIsEditDialogOpen(false)
      setEditingMember(null)
      void alert(
        editMode === 'verify' ? t('verifyComplete') : t('saveSuccess'),
        'success'
      )
    } catch (error) {
      logger.error(t('saveFailed2'), error)
      void alert(
        t('saveFailed3') +
          (error instanceof Error ? error.message : t('unknownError')),
        'error'
      )
    } finally {
      setIsSaving(false)
    }
  }

  return {
    editingMember,
    setEditingMember,
    isEditDialogOpen,
    setIsEditDialogOpen,
    editMode,
    setEditMode,
    editFormData,
    setEditFormData,
    isSaving,
    openEditDialog,
    handleSaveEdit,
  }
}
