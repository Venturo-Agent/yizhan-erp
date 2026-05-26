/**
 * OCR Recognition Hook
 * 管理護照 OCR 辨識功能
 *
 * 共用於：
 * - CustomerVerifyDialog (顧客護照驗證)
 * - OrderMembersExpandable (訂單成員編輯)
 */

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { getPassportDisplayUrl } from '@/lib/passport-storage'

const TOAST_LABELS = {
  PASSPORT_URL_FAILED: '無法取得護照照片網址',
  OCR_FAILED: 'OCR 辨識失敗',
  OCR_SUCCESS: '辨識成功！請檢查資料',
  OCR_PARSE_FAILED: '無法辨識護照資訊，請手動輸入',
  OCR_RETRY: '辨識失敗，請重試',
} as const

/**
 * OCR 辨識結果的通用資料結構
 * 適用於顧客和訂單成員
 */
interface OcrParsedData {
  name?: string
  passport_name?: string
  passport_romanization?: string
  birth_date?: string
  gender?: string
  passport_number?: string
  passport_expiry?: string
  national_id?: string
}

interface OcrResult {
  name?: string
  passport_name?: string
  passport_romanization?: string
  birth_date?: string
  sex?: string
  gender?: string
  passport_number?: string
  passport_expiry?: string
  national_id?: string
}

interface OcrApiResponse {
  results?: Array<{
    success: boolean
    customer?: OcrResult
  }>
}

export function useOcrRecognition() {
  const [isRecognizing, setIsRecognizing] = useState(false)

  /**
   * 辨識護照圖片
   * @param imageSource - 可以是 URL 或 File 物件
   * @param onSuccess - 辨識成功時的回調函數，回傳解析後的資料
   */
  const recognizePassport = useCallback(
    async (imageSource: string | File, onSuccess: (data: OcrParsedData) => void) => {
      setIsRecognizing(true)
      try {
        let file: File

        if (typeof imageSource === 'string') {
          // bare filename (新格式) → 現場簽 15 分鐘 URL 再 fetch
          // 完整 URL 或 base64 data URL → 直接 fetch
          const fetchUrl =
            imageSource.startsWith('http') || imageSource.startsWith('data:')
              ? imageSource
              : await getPassportDisplayUrl(imageSource)
          if (!fetchUrl) throw new Error(TOAST_LABELS.PASSPORT_URL_FAILED)
          const response = await fetch(fetchUrl)
          const blob = await response.blob()
          file = new File([blob], 'passport.jpg', { type: 'image/jpeg' })
        } else {
          file = imageSource
        }

        // 呼叫 OCR API
        const formData = new FormData()
        formData.append('files', file)

        const ocrResponse = await fetch('/api/ocr/passport', {
          method: 'POST',
          body: formData,
        })

        if (!ocrResponse.ok) {
          throw new Error(TOAST_LABELS.OCR_FAILED)
        }

        const json = await ocrResponse.json()
        // API 用 successResponse 包裝：{ success: true, data: { results, total, successful } }
        const result: OcrApiResponse = json.success && json.data ? json.data : json

        if (result.results?.[0]?.success && result.results[0].customer) {
          const ocrData = result.results[0].customer

          // 性別判斷：優先用 OCR 結果，再用身分證字號第二碼備援
          let gender = ocrData.sex || ocrData.gender
          if (!gender && ocrData.national_id) {
            const secondChar = ocrData.national_id.charAt(1)
            if (secondChar === '1') gender = '男'
            else if (secondChar === '2') gender = '女'
          }

          // 組合辨識結果
          const recognizedData: OcrParsedData = {
            name: ocrData.name,
            passport_name: ocrData.passport_name,
            passport_romanization: ocrData.passport_romanization,
            birth_date: ocrData.birth_date,
            gender,
            passport_number: ocrData.passport_number,
            passport_expiry: ocrData.passport_expiry,
            national_id: ocrData.national_id,
          }

          onSuccess(recognizedData)
          toast.success(TOAST_LABELS.OCR_SUCCESS)
        } else {
          toast.error(TOAST_LABELS.OCR_PARSE_FAILED)
        }
      } catch (error) {
        logger.error('OCR 辨識失敗:', error)
        toast.error(TOAST_LABELS.OCR_RETRY)
      } finally {
        setIsRecognizing(false)
      }
    },
    []
  )

  return {
    isRecognizing,
    recognizePassport,
  }
}
