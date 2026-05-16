/**
 * usePassportOcr - OCR 識別邏輯
 *
 * 功能：
 * - 呼叫 OCR API
 * - 解析 OCR 結果
 * - 檢查重複成員
 */

import { useCallback } from 'react'
import { logger } from '@/lib/utils/logger'

interface OcrCustomerData {
  name?: string
  english_name?: string
  passport_name?: string
  passport_name_print?: string
  passport_romanization?: string
  passport_number?: string
  passport_expiry?: string | null
  national_id?: string
  birth_date?: string | null
  sex?: string
}

interface OcrResult {
  success: boolean
  customer: OcrCustomerData
  fileName: string
}

interface OcrApiResponse {
  results: OcrResult[]
  successful: number
  total: number
  googleVisionError?: string | null
  chineseNameWarning?: string | null
}

interface ExistingMember {
  id: string
  passport_number: string | null
  id_number: string | null
  chinese_name: string | null
  birth_date: string | null
  passport_image_url?: string | null
}

interface DuplicateCheckResult {
  isDuplicate: boolean
  reason: string
  matchType?: 'exact' | 'name_only' | 'passport_match' | 'name_birthday_match'
  matchedMember?: ExistingMember // 符合的現有成員
  needsConfirmation?: boolean // 需要使用者確認是否更新
  confirmMessage?: string // 確認對話框訊息
}

interface UsePassportOcrReturn {
  performOcr: (files: File[]) => Promise<OcrApiResponse>
  checkDuplicate: (
    customer: OcrCustomerData,
    existingMembers: ExistingMember[]
  ) => DuplicateCheckResult
}

export function usePassportOcr(): UsePassportOcrReturn {
  // 執行 OCR 辨識
  const performOcr = useCallback(async (files: File[]): Promise<OcrApiResponse> => {
    const formData = new FormData()
    files.forEach(file => {
      formData.append('files', file)
    })

    const response = await fetch('/api/ocr/passport', {
      method: 'POST',
      body: formData,
      credentials: 'include', // 確保帶上認證 cookie
    })

    if (!response.ok) {
      let errorText = ''
      try {
        errorText = await response.text()
      } catch {
        errorText = '無法讀取回應內容'
      }
      const statusCode = response.status
      const statusMessage = response.statusText
      logger.error(
        `OCR API 回應錯誤: status=${statusCode}, statusText=${statusMessage}, body=${errorText.slice(0, 500)}`
      )
      throw new Error(
        `OCR 辨識失敗 (${statusCode}): ${errorText.slice(0, 100) || statusMessage || '未知錯誤'}`
      )
    }

    const json = await response.json()

    // API 使用 successResponse 包裝，實際資料在 data 欄位
    if (json.success && json.data) {
      return json.data
    }

    // 如果 API 返回錯誤
    if (!json.success) {
      throw new Error(json.error || 'OCR 辨識失敗')
    }

    // 向後相容：如果直接返回資料格式
    return json
  }, [])

  // 檢查是否為重複成員
  const checkDuplicate = useCallback(
    (customer: OcrCustomerData, existingMembers: ExistingMember[]): DuplicateCheckResult => {
      const passportNumber = customer.passport_number || ''
      const idNumber = customer.national_id || ''
      const birthDate = customer.birth_date || null
      const chineseName = customer.name || ''
      const cleanChineseName = chineseName.replace(/\([^)]+\)$/, '').trim()
      const nameBirthKey = cleanChineseName && birthDate ? `${cleanChineseName}|${birthDate}` : ''

      // 建立檢查集合
      const existingPassports = new Set(existingMembers.map(m => m.passport_number).filter(Boolean))
      const existingIdNumbers = new Set(existingMembers.map(m => m.id_number).filter(Boolean))
      const existingNameBirthKeys = new Set(
        existingMembers
          .filter(m => m.chinese_name && m.birth_date)
          .map(m => `${m.chinese_name}|${m.birth_date}`)
      )

      // 檢查重複 - 先找符合的成員
      const findMatchedMember = (
        field: 'passport_number' | 'id_number',
        value: string
      ): ExistingMember | undefined => {
        return existingMembers.find(m => m[field] === value)
      }

      // 1. 護照號碼完全符合 → 確認是否更新照片和資料
      if (passportNumber && existingPassports.has(passportNumber)) {
        const matched = findMatchedMember('passport_number', passportNumber)
        const displayName = chineseName || matched?.chinese_name || ''
        return {
          isDuplicate: false,
          needsConfirmation: true,
          reason: '護照號碼重複',
          matchType: 'passport_match',
          matchedMember: matched,
          confirmMessage: `${displayName} 已存在（護照號碼相同）。是否更新護照照片和資料？`,
        }
      }

      // 2. 身分證號完全符合 → 確認是否更新照片（新照片可能更清楚）
      if (idNumber && existingIdNumbers.has(idNumber)) {
        const matched = findMatchedMember('id_number', idNumber)
        const displayName = chineseName || matched?.chinese_name || ''
        return {
          isDuplicate: false,
          needsConfirmation: true,
          reason: '身分證號重複',
          matchType: 'exact',
          matchedMember: matched,
          confirmMessage: `${displayName} 已存在（身分證號相同）。是否更新護照照片？（新照片可能更清楚）`,
        }
      }

      // 3. 姓名+生日完全符合 → 確認是否更新（可能換了新護照）
      if (nameBirthKey && existingNameBirthKeys.has(nameBirthKey)) {
        const matched = existingMembers.find(
          m => m.chinese_name === cleanChineseName && m.birth_date === birthDate
        )
        const displayName = chineseName || matched?.chinese_name || ''
        return {
          isDuplicate: false,
          needsConfirmation: true,
          reason: '姓名+生日重複',
          matchType: 'name_birthday_match',
          matchedMember: matched,
          confirmMessage: `${displayName} 已存在（姓名+生日相同）。護照號碼不同，是否換了新護照？要更新嗎？`,
        }
      }

      // 4. 只有姓名符合（無生日比對） → 確認是否為同一人並更新
      if (cleanChineseName) {
        const nameOnlyMatch = existingMembers.find(
          m => m.chinese_name === cleanChineseName && !m.birth_date
        )
        if (nameOnlyMatch) {
          const displayName = chineseName || nameOnlyMatch.chinese_name || ''
          return {
            isDuplicate: false,
            needsConfirmation: true,
            reason: '發現同名成員（無生日資料）',
            matchType: 'name_only',
            matchedMember: nameOnlyMatch,
            confirmMessage: `${displayName} 已存在（同名，無生日資料）。是否為同一人？要更新嗎？`,
          }
        }
      }

      return { isDuplicate: false, reason: '' }
    },
    []
  )

  return {
    performOcr,
    checkDuplicate,
  }
}
