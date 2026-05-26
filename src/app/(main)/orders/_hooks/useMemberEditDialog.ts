'use client'

import { useState } from 'react'
import { logger } from '@/lib/utils/logger'
import { supabase } from '@/lib/supabase/client'
import { useCustomersSlim, createCustomer } from '@/data'
import { alert } from '@/lib/ui/alert-dialog'
import type { OrderMember } from '@/app/(main)/orders/_types/order-member.types'
import type { Customer } from '@/types/customer.types'
import { matchCustomer } from '@/app/(main)/orders/_services/customer-match.service'
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

  // 撞名確認對話框狀態（身分證沒比中、但名字撞到既有顧客時觸發）
  const [clashDialogOpen, setClashDialogOpen] = useState(false)
  const [clashCandidates, setClashCandidates] = useState<Customer[]>([])
  // 暫存撞名當下要寫進顧客/成員的表單資料（使用者選「更新既有」或「建為新顧客」後才落地）
  const [clashPendingMemberId, setClashPendingMemberId] = useState<string | null>(null)
  const [clashPendingForm, setClashPendingForm] = useState<Partial<OrderMember>>({})
  const [isResolvingClash, setIsResolvingClash] = useState(false)

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

  // 把表單資料寫進現有顧客本尊（含換新護照），並把成員連到該顧客
  const linkAndUpdateCustomer = async (
    memberId: string,
    customerId: string,
    form: Partial<OrderMember>
  ): Promise<string> => {
    // 取現有顧客明細（補空欄位用、避免把既有值蓋成空）
    const { data: existing } = await supabase
      .from('customers')
      .select(
        'name, passport_name, birth_date, gender, national_id, passport_number, passport_expiry, passport_image_url'
      )
      .eq('id', customerId)
      .maybeSingle()
    const ex = existing as Record<string, unknown> | null

    // 連結成員 → 顧客（順便補護照圖片）
    const memberUpdate: Record<string, unknown> = { customer_id: customerId }
    const exPassportImg = (ex?.passport_image_url as string | null) || null
    const myMember = members.find(m => m.id === memberId)
    if (exPassportImg && myMember && !myMember.passport_image_url) {
      memberUpdate.passport_image_url = exPassportImg
    }
    await supabase.from('order_members').update(memberUpdate).eq('id', memberId)

    // 更新本尊資料（護照號會換、以表單新值優先；其餘欄位空才不蓋舊值）
    const customerUpdate: Record<string, unknown> = {
      name: form.chinese_name || (ex?.name as string) || null,
      passport_name: form.passport_name || (ex?.passport_name as string) || null,
      birth_date: form.birth_date || (ex?.birth_date as string) || null,
      gender: form.gender || (ex?.gender as string) || null,
      national_id: form.id_number || (ex?.national_id as string) || null,
      passport_number: form.passport_number || (ex?.passport_number as string) || null,
      passport_expiry: form.passport_expiry || (ex?.passport_expiry as string) || null,
      verification_status: 'verified',
    }
    await supabase.from('customers').update(customerUpdate).eq('id', customerId)

    return customerId
  }

  // 用表單資料建立新顧客，並把成員連過去
  const createAndLinkCustomer = async (
    memberId: string,
    form: Partial<OrderMember>
  ): Promise<string | null> => {
    const newCustomer = await createCustomer({
      name: form.chinese_name || '',
      passport_name: form.passport_name || '',
      passport_number: form.passport_number?.trim() || null,
      passport_expiry: form.passport_expiry || null,
      national_id: form.id_number?.trim() || null,
      birth_date: form.birth_date || null,
      gender: form.gender || null,
      phone: '',
      is_vip: false,
      is_active: true,
      total_spent: 0,
      total_orders: 0,
      verification_status: 'verified',
      member_type: 'member',
    })
    if (!newCustomer) return null
    await supabase.from('order_members').update({ customer_id: newCustomer.id }).eq('id', memberId)
    return newCustomer.id
  }

  // 儲存編輯/驗證（同步更新 order_members + customers）
  // 2026-05-26 重設計：
  //  - 只有填了護照號或身分證號才建/連顧客（光名字不建 → 防空白重複卡）
  //  - 比對走共用函式 matchCustomer（身分證錨點 → 名字）
  //  - matched：連結 + 更新本尊（含換新護照）
  //  - ambiguous：不自動建，觸發撞名確認對話框
  //  - none：建新
  const handleSaveEdit = async () => {
    if (!editingMember) return
    setIsSaving(true)

    try {
      // 1. 更新 order_members（空字串轉 null，日期欄位不接受空字串）
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

      const passportNumber = editFormData.passport_number?.trim() || null
      const idNumber = editFormData.id_number?.trim() || null
      // 「有身分」門檻：只有填了護照號或身分證號才碰顧客主檔（光名字不建）
      const hasIdentity = Boolean(passportNumber || idNumber)

      if (editingMember.customer_id) {
        // 2a. 已關聯顧客 → 同步更新本尊（不論有沒有護照/身分證，因為使用者已確認過資料）
        const customerUpdateData: Record<string, unknown> = {
          name: editFormData.chinese_name || null,
          passport_name: editFormData.passport_name || null,
          birth_date: editFormData.birth_date || null,
          gender: editFormData.gender || null,
          national_id: editFormData.id_number || null,
          passport_number: editFormData.passport_number || null,
          passport_expiry: editFormData.passport_expiry || null,
          verification_status: 'verified',
        }

        const { error: customerError } = await supabase
          .from('customers')
          .update(customerUpdateData)
          .eq('id', editingMember.customer_id)

        if (customerError) {
          logger.error(t('updateCustomerFailed'), customerError)
        }
      } else if (hasIdentity) {
        // 2b. 沒關聯顧客、且有身分證件 → 走共用比對函式
        const result = matchCustomer(
          {
            chinese_name: editFormData.chinese_name,
            national_id: idNumber,
            passport_number: passportNumber,
          },
          customers
        )

        if (result.kind === 'matched' && result.customerId) {
          // 可靠對中（身分證錨點 / 護照+名字）→ 連結 + 更新本尊（含換新護照）
          newCustomerId = await linkAndUpdateCustomer(
            editingMember.id,
            result.customerId,
            editFormData
          )
          logger.info(`✅ 已關聯現有顧客: ${result.matchedCustomer?.name ?? result.customerId}`)
        } else if (result.kind === 'ambiguous') {
          // 撞名 → 不自動建，觸發撞名確認對話框（使用者選更新既有 / 建為新顧客）
          setClashCandidates(result.candidates ?? [])
          setClashPendingMemberId(editingMember.id)
          setClashPendingForm({ ...editFormData })

          // 先把本地成員資料更新（成員本身已存好），再開撞名對話框讓使用者處理顧客連結
          setMembers(
            members.map(m =>
              m.id === editingMember.id
                ? {
                    ...m,
                    ...memberUpdateData,
                    passport_image_url: editingMember.passport_image_url,
                  }
                : m
            )
          )
          setIsEditDialogOpen(false)
          setEditingMember(null)
          setClashDialogOpen(true)
          setIsSaving(false)
          return
        } else {
          // 查無 → 建新顧客
          newCustomerId = await createAndLinkCustomer(editingMember.id, editFormData)
          if (newCustomerId) logger.info(`✅ 已建立新顧客`)
        }
      }
      // else：沒關聯顧客、又沒護照/身分證 → 純更新名單，不碰顧客（光名字不建）

      // 3. 更新本地狀態
      setMembers(
        members.map(m =>
          m.id === editingMember.id
            ? {
                ...m,
                ...memberUpdateData,
                passport_image_url: editingMember.passport_image_url,
                customer_id: newCustomerId || editingMember.customer_id,
                customer_verification_status:
                  editingMember.customer_id || newCustomerId
                    ? 'verified'
                    : m.customer_verification_status,
              }
            : m
        )
      )

      // 4. 關閉彈窗
      setIsEditDialogOpen(false)
      setEditingMember(null)
      void alert(editMode === 'verify' ? t('verifyComplete') : t('saveSuccess'), 'success')
    } catch (error) {
      logger.error(t('saveFailed2'), error)
      void alert(
        t('saveFailed3') + (error instanceof Error ? error.message : t('unknownError')),
        'error'
      )
    } finally {
      setIsSaving(false)
    }
  }

  // 撞名確認：使用者選「更新既有顧客」
  const resolveClashUpdateExisting = async (customerId: string) => {
    if (!clashPendingMemberId) return
    setIsResolvingClash(true)
    try {
      const cid = await linkAndUpdateCustomer(clashPendingMemberId, customerId, clashPendingForm)
      setMembers(
        members.map(m =>
          m.id === clashPendingMemberId
            ? { ...m, customer_id: cid, customer_verification_status: 'verified' }
            : m
        )
      )
      closeClashDialog()
      void alert(t('saveSuccess'), 'success')
    } catch (error) {
      logger.error(t('saveFailed2'), error)
      void alert(
        t('saveFailed3') + (error instanceof Error ? error.message : t('unknownError')),
        'error'
      )
    } finally {
      setIsResolvingClash(false)
    }
  }

  // 撞名確認：使用者選「建為新顧客」
  const resolveClashCreateNew = async () => {
    if (!clashPendingMemberId) return
    setIsResolvingClash(true)
    try {
      const cid = await createAndLinkCustomer(clashPendingMemberId, clashPendingForm)
      setMembers(
        members.map(m =>
          m.id === clashPendingMemberId
            ? {
                ...m,
                customer_id: cid || m.customer_id,
                customer_verification_status: cid ? 'verified' : m.customer_verification_status,
              }
            : m
        )
      )
      closeClashDialog()
      void alert(t('saveSuccess'), 'success')
    } catch (error) {
      logger.error(t('saveFailed2'), error)
      void alert(
        t('saveFailed3') + (error instanceof Error ? error.message : t('unknownError')),
        'error'
      )
    } finally {
      setIsResolvingClash(false)
    }
  }

  const closeClashDialog = () => {
    setClashDialogOpen(false)
    setClashCandidates([])
    setClashPendingMemberId(null)
    setClashPendingForm({})
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
    // 撞名確認對話框
    clashDialogOpen,
    clashCandidates,
    clashPendingForm,
    isResolvingClash,
    resolveClashUpdateExisting,
    resolveClashCreateNew,
    closeClashDialog,
  }
}
