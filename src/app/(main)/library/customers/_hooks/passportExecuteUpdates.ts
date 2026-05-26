/**
 * passportExecuteUpdates.ts
 * 護照上傳「確認 → 執行更新/新增 → 顯示結果」邏輯
 * 拆分自 usePassportUpload.ts 2026-05-16
 *
 * 對應 handleBatchUpload 的階段 3 / 4 / 5：
 *   - 階段 3：有差異項目跳確認 dialog、無差異自動更新
 *   - 階段 4：執行 updateCustomer / addCustomer / 刪舊圖片
 *   - 階段 5：組結果訊息 + alert
 */

import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { confirm, alert } from '@/lib/ui/alert-dialog'
import type { Customer } from '@/types/customer.types'

// OCR 處理結果（與 usePassportUpload 共用、這裡重新宣告避免循環 import）
export interface OcrProcessedItem {
  fileName: string
  ocrData: Record<string, string | null>
  compressedFile: File
  imageUrl: string
  storageFileName: string
  existingCustomer?: Customer
  matchReason?: string
  chineseName?: string
  normalizedGender: 'M' | 'F' | null
  hasRealDifference?: boolean
  differences?: string[]
}

interface ExecuteUpdatesOptions {
  matchedItems: OcrProcessedItem[]
  newCustomerItems: OcrProcessedItem[]
  duplicateItems: string[]
  failedItems: string[]
  allFileCount: number
  googleVisionError: string | null
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<void>
  addCustomer: (data: Partial<Customer>) => Promise<Customer>
}

/** 刪除 storage 上的舊護照圖片（safe：找不到 URL 就跳過） */
async function deleteOldPassportImage(passportImageUrl: string | null | undefined) {
  if (!passportImageUrl || !passportImageUrl.includes('passport-images')) return
  const match = passportImageUrl.match(/passport-images\/(.+)$/)
  if (match) {
    await supabase.storage.from('passport-images').remove([decodeURIComponent(match[1])])
  }
}

/**
 * 執行階段 3 + 4 + 5：
 *   - 有差異項目跳確認 dialog
 *   - 執行 updateCustomer / addCustomer
 *   - 清理舊圖片
 *   - 顯示結果 alert
 */
export async function executePassportUpdates({
  matchedItems,
  newCustomerItems,
  duplicateItems,
  failedItems,
  allFileCount,
  googleVisionError,
  updateCustomer,
  addCustomer,
}: ExecuteUpdatesOptions): Promise<void> {
  // === 階段 3: 智慧分類：無差異自動更新，有差異才詢問 ===
  const autoUpdateItems = matchedItems.filter(item => !item.hasRealDifference)
  const needConfirmItems = matchedItems.filter(item => item.hasRealDifference)
  let confirmedUpdates: OcrProcessedItem[] = [...autoUpdateItems]

  if (needConfirmItems.length > 0) {
    const matchListHtml = needConfirmItems
      .map(
        (item, idx) => `
        <div style="display: flex; gap: 12px; padding: 12px; background: ${idx % 2 === 0 ? '#f9fafb' : '#fff'}; border-radius: 6px; margin-bottom: 8px;">
          <img src="${item.imageUrl}" style="width: 80px; height: 60px; object-fit: cover; border-radius: 4px; border: 1px solid #e5e7eb;" />
          <div style="flex: 1; font-size: 12px;">
            <div style="font-weight: 500; color: #374151; margin-bottom: 4px;">
              ${item.existingCustomer?.name} (${item.matchReason})
            </div>
            <div style="color: #dc2626; font-size: 11px;">
              ${item.differences?.join(' | ') || '護照圖片更新'}
            </div>
          </div>
        </div>
      `
      )
      .join('')

    const confirmHtml = `
      <div style="max-height: 300px; overflow-y: auto; margin-top: 12px;">
        ${matchListHtml}
      </div>
      <div style="margin-top: 12px; padding: 8px 12px; background: #fef3c7; border-radius: 6px; font-size: 12px; color: #92400e;">
        點擊「確定」將更新以上 ${needConfirmItems.length} 位客戶的護照資料
      </div>
    `

    const shouldUpdate = await confirm(
      `${needConfirmItems.length} 位客戶資料有變更，是否更新？`,
      'warning',
      confirmHtml
    )
    if (shouldUpdate) {
      confirmedUpdates = [...confirmedUpdates, ...needConfirmItems]
    } else {
      for (const item of needConfirmItems) {
        await supabase.storage.from('passport-images').remove([item.storageFileName])
      }
    }
  }

  if (autoUpdateItems.length > 0) {
    logger.log(`✅ ${autoUpdateItems.length} 位客戶資料無變更，自動更新護照圖片`)
  }

  // === 階段 4: 執行更新和新增 ===
  let autoUpdateSuccessCount = 0
  let confirmedUpdateSuccessCount = 0
  let successCount = 0

  // 自動更新（無差異，只更新護照圖片）
  for (const item of autoUpdateItems) {
    if (!confirmedUpdates.includes(item)) continue
    try {
      const oldUrl = item.existingCustomer?.passport_image_url
      await updateCustomer(item.existingCustomer!.id, { passport_image_url: item.storageFileName })
      autoUpdateSuccessCount++
      await deleteOldPassportImage(oldUrl)
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : JSON.stringify(error)
      logger.error(`自動更新失敗: ${item.existingCustomer?.name}`, errMsg, error)
      failedItems.push(`${item.fileName} (更新失敗: ${errMsg})`)
    }
  }

  // 確認更新（有差異，更新所有護照資料）
  for (const item of needConfirmItems) {
    if (!confirmedUpdates.includes(item)) continue
    try {
      const oldUrl = item.existingCustomer?.passport_image_url
      await updateCustomer(item.existingCustomer!.id, {
        passport_number: item.ocrData.passport_number || item.existingCustomer?.passport_number,
        passport_name: item.ocrData.passport_name || item.existingCustomer?.passport_name,
        passport_expiry: item.ocrData.passport_expiry || item.existingCustomer?.passport_expiry,
        passport_image_url: item.storageFileName,
        national_id: item.ocrData.national_id || item.existingCustomer?.national_id,
        birth_date: item.ocrData.birth_date || item.existingCustomer?.birth_date,
        gender: item.normalizedGender || item.existingCustomer?.gender,
        verification_status: 'unverified',
      })
      confirmedUpdateSuccessCount++
      await deleteOldPassportImage(oldUrl)
    } catch (error) {
      logger.error(`更新失敗: ${item.existingCustomer?.name}`, error)
      failedItems.push(`${item.fileName} (更新失敗)`)
    }
  }

  // 新增新客戶
  for (const item of newCustomerItems) {
    try {
      await addCustomer({
        name: item.chineseName || item.ocrData.name || '未命名',
        passport_number: item.ocrData.passport_number,
        passport_name: item.ocrData.passport_name,
        passport_expiry: item.ocrData.passport_expiry,
        passport_image_url: item.storageFileName,
        national_id: item.ocrData.national_id,
        birth_date: item.ocrData.birth_date,
        gender: item.normalizedGender,
        is_vip: false,
        is_active: true,
        verification_status: 'unverified',
      })
      successCount++
    } catch (error) {
      logger.error(`新增失敗: ${item.fileName}`, error)
      failedItems.push(`${item.fileName} (新增失敗)`)
      await supabase.storage.from('passport-images').remove([item.storageFileName])
    }
  }

  // === 階段 5: 顯示結果 ===
  const skippedConfirmCount = needConfirmItems.length - confirmedUpdateSuccessCount

  let message = `成功辨識 ${allFileCount - failedItems.length}/${allFileCount} 張護照`
  if (successCount > 0) message += `\n新增 ${successCount} 位客戶`
  if (autoUpdateSuccessCount > 0)
    message += `\n自動更新 ${autoUpdateSuccessCount} 位客戶護照圖片（資料無變更）`
  if (confirmedUpdateSuccessCount > 0)
    message += `\n更新 ${confirmedUpdateSuccessCount} 位客戶護照資料`
  if (skippedConfirmCount > 0) message += `\n跳過 ${skippedConfirmCount} 位客戶（使用者取消）`
  if (duplicateItems.length > 0) message += `\n跳過 ${duplicateItems.length} 筆重複護照`
  if (googleVisionError) {
    message += `\n\n⚠️ 中文名辨識失敗：${googleVisionError}\n• 請至 Google Cloud Console 更新 API Key`
  }
  message += '\n\n重要提醒：\n• 所有 OCR 辨識的資料已標記為「待驗證」\n• 請務必人工檢查護照資訊'
  if (failedItems.length > 0) message += `\n\n失敗項目：\n${failedItems.join('\n')}`

  await alert(message, failedItems.length > 0 ? 'warning' : 'success')
}
