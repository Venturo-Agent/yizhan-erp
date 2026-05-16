/**
 * Passport Upload Hook
 * 管理護照批次上傳功能：文件拖放、PDF轉圖片、壓縮、OCR處理
 *
 * 功能：
 * - 批次重複檢測
 * - 多重比對邏輯（身分證 → 生日 → 姓名 → 護照號碼）
 * - 簡體轉繁體中文
 * - 智慧比對：資料相同時自動更新，不同時才詢問
 * - 找到客戶時更新，未找到時新增
 *
 * 重構：text utils / file processing / execute updates 已分拆到子模組
 */

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { alert } from '@/lib/ui/alert-dialog'
import type { Customer } from '@/types/customer.types'
import { toTraditional, normalizeGender } from './passportTextUtils'
import { convertPdfToImages, compressImage } from './passportFileProcessing'
import { executePassportUpdates, type OcrProcessedItem } from './passportExecuteUpdates'

interface UsePassportUploadOptions {
  customers: Customer[]
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<void>
  addCustomer: (data: Partial<Customer>) => Promise<Customer>
  onComplete?: () => void | Promise<void>
}

export function usePassportUpload(options: UsePassportUploadOptions) {
  const { customers, updateCustomer, addCustomer, onComplete } = options
  const [files, setFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  // 📁 文件變更處理
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    logger.log('📁 handlePassportFileChange triggered', e.target.files)
    const newFiles = e.target.files
    if (newFiles && newFiles.length > 0) {
      logger.log(
        '📁 Adding files:',
        Array.from(newFiles).map(f => f.name)
      )
      setFiles(prev => [...prev, ...Array.from(newFiles)])
    }
  }, [])

  // 🖱️ 拖放事件處理
  const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    logger.log(
      '📥 Files dropped:',
      droppedFiles.map(f => f.name)
    )

    if (droppedFiles.length > 0) {
      setFiles(prev => [...prev, ...droppedFiles])
    }
  }, [])

  // 🗑️ 移除文件
  const handleRemoveFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  // 📤 批次上傳（階段 1 + 2：PDF 轉圖 + OCR 分類）
  const handleBatchUpload = useCallback(async () => {
    if (files.length === 0) {
      void alert('請選擇至少一個檔案', 'error')
      return
    }

    setIsUploading(true)

    // 分類結果
    const newCustomerItems: OcrProcessedItem[] = []
    const matchedItems: OcrProcessedItem[] = []
    const duplicateItems: string[] = []
    const failedItems: string[] = []
    const processedPassports = new Set<string>()

    try {
      // === 階段 1: 處理所有文件（PDF 轉圖片）===
      const allFiles: File[] = []
      for (const file of files) {
        if (file.type === 'application/pdf') {
          logger.log(`📄 Converting PDF: ${file.name}`)
          const images = await convertPdfToImages(file)
          allFiles.push(...images)
        } else {
          allFiles.push(file)
        }
      }

      logger.log(`📤 開始處理 ${allFiles.length} 個檔案`)
      let googleVisionError: string | null = null

      // === 階段 2: OCR 辨識所有檔案並分類 ===
      for (let i = 0; i < allFiles.length; i++) {
        const file = allFiles[i]
        logger.log(`處理 ${i + 1}/${allFiles.length}: ${file.name}`)

        try {
          // 壓縮圖片
          const compressedFile = await compressImage(file)
          logger.log(`✅ 壓縮完成: ${file.name}`)

          // 呼叫 OCR API
          const formData = new FormData()
          formData.append('files', compressedFile)

          const ocrResponse = await fetch('/api/ocr/passport', {
            method: 'POST',
            body: formData,
          })

          if (!ocrResponse.ok) {
            throw new Error('OCR 辨識失敗')
          }

          const ocrResult = await ocrResponse.json()
          const gvErr = ocrResult.data?.googleVisionError || ocrResult.googleVisionError
          if (gvErr && !googleVisionError) googleVisionError = gvErr
          const results = ocrResult.data?.results || ocrResult.results

          if (results?.[0]?.success && results[0].customer) {
            const ocrData = results[0].customer
            const passportNumber = ocrData.passport_number
            const nationalId = ocrData.national_id
            const birthDate = ocrData.birth_date
            // 轉換簡體為繁體（移除括號和警告符號）
            const rawName = ocrData.name
              ?.replace(/[()（）]/g, '')
              .replace(/⚠️/g, '')
              .split('/')[0]
              ?.trim()
            const chineseName = toTraditional(rawName)

            // 檢查本次批次內重複
            if (passportNumber && processedPassports.has(passportNumber)) {
              duplicateItems.push(`${file.name} (本次批次重複)`)
              continue
            }

            // 多重比對邏輯
            let existingCustomer: Customer | undefined
            let matchReason = ''

            // 1. 身分證字號比對
            if (nationalId) {
              existingCustomer = customers.find(c => c.national_id === nationalId)
              if (existingCustomer) matchReason = `身分證 ${nationalId}`
            }

            // 2. 生日比對
            if (!existingCustomer && birthDate) {
              const sameBirthday = customers.filter(c => c.birth_date === birthDate)
              if (sameBirthday.length === 1) {
                existingCustomer = sameBirthday[0]
                matchReason = `生日 ${birthDate}`
              } else if (sameBirthday.length > 1 && chineseName) {
                existingCustomer = sameBirthday.find(
                  c => c.name?.includes(chineseName) || chineseName.includes(c.name || '')
                )
                if (existingCustomer) matchReason = '生日+姓名'
              }
            }

            // 3. 姓名比對
            if (!existingCustomer && chineseName && chineseName.length >= 2) {
              existingCustomer = customers.find(c => c.name === chineseName)
              if (existingCustomer) matchReason = `姓名 ${chineseName}`
            }

            // 4. 護照號碼比對（完全重複）
            if (!existingCustomer && passportNumber) {
              existingCustomer = customers.find(c => c.passport_number === passportNumber)
              if (existingCustomer) {
                duplicateItems.push(`${file.name} (護照已存在: ${existingCustomer.name})`)
                processedPassports.add(passportNumber)
                continue
              }
            }

            // 性別判斷
            let gender = ocrData.sex || ocrData.gender
            if (!gender && nationalId) {
              const secondChar = nationalId.charAt(1)
              if (secondChar === '1') gender = 'M'
              else if (secondChar === '2') gender = 'F'
            }

            // 上傳圖片到 storage
            const random = Math.random().toString(36).substring(2, 8)
            const storageFileName = `passport_${Date.now()}_${random}.jpg`
            const { error: uploadError } = await supabase.storage
              .from('passport-images')
              .upload(storageFileName, compressedFile)

            if (uploadError) throw uploadError

            // 簽 1 小時 URL 僅供 OCR 確認 dialog 的預覽 HTML 使用
            // DB 只存 storageFileName（bare filename）、顯示時再動態簽 15 分鐘
            const { data: urlData, error: urlError } = await supabase.storage
              .from('passport-images')
              .createSignedUrl(storageFileName, 3600)
            if (urlError || !urlData?.signedUrl)
              throw urlError || new Error('Failed to create signed URL')

            // 檢查與現有資料的差異
            const differences: string[] = []
            let hasRealDifference = false

            if (existingCustomer) {
              if (passportNumber && existingCustomer.passport_number !== passportNumber) {
                differences.push(
                  `護照號碼: ${existingCustomer.passport_number || '無'} → ${passportNumber}`
                )
                hasRealDifference = true
              }
              if (ocrData.passport_expiry && existingCustomer.passport_expiry !== ocrData.passport_expiry) {
                differences.push(
                  `效期: ${existingCustomer.passport_expiry || '無'} → ${ocrData.passport_expiry}`
                )
                hasRealDifference = true
              }
              if (ocrData.passport_name && existingCustomer.passport_name !== ocrData.passport_name) {
                differences.push(
                  `拼音: ${existingCustomer.passport_name || '無'} → ${ocrData.passport_name}`
                )
                hasRealDifference = true
              }
              if (nationalId && !existingCustomer.national_id) {
                differences.push(`身分證: 新增 ${nationalId}`)
                hasRealDifference = true
              }
              if (birthDate && !existingCustomer.birth_date) {
                differences.push(`生日: 新增 ${birthDate}`)
                hasRealDifference = true
              }
              const normalizedGenderValue = normalizeGender(gender)
              if (normalizedGenderValue && !existingCustomer.gender) {
                differences.push(
                  `性別: 新增 ${normalizedGenderValue === 'M' ? '男' : '女'}`
                )
                hasRealDifference = true
              }
            }

            const item: OcrProcessedItem = {
              fileName: file.name,
              ocrData,
              compressedFile,
              imageUrl: urlData.signedUrl,
              storageFileName,
              existingCustomer,
              matchReason,
              chineseName,
              normalizedGender: normalizeGender(gender),
              hasRealDifference,
              differences,
            }

            if (existingCustomer) {
              matchedItems.push(item)
            } else {
              newCustomerItems.push(item)
            }

            if (passportNumber) {
              processedPassports.add(passportNumber)
            }
          } else {
            failedItems.push(`${file.name} (辨識失敗)`)
          }
        } catch (error) {
          logger.error(`❌ 處理失敗: ${file.name}`, error)
          failedItems.push(`${file.name} (處理失敗)`)
        }
      }

      // 階段 3 + 4 + 5：委託 executePassportUpdates
      await executePassportUpdates({
        matchedItems,
        newCustomerItems,
        duplicateItems,
        failedItems,
        allFileCount: allFiles.length,
        googleVisionError,
        updateCustomer,
        addCustomer,
      })

      // 清空文件列表
      setFiles([])

      // 觸發完成回調
      if (onComplete) {
        await onComplete()
      }
    } catch (error) {
      logger.error('批次上傳失敗:', error)
      await alert(
        '批次上傳失敗：' + (error instanceof Error ? error.message : '未知錯誤'),
        'error'
      )
    } finally {
      setIsUploading(false)
    }
  }, [files, customers, updateCustomer, addCustomer, onComplete])

  // 清除所有文件
  const clearFiles = useCallback(() => {
    setFiles([])
  }, [])

  return {
    files,
    isUploading,
    isDragging,
    handleFileChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleRemoveFile,
    handleBatchUpload,
    removeFile: handleRemoveFile,
    processFiles: handleBatchUpload,
    clearFiles,
  }
}
