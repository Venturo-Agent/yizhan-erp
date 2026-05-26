'use client'
/**
 * usePassportUpload - 護照上傳與 OCR 辨識 Hook (主 Hook)
 * 從 OrderMembersExpandable.tsx 拆分出來
 *
 * 功能：
 * - 檔案選擇和拖放
 * - PDF 轉圖片
 * - 圖片壓縮
 * - OCR 辨識
 * - 批次上傳建立成員
 *
 * 架構：整合以下子模組
 * - usePassportFiles: 檔案處理邏輯
 * - usePassportOcr: OCR 識別邏輯
 * - usePassportValidation: 驗證與成員建立
 */

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { alert } from '@/lib/ui/alert-dialog'
import type { ProcessedFile } from '../_types/order-member.types'
import { usePassportFiles } from './passport/usePassportFiles'
import { usePassportOcr } from './passport/usePassportOcr'
import { usePassportValidation } from './passport/usePassportValidation'
import { invalidateCustomers } from '@/data'
import { useTranslations } from 'next-intl'
import {
  syncPassportToCustomer,
  findActiveOrderConflicts,
  type ActiveOrderConflict,
} from '@/lib/utils/sync-passport-image'

interface UsePassportUploadParams {
  orderId: string | undefined
  workspaceId: string
  onSuccess: () => Promise<void> // 上傳成功後的回呼（通常是重新載入成員）
}

/** 待確認的重複成員 */
export interface PendingConfirmation {
  customer: {
    name?: string
    english_name?: string
    passport_romanization?: string
    passport_number?: string
    passport_expiry?: string | null
    national_id?: string
    birth_date?: string | null
    sex?: string
  }
  file: File
  fileIndex: number
  matchedMember: {
    id: string
    passport_number: string | null
    id_number: string | null
    chinese_name: string | null
    birth_date: string | null
    passport_image_url?: string | null
  }
  confirmMessage: string
  matchType: string
}

/** 護照資料（用於衝突 Dialog） */
interface PassportDataForConflict {
  passport_number?: string | null
  passport_name?: string | null
  passport_expiry?: string | null
  passport_image_url?: string | null
  birth_date?: string | null
  gender?: string | null
  national_id?: string | null
}

interface UsePassportUploadReturn {
  // 狀態
  processedFiles: ProcessedFile[]
  isUploading: boolean
  isDragging: boolean
  isProcessing: boolean

  // 衝突 Dialog 狀態
  conflictDialogOpen: boolean
  setConflictDialogOpen: (open: boolean) => void
  conflicts: ActiveOrderConflict[]
  conflictPassportData: PassportDataForConflict | null

  // 重複確認狀態
  pendingConfirmations: PendingConfirmation[]
  confirmUpdate: (index: number) => Promise<void>
  rejectUpdate: (index: number) => void
  confirmAllUpdates: () => Promise<void>
  rejectAllUpdates: () => void

  // 操作
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  handleDragOver: (e: React.DragEvent<HTMLLabelElement>) => void
  handleDragLeave: (e: React.DragEvent<HTMLLabelElement>) => void
  handleDrop: (e: React.DragEvent<HTMLLabelElement>) => Promise<void>
  handleRemoveFile: (index: number) => void
  handleUpdateFilePreview: (index: number, newPreviewDataUrl: string) => void
  handleBatchUpload: () => Promise<void>
  clearFiles: () => void
}

export function usePassportUpload({
  orderId,
  workspaceId,
  onSuccess,
}: UsePassportUploadParams): UsePassportUploadReturn {
  const t = useTranslations('orders')
  const [isUploading, setIsUploading] = useState(false)
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false)
  const [conflicts, setConflicts] = useState<ActiveOrderConflict[]>([])
  const [conflictPassportData, setConflictPassportData] = useState<PassportDataForConflict | null>(
    null
  )
  const [pendingConfirmations, setPendingConfirmations] = useState<PendingConfirmation[]>([])

  // 使用子模組
  const fileModule = usePassportFiles()
  const ocrModule = usePassportOcr()
  const validationModule = usePassportValidation()

  // 批次上傳護照並建立成員
  const handleBatchUpload = useCallback(async () => {
    if (fileModule.processedFiles.length === 0) return
    if (isUploading) return
    if (!orderId) {
      void alert(t('needOrderIdForBatchUpload'), 'error')
      return
    }

    setIsUploading(true)
    try {
      // 壓縮所有圖片
      const compressedFiles = await Promise.all(
        fileModule.processedFiles.map(pf => fileModule.compressImage(pf.file))
      )

      // 呼叫 OCR API
      const result = await ocrModule.performOcr(compressedFiles)

      // 統計
      let successCount = 0
      let matchedCustomerCount = 0
      let newCustomerCount = 0
      const failedItems: string[] = []
      const newPendingConfirmations: PendingConfirmation[] = []

      // 載入現有成員（包含 id）
      const { data: existingMembers } = await supabase
        .from('order_members')
        .select('id, passport_number, id_number, chinese_name, birth_date, passport_image_url')
        .eq('order_id', orderId)

      // 拿這張單目前最大 sort_order、createOrderMember 用 base + fileIndex 算個別 sort_order
      const { data: maxRow } = await supabase
        .from('order_members')
        .select('sort_order')
        .eq('order_id', orderId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle()
      const baseSortOrder = maxRow?.sort_order ?? 0

      // 處理每個 OCR 結果
      for (let i = 0; i < result.results.length; i++) {
        const item = result.results[i]

        if (item.success && item.customer) {
          // 檢查重複
          const duplicateCheck = ocrModule.checkDuplicate(item.customer, existingMembers || [])

          // 任何匹配（護照號碼、身分證號、姓名+生日、同名）→ 統一收集待確認
          if (duplicateCheck.needsConfirmation && duplicateCheck.matchedMember) {
            newPendingConfirmations.push({
              customer: item.customer,
              file: compressedFiles[i],
              fileIndex: i,
              matchedMember: duplicateCheck.matchedMember,
              confirmMessage: duplicateCheck.confirmMessage || duplicateCheck.reason,
              matchType: duplicateCheck.matchType || 'exact',
            })
            continue
          }

          // 沒有重複 → 建立新成員
          const createResult = await validationModule.createOrderMember({
            orderId,
            workspaceId,
            customerData: item.customer,
            file: compressedFiles[i],
            fileIndex: i,
            baseSortOrder,
          })

          if (createResult.success) {
            successCount++
            if (createResult.matchedCustomer) matchedCustomerCount++
            if (createResult.newCustomer) newCustomerCount++
          } else {
            failedItems.push(`${item.fileName} (建立失敗)`)
          }
        } else {
          failedItems.push(`${item.fileName} (辨識失敗)`)
        }
      }

      // 護照回寫客戶 + 檢查未出發訂單衝突
      // 收集所有處理過的成員的 customer_id，用於回寫和衝突檢查
      const processedCustomerIds = new Set<string>()
      let lastPassportData: PassportDataForConflict | null = null

      for (let i = 0; i < result.results.length; i++) {
        const item = result.results[i]
        if (!item.success || !item.customer) continue

        // 查詢剛建立/更新的成員，取得 customer_id
        const passportNum = item.customer.passport_number
        const idNum = item.customer.national_id
        if (!passportNum && !idNum) continue

        let memberQuery = supabase
          .from('order_members')
          .select('id, customer_id, passport_image_url')
          .eq('order_id', orderId)

        if (passportNum) {
          memberQuery = memberQuery.eq('passport_number', passportNum)
        } else if (idNum) {
          memberQuery = memberQuery.eq('id_number', idNum)
        }

        const { data: memberRows } = await memberQuery.limit(1)
        const member = memberRows?.[0]

        if (member?.customer_id) {
          const custId = member.customer_id as string
          const pData: PassportDataForConflict = {
            passport_number: item.customer.passport_number || null,
            passport_name: item.customer.passport_name || item.customer.english_name || null,
            passport_expiry: item.customer.passport_expiry || null,
            passport_image_url: (member as Record<string, unknown>).passport_image_url as
              | string
              | null,
            birth_date: item.customer.birth_date || null,
            gender: item.customer.sex === '男' ? 'M' : item.customer.sex === '女' ? 'F' : null,
            national_id: item.customer.national_id || null,
          }

          // 回寫客戶
          const writebackOk = await syncPassportToCustomer(custId, pData)
          if (!writebackOk) {
            logger.warn('回寫客戶護照資料失敗', { customerId: custId })
          }

          processedCustomerIds.add(custId)
          lastPassportData = pData
        }
      }

      // 檢查未出發訂單衝突
      const allConflicts: ActiveOrderConflict[] = []
      for (const custId of processedCustomerIds) {
        const custConflicts = await findActiveOrderConflicts({
          customerId: custId,
          passportData: lastPassportData || {},
        })
        // 排除當前訂單的成員
        const filtered = custConflicts.filter(c => c.orderId !== orderId)
        allConflicts.push(...filtered)
      }

      if (allConflicts.length > 0) {
        setConflicts(allConflicts)
        setConflictPassportData(lastPassportData)
        setConflictDialogOpen(true)
      }

      // 設定待確認項目
      if (newPendingConfirmations.length > 0) {
        setPendingConfirmations(newPendingConfirmations)
      }

      // 顯示結果
      let message = t('passportUploadSuccess', { success: result.successful, total: result.total })
      if (successCount > 0) {
        message += t('passportCreateMembersSuccess', { count: successCount })
      }
      if (matchedCustomerCount > 0) {
        message += t('passportMatchedCustomers', { count: matchedCustomerCount })
      }
      if (newCustomerCount > 0) {
        message += t('passportNewCustomers', { count: newCustomerCount })
      }
      if (newPendingConfirmations.length > 0) {
        message += `\n\n⚠️ 發現 ${newPendingConfirmations.length} 筆重複資料，請確認是否更新照片`
      }
      if (result.chineseNameWarning) {
        message += `\n\n⚠️ ${result.chineseNameWarning}`
      } else if (result.googleVisionError) {
        message += `\n\n⚠️ 中文名辨識失敗：${result.googleVisionError}\n• 請至 Google Cloud Console 更新 API Key`
      }
      message += `\n\n重要提醒：\n• OCR 資料已標記為「待驗證」\n• 請務必人工檢查護照資訊`
      if (failedItems.length > 0) {
        message += `\n\n失敗項目：\n${failedItems.join('\n')}`
      }
      void alert(message, 'success')

      // 清空檔案並重新載入
      fileModule.clearFiles()
      // 整批存完才刷新一次客戶快取（取代原本「每存一張就 invalidateCustomers」的逐筆重繪）
      await invalidateCustomers()
      await onSuccess()

      // 重算團人數（批次上傳後）
      if (orderId && successCount > 0) {
        const { recalculateParticipants } =
          await import('@/app/(main)/tours/_services/tour-stats.service')
        const { data: order } = await supabase
          .from('orders')
          .select('tour_id')
          .eq('id', orderId)
          .single()
        if (order?.tour_id) {
          recalculateParticipants(order.tour_id).catch(err => {
            logger.error('重算團人數失敗:', err)
          })
        }
      }
    } catch (error) {
      logger.error(t('batchUploadFailed'), error)
      void alert(
        t('batchUploadFailed2') + (error instanceof Error ? error.message : t('unknownError')),
        'error'
      )
    } finally {
      setIsUploading(false)
    }
  }, [fileModule, ocrModule, validationModule, isUploading, orderId, workspaceId, onSuccess, t])

  // 確認更新單筆重複成員
  const confirmUpdate = useCallback(
    async (index: number) => {
      if (!orderId) return
      const item = pendingConfirmations[index]
      if (!item) return

      const updateResult = await validationModule.updateOrderMember({
        memberId: item.matchedMember.id,
        orderId,
        workspaceId,
        customerData: item.customer,
        file: item.file,
        fileIndex: item.fileIndex,
      })

      if (updateResult.success) {
        void alert(
          `已更新 ${item.customer.name || item.matchedMember.chinese_name || ''} 的資料`,
          'success'
        )
      } else {
        void alert(`更新失敗：${updateResult.error || '未知錯誤'}`, 'error')
      }

      setPendingConfirmations(prev => prev.filter((_, i) => i !== index))
      await onSuccess()
    },
    [pendingConfirmations, orderId, workspaceId, validationModule, onSuccess]
  )

  // 拒絕更新單筆
  const rejectUpdate = useCallback((index: number) => {
    setPendingConfirmations(prev => prev.filter((_, i) => i !== index))
  }, [])

  // 確認更新全部
  const confirmAllUpdates = useCallback(async () => {
    if (!orderId) return
    let updatedCount = 0

    for (const item of pendingConfirmations) {
      const updateResult = await validationModule.updateOrderMember({
        memberId: item.matchedMember.id,
        orderId,
        workspaceId,
        customerData: item.customer,
        file: item.file,
        fileIndex: item.fileIndex,
      })

      if (updateResult.success) {
        updatedCount++
      }
    }

    if (updatedCount > 0) {
      void alert(`已更新 ${updatedCount} 位成員的資料`, 'success')
    }

    setPendingConfirmations([])
    await onSuccess()
  }, [pendingConfirmations, orderId, workspaceId, validationModule, onSuccess])

  // 拒絕全部
  const rejectAllUpdates = useCallback(() => {
    setPendingConfirmations([])
  }, [])

  return {
    processedFiles: fileModule.processedFiles,
    isUploading,
    isDragging: fileModule.isDragging,
    isProcessing: fileModule.isProcessing,
    // 衝突 Dialog
    conflictDialogOpen,
    setConflictDialogOpen,
    conflicts,
    conflictPassportData,
    // 重複確認
    pendingConfirmations,
    confirmUpdate,
    rejectUpdate,
    confirmAllUpdates,
    rejectAllUpdates,
    // 操作
    handleFileChange: fileModule.handleFileChange,
    handleDragOver: fileModule.handleDragOver,
    handleDragLeave: fileModule.handleDragLeave,
    handleDrop: fileModule.handleDrop,
    handleRemoveFile: fileModule.handleRemoveFile,
    handleUpdateFilePreview: fileModule.updateFilePreview,
    handleBatchUpload,
    clearFiles: fileModule.clearFiles,
  }
}
