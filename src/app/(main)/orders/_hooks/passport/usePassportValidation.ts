/**
 * usePassportValidation - 護照資料驗證與成員建立
 *
 * 功能：
 * - 上傳護照照片到 Storage
 * - 建立訂單成員
 * - 同步顧客資料
 * - 比對現有顧客
 */

import { useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { fetchAllCustomers } from '@/app/(main)/orders/_services/order_member.service'
import { createCustomer } from '@/data'
import { logger } from '@/lib/utils/logger'
import { syncPassportImageToMembers } from '@/lib/utils/sync-passport-image'

interface CustomerData {
  name?: string
  english_name?: string
  passport_name?: string
  passport_name_print?: string
  passport_number?: string
  passport_expiry?: string | null
  national_id?: string
  birth_date?: string | null
  sex?: string
}

interface CreateMemberParams {
  orderId: string
  workspaceId: string
  customerData: CustomerData
  file: File
  fileIndex: number
  /** caller 已 query 過的 base sort_order、新成員 = base + fileIndex + 1。沒給就 fallback 0、會撞排序 */
  baseSortOrder?: number
}

interface CreateMemberResult {
  success: boolean
  memberId?: string
  matchedCustomer?: boolean
  newCustomer?: boolean
  error?: string
}

interface UpdateMemberParams {
  memberId: string
  workspaceId: string
  orderId: string
  customerData: CustomerData
  file: File
  fileIndex: number
}

interface UpdateMemberResult {
  success: boolean
  memberId?: string
  error?: string
}

interface UsePassportValidationReturn {
  uploadPassportImage: (
    file: File,
    workspaceId: string,
    orderId: string,
    index: number
  ) => Promise<string | null>
  createOrderMember: (params: CreateMemberParams) => Promise<CreateMemberResult>
  updateOrderMember: (params: UpdateMemberParams) => Promise<UpdateMemberResult>
}

export function usePassportValidation(): UsePassportValidationReturn {
  // 上傳護照照片
  // 統一使用平坦路徑格式：passport_{timestamp}_{random}.jpg（根目錄）
  // 這與其他上傳功能保持一致，避免巢狀目錄造成的潛在問題
  const uploadPassportImage = useCallback(
    async (
      file: File,
      workspaceId: string,
      orderId: string,
      index: number
    ): Promise<string | null> => {
      try {
        // 統一格式：passport_{timestamp}_{random}.jpg（根目錄）
        const random = Math.random().toString(36).substring(2, 8)
        const fileName = `passport_${Date.now()}_${random}.jpg`

        const { error: uploadError } = await supabase.storage
          .from('passport-images')
          .upload(fileName, file, {
            contentType: 'image/jpeg',
            upsert: true, // 改為 upsert: true，避免檔名衝突導致失敗
          })

        if (uploadError) {
          logger.error('上傳護照照片失敗:', uploadError, {
            fileName,
            workspaceId,
            orderId,
            index,
          })
          return null
        }

        // DB 只存 bare filename、顯示時動態簽 15 分鐘 URL
        logger.info(`護照照片上傳成功: ${fileName}`)
        return fileName
      } catch (error) {
        logger.error('上傳護照照片異常:', error)
        return null
      }
    },
    []
  )

  // 建立訂單成員
  const createOrderMember = useCallback(
    async ({
      orderId,
      workspaceId,
      customerData,
      file,
      fileIndex,
      baseSortOrder,
    }: CreateMemberParams): Promise<CreateMemberResult> => {
      try {
        // 上傳護照照片
        const passportImageUrl = await uploadPassportImage(file, workspaceId, orderId, fileIndex)

        const passportNumber = customerData.passport_number || ''
        const idNumber = customerData.national_id || ''
        const birthDate = customerData.birth_date || null
        const rawName = customerData.name || ''
        const cleanName = rawName
          .replace(/\([^)]+\)$/, '')
          .replace(/⚠️/g, '')
          .trim()
        // 只有包含中文字元才當作中文名，否則留空
        const hasChinese = /[\u4e00-\u9fff]/.test(cleanName)
        const chineseName = hasChinese ? cleanName : ''

        // 建立訂單成員
        const memberData = {
          order_id: orderId,
          workspace_id: workspaceId,
          customer_id: null,
          chinese_name: chineseName,
          passport_name: customerData.passport_name || customerData.english_name || '',
          passport_name_print: customerData.passport_name_print || null,
          passport_number: passportNumber,
          passport_expiry: customerData.passport_expiry || null,
          birth_date: birthDate,
          id_number: idNumber,
          gender:
            customerData.sex === '男'
              ? 'M'
              : customerData.sex === '女'
                ? 'F'
                : null,
          identity: '大人',
          member_type: 'adult',
          passport_image_url: passportImageUrl,
          // sort_order = base + fileIndex + 1、保證 OCR 批次新成員排在原有成員後、且彼此順序對應檔案順序
          sort_order: (baseSortOrder ?? 0) + fileIndex + 1,
        }

        const { data: newMember, error } = await supabase
          .from('order_members')
          .insert(memberData)
          .select()
          .single()

        if (error) throw error

        // 同步顧客
        let matchedCustomer = false
        let newCustomer = false

        // 驗證身份證格式（1英文+9數字）
        const isValidIdNumber = idNumber && /^[A-Z][12]\d{8}$/i.test(idNumber)
        // 驗證護照號碼格式（9位數字）
        const isValidPassport = passportNumber && /^\d{9}$/.test(passportNumber)
        // 只有完整身份證或護照號碼才嘗試比對/建立顧客
        const canSyncCustomer = isValidIdNumber || isValidPassport

        if (newMember && canSyncCustomer) {
          // 註：不在這裡 invalidateCustomers——fetchAllCustomers 是直接 DB 查詢（不走快取），
          // 此處 invalidate 對下一行沒作用、卻會害批次「每存一張就刷新全部客戶 + 重繪」。
          // 改由批次結束後（handleBatchUpload）統一刷一次。2026-05-25 修批次第二張卡頓。
          const freshCustomers = await fetchAllCustomers()

          const existingCustomer = freshCustomers.find(c => {
            if (isValidPassport && c.passport_number === passportNumber) return true
            if (isValidIdNumber && c.national_id === idNumber) return true
            // 也比對姓名+生日（作為輔助比對，但不會因為這個而建立新顧客）
            if (
              chineseName &&
              birthDate &&
              c.name?.replace(/\([^)]+\)$/, '').trim() === chineseName &&
              c.birth_date === birthDate
            )
              return true
            return false
          })

          if (existingCustomer) {
            const updateData: Record<string, unknown> = {
              customer_id: existingCustomer.id,
            }

            if (!newMember.passport_name && existingCustomer.passport_name) {
              updateData.passport_name = existingCustomer.passport_name
            }

            await supabase.from('order_members').update(updateData).eq('id', newMember.id)

            if (passportImageUrl) {
              await supabase
                .from('customers')
                .update({ passport_image_url: passportImageUrl })
                .eq('id', existingCustomer.id)

              // 同步護照照片到其他關聯的訂單成員
              await syncPassportImageToMembers(existingCustomer.id, passportImageUrl)
            }

            matchedCustomer = true
          } else {
            // 護照辨識自動建立客戶
            const createdCustomer = await createCustomer({
              name: customerData.name || '',
              english_name: customerData.english_name || null,
              passport_number: passportNumber || null,
              passport_name: customerData.passport_name || null,
              passport_name_print: customerData.passport_name_print || null,
              passport_expiry: customerData.passport_expiry || null,
              passport_image_url: passportImageUrl || null,
              national_id: idNumber || null,
              birth_date: birthDate || null,
              gender:
                customerData.sex === '男'
                  ? 'M'
                  : customerData.sex === '女'
                    ? 'F'
                    : null,
              phone: '',
              member_type: 'potential', // 護照建立的客戶預設為潛在客戶
              is_vip: false,
              is_active: true,
              total_spent: 0,
              total_orders: 0,
              verification_status: 'unverified',
            })

            if (createdCustomer) {
              await supabase
                .from('order_members')
                .update({ customer_id: createdCustomer.id })
                .eq('id', newMember.id)
              newCustomer = true
            }
          }
        }

        return {
          success: true,
          memberId: newMember.id,
          matchedCustomer,
          newCustomer,
        }
      } catch (error) {
        logger.error('建立成員失敗:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : '未知錯誤',
        }
      }
    },
    [uploadPassportImage]
  )

  // 更新現有成員（用於姓名比對到的情況）
  const updateOrderMember = useCallback(
    async ({
      memberId,
      workspaceId,
      orderId,
      customerData,
      file,
      fileIndex,
    }: UpdateMemberParams): Promise<UpdateMemberResult> => {
      try {
        // 查詢舊護照照片 URL（上傳新照片後要刪除）
        const { data: oldMember } = await supabase
          .from('order_members')
          .select('passport_image_url')
          .eq('id', memberId)
          .single()
        const oldPassportUrl = oldMember?.passport_image_url as string | null

        // 上傳護照照片
        const passportImageUrl = await uploadPassportImage(file, workspaceId, orderId, fileIndex)

        // 刪除舊護照照片（避免 Storage 孤兒檔案）
        if (oldPassportUrl && passportImageUrl && oldPassportUrl !== passportImageUrl) {
          try {
            const match = oldPassportUrl.match(/passport-images\/(.+?)(?:\?|$)/)
            if (match) {
              await supabase.storage.from('passport-images').remove([match[1]])
              logger.log(`已刪除舊護照照片: ${match[1]}`)
            }
          } catch (delErr) {
            logger.error('刪除舊護照照片失敗（不影響更新）:', delErr)
          }
        }

        const passportNumber = customerData.passport_number || ''
        const idNumber = customerData.national_id || ''
        const birthDate = customerData.birth_date || null
        const rawName = customerData.name || ''
        const cleanName = rawName
          .replace(/\([^)]+\)$/, '')
          .replace(/⚠️/g, '')
          .trim()
        const hasChinese = /[\u4e00-\u9fff]/.test(cleanName)
        const chineseName = hasChinese ? cleanName : ''

        // 更新成員資料（保留原有的 chinese_name，補上 OCR 辨識到的資料）
        const updateData: Record<string, unknown> = {
          passport_name: customerData.passport_name || customerData.english_name || '',
          passport_name_print: customerData.passport_name_print || null,
          passport_number: passportNumber,
          passport_expiry: customerData.passport_expiry || null,
          birth_date: birthDate,
          id_number: idNumber,
          gender:
            customerData.sex === '男'
              ? 'M'
              : customerData.sex === '女'
                ? 'F'
                : null,
          passport_image_url: passportImageUrl,
        }

        // 只有辨識到中文名且現有名稱為空時才補上
        const { data: existingMember } = await supabase
          .from('order_members')
          .select('chinese_name')
          .eq('id', memberId)
          .single()

        if (!existingMember?.chinese_name && chineseName) {
          updateData.chinese_name = chineseName
        }

        const { error } = await supabase.from('order_members').update(updateData).eq('id', memberId)

        if (error) throw error

        logger.log(`已更新成員 ${memberId} 的護照資料`)

        return {
          success: true,
          memberId,
        }
      } catch (error) {
        logger.error('更新成員失敗:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : '未知錯誤',
        }
      }
    },
    [uploadPassportImage]
  )

  return {
    uploadPassportImage,
    createOrderMember,
    updateOrderMember,
  }
}
