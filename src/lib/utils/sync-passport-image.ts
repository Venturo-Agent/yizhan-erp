/**
 * 同步顧客護照資料到關聯的訂單成員
 *
 * 當顧客的護照資料更新時，自動同步到所有關聯的 order_members
 * 這確保了訂單成員名單中的護照資料是最新的
 */

import { supabase } from '@/lib/supabase/client'
import { typedRpc } from '@/lib/supabase/typed-client'
import { logger } from '@/lib/utils/logger'

// 護照資料同步欄位
interface PassportData {
  passport_number?: string | null
  passport_name?: string | null
  passport_expiry?: string | null
  passport_image_url?: string | null
  birth_date?: string | null
  gender?: string | null
  national_id?: string | null // 對應 order_members 的 id_number
}

/**
 * 同步顧客護照照片到所有關聯的訂單成員（單欄位 wrapper、底層委派給 syncPassportDataToMembers）
 *
 * @param customerId - 顧客 ID
 * @param passportImageUrl - 新的護照照片 URL（null 表示清除）
 * @returns 更新的成員數量
 */
export async function syncPassportImageToMembers(
  customerId: string,
  passportImageUrl: string | null
): Promise<number> {
  return syncPassportDataToMembers(customerId, { passport_image_url: passportImageUrl })
}

// 衝突成員資訊
interface ConflictMember {
  id: string
  orderId: string
  orderCode?: string
  tourName?: string
  memberName?: string
  conflictFields: string[]
}

/**
 * 檢查是否有衝突的訂單成員
 *
 * @param customerId - 顧客 ID
 * @param passportData - 要同步的護照資料
 * @returns 有衝突的成員列表
 */
async function _checkMemberConflicts(
  customerId: string,
  passportData: PassportData
): Promise<ConflictMember[]> {
  try {
    // 查詢關聯的 order_members
    const { data: members, error } = await supabase
      .from('order_members')
      .select(
        `
        id,
        order_id,
        chinese_name,
        passport_number,
        passport_name,
        passport_expiry,
        birth_date,
        gender,
        id_number,
        orders!inner(order_number, tour_name)
      `
      )
      .eq('customer_id', customerId)

    if (error || !members) {
      return []
    }

    const conflicts: ConflictMember[] = []

    for (const member of members) {
      const conflictFields: string[] = []

      // 檢查每個欄位是否有衝突（成員有值且與新值不同）
      if (
        passportData.passport_number &&
        member.passport_number &&
        member.passport_number !== passportData.passport_number
      ) {
        conflictFields.push('護照號碼')
      }
      if (
        passportData.passport_expiry &&
        member.passport_expiry &&
        member.passport_expiry !== passportData.passport_expiry
      ) {
        conflictFields.push('護照效期')
      }
      if (
        passportData.passport_name &&
        member.passport_name &&
        member.passport_name !== passportData.passport_name
      ) {
        conflictFields.push('護照拼音')
      }
      if (
        passportData.birth_date &&
        member.birth_date &&
        member.birth_date !== passportData.birth_date
      ) {
        conflictFields.push('生日')
      }

      if (conflictFields.length > 0) {
        const order = member.orders as { order_number?: string; tour_name?: string } | null
        conflicts.push({
          id: member.id,
          orderId: member.order_id,
          orderCode: order?.order_number,
          tourName: order?.tour_name,
          memberName: member.chinese_name || undefined,
          conflictFields,
        })
      }
    }

    return conflicts
  } catch (error) {
    logger.error('檢查成員衝突失敗:', error)
    return []
  }
}

/**
 * 同步顧客所有護照資料到所有關聯的訂單成員
 *
 * @param customerId - 顧客 ID
 * @param passportData - 要同步的護照資料
 * @returns 更新的成員數量
 */
async function syncPassportDataToMembers(
  customerId: string,
  passportData: PassportData
): Promise<number> {
  try {
    // 使用 RPC 函數處理 uuid/text 類型轉換
    const { data, error } = await typedRpc('sync_passport_to_order_members', {
      p_customer_id: customerId,
      p_passport_number: passportData.passport_number ?? undefined,
      p_passport_name: passportData.passport_name ?? undefined,
      p_passport_expiry: passportData.passport_expiry ?? undefined,
      p_passport_image_url: passportData.passport_image_url ?? undefined,
      p_birth_date: passportData.birth_date ?? undefined,
      p_gender: passportData.gender ?? undefined,
      p_id_number: passportData.national_id ?? undefined,
    })

    if (error) {
      logger.error('同步護照資料到成員失敗:', error)
      return 0
    }

    const updatedCount = (data as number) || 0
    if (updatedCount > 0) {
      logger.info(`已同步護照資料到 ${updatedCount} 個訂單成員`)
    }

    return updatedCount
  } catch (error) {
    logger.error('同步護照資料時發生錯誤:', error)
    return 0
  }
}

/** 護照欄位名稱映射（供 UI 顯示用） */
export const PASSPORT_FIELD_LABELS: Record<string, string> = {
  passport_number: '護照號碼',
  passport_name: '護照拼音',
  passport_expiry: '護照效期',
  passport_image_url: '護照照片',
  birth_date: '生日',
  gender: '性別',
  national_id: '身分證字號',
}

/** 未出發訂單中的衝突成員（包含新舊值） */
export interface ActiveOrderConflict {
  memberId: string
  orderId: string
  orderCode: string
  tourName: string
  memberName: string
  /** key: 欄位名, value: { old, new } */
  diffs: Record<string, { oldValue: string | null; newValue: string | null }>
  /** 該成員目前存的護照圖（舊） — 給 UI 做對照 */
  oldPassportImageUrl?: string | null
}

/**
 * 回寫護照資料到客戶
 *
 * @param customerId - 顧客 ID
 * @param passportData - 護照資料
 * @returns 是否成功
 */
export async function syncPassportToCustomer(
  customerId: string,
  passportData: PassportData
): Promise<boolean> {
  try {
    const updatePayload: Record<string, string | null | undefined> = {}
    if (passportData.passport_number !== undefined)
      updatePayload.passport_number = passportData.passport_number
    if (passportData.passport_name !== undefined)
      updatePayload.passport_name = passportData.passport_name
    if (passportData.passport_expiry !== undefined)
      updatePayload.passport_expiry = passportData.passport_expiry
    if (passportData.passport_image_url !== undefined)
      updatePayload.passport_image_url = passportData.passport_image_url
    if (passportData.birth_date !== undefined) updatePayload.birth_date = passportData.birth_date
    if (passportData.gender !== undefined) updatePayload.gender = passportData.gender
    if (passportData.national_id !== undefined) updatePayload.national_id = passportData.national_id

    if (Object.keys(updatePayload).length === 0) return true

    const { error } = await supabase.from('customers').update(updatePayload).eq('id', customerId)

    if (error) {
      logger.error('回寫護照資料到客戶失敗:', error)
      return false
    }

    logger.info(`已回寫護照資料到客戶 ${customerId}`)
    return true
  } catch (error) {
    logger.error('回寫護照資料到客戶異常:', error)
    return false
  }
}

/**
 * 查詢同一客戶在其他未出發訂單中的團員，並找出護照資料不同的衝突
 *
 * @param params.customerId - 顧客 ID（優先使用）
 * @param params.idNumber - 身分證字號（customerId 為空時用）
 * @param params.currentMemberId - 當前成員 ID（排除自己）
 * @param params.passportData - 新的護照資料
 * @returns 衝突列表
 */
export async function findActiveOrderConflicts(params: {
  customerId?: string | null
  idNumber?: string | null
  currentMemberId?: string
  passportData: PassportData
}): Promise<ActiveOrderConflict[]> {
  const { customerId, idNumber, currentMemberId, passportData } = params

  if (!customerId && !idNumber) return []

  try {
    // 排除已完成和已取消的訂單
    const excludedStatuses = ['completed', 'cancelled']

    // 查詢一般訂單的成員
    let query = supabase.from('order_members').select(`
        id,
        order_id,
        chinese_name,
        passport_number,
        passport_name,
        passport_expiry,
        passport_image_url,
        birth_date,
        gender,
        id_number,
        customer_id,
        orders!inner(order_number, tour_name, status)
      `)

    if (customerId) {
      query = query.eq('customer_id', customerId)
    } else if (idNumber) {
      query = query.eq('id_number', idNumber)
    }

    const { data: members, error } = await query

    if (error) {
      logger.error('查詢未出發訂單成員失敗:', error)
      return []
    }

    const conflicts: ActiveOrderConflict[] = []

    for (const member of members || []) {
      // 排除自己
      if (currentMemberId && member.id === currentMemberId) continue

      // 排除已完成/已取消的訂單
      const order = member.orders as { order_number?: string; tour_name?: string; status?: string } | null
      if (!order || excludedStatuses.includes(order.status || '')) continue

      // 比較每個欄位
      const diffs: Record<string, { oldValue: string | null; newValue: string | null }> = {}

      const compareField = (
        fieldName: string,
        memberValue: string | null | undefined,
        newValue: string | null | undefined
      ) => {
        if (newValue && memberValue && memberValue !== newValue) {
          diffs[fieldName] = { oldValue: memberValue, newValue: newValue }
        }
      }

      compareField('passport_number', member.passport_number, passportData.passport_number)
      compareField('passport_name', member.passport_name, passportData.passport_name)
      compareField('passport_expiry', member.passport_expiry, passportData.passport_expiry)
      compareField('birth_date', member.birth_date, passportData.birth_date)
      compareField('gender', member.gender, passportData.gender)
      // id_number ↔ national_id 欄位映射
      compareField('national_id', member.id_number, passportData.national_id)

      if (Object.keys(diffs).length > 0) {
        conflicts.push({
          memberId: member.id,
          orderId: member.order_id,
          orderCode: order.order_number || '',
          tourName: order.tour_name || '',
          memberName: member.chinese_name || '',
          diffs,
          oldPassportImageUrl: member.passport_image_url || null,
        })
      }
    }

    return conflicts
  } catch (error) {
    logger.error('查詢未出發訂單衝突失敗:', error)
    return []
  }
}

/**
 * 批次更新衝突成員的護照資料
 *
 * @param memberIds - 要更新的成員 ID 列表
 * @param passportData - 新的護照資料
 * @returns 更新成功的數量
 */
export async function batchUpdateConflictMembers(
  memberIds: string[],
  passportData: PassportData
): Promise<number> {
  if (memberIds.length === 0) return 0

  try {
    const updatePayload: Record<string, string | null | undefined> = {}
    if (passportData.passport_number !== undefined)
      updatePayload.passport_number = passportData.passport_number
    if (passportData.passport_name !== undefined)
      updatePayload.passport_name = passportData.passport_name
    if (passportData.passport_expiry !== undefined)
      updatePayload.passport_expiry = passportData.passport_expiry
    if (passportData.passport_image_url !== undefined)
      updatePayload.passport_image_url = passportData.passport_image_url
    if (passportData.birth_date !== undefined) updatePayload.birth_date = passportData.birth_date
    if (passportData.gender !== undefined) updatePayload.gender = passportData.gender
    if (passportData.national_id !== undefined) updatePayload.id_number = passportData.national_id

    const { data, error } = await supabase
      .from('order_members')
      .update(updatePayload)
      .in('id', memberIds)
      .select('id')

    if (error) {
      logger.error('批次更新衝突成員失敗:', error)
      return 0
    }

    const count = data?.length || 0
    logger.info(`已批次更新 ${count} 位衝突成員的護照資料`)
    return count
  } catch (error) {
    logger.error('批次更新衝突成員異常:', error)
    return 0
  }
}

/**
 * 批次同步顧客護照照片
 * 用於一次性修復現有資料
 *
 * @returns 更新的成員總數
 */
async function _syncAllPassportImages(): Promise<number> {
  try {
    // 找出所有有護照照片的顧客，但關聯成員沒有的情況
    const { data: customersWithImages, error: fetchError } = await supabase
      .from('customers')
      .select('id, passport_image_url')
      .not('passport_image_url', 'is', null)

    if (fetchError || !customersWithImages) {
      logger.error('取得顧客資料失敗:', fetchError)
      return 0
    }

    let totalUpdated = 0

    for (const customer of customersWithImages) {
      const { data, error } = await supabase
        .from('order_members')
        .update({ passport_image_url: customer.passport_image_url })
        .eq('customer_id', customer.id)
        .is('passport_image_url', null)
        .select('id')

      if (!error && data) {
        totalUpdated += data.length
      }
    }

    logger.info(`批次同步完成，共更新 ${totalUpdated} 個訂單成員`)
    return totalUpdated
  } catch (error) {
    logger.error('批次同步護照照片失敗:', error)
    return 0
  }
}
