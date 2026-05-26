/**
 * OCR API 客戶端
 * 封裝 OCR.space 和 Google Vision API 呼叫
 */

import { logger } from '@/lib/utils/logger'

/**
 * 呼叫 OCR.space API（專門辨識 MRZ）
 */
export async function callOcrSpace(
  base64Image: string,
  apiKey: string,
  options: { chineseRecognition?: boolean } = {}
): Promise<string> {
  const ocrFormData = new FormData()
  ocrFormData.append('base64Image', base64Image)
  // 2026-05-14：language 由 caller 透過 chineseRecognition 切換
  //   true  → cht（OCREngine 2 中英混合、含中文姓名）
  //   false → eng（只辨識 MRZ、不誤判但無中文）
  ocrFormData.append('language', options.chineseRecognition ? 'cht' : 'eng')
  ocrFormData.append('isOverlayRequired', 'false')
  ocrFormData.append('detectOrientation', 'true')
  ocrFormData.append('scale', 'true')
  ocrFormData.append('OCREngine', '2')

  // 🆕 加入 30 秒 timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)

  try {
    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: { apikey: apiKey },
      body: ocrFormData,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    const data = await response.json()

    if (data.IsErroredOnProcessing) {
      throw new Error(data.ErrorMessage?.[0] || 'OCR.space 辨識失敗')
    }

    return data.ParsedResults?.[0]?.ParsedText || ''
  } catch (error) {
    clearTimeout(timeoutId)
    const err = error as { name?: string; message?: string }

    // 🔧 處理所有 OCR.space 錯誤：返回空字串讓 Google Vision 接手
    if (err.name === 'AbortError') {
      logger.warn('OCR.space fetch timeout (30s), 改用 Google Vision')
    } else if (err.message?.includes('E101') || err.message?.includes('Timed out')) {
      logger.warn('OCR.space API timeout, 改用 Google Vision')
    } else {
      logger.warn('OCR.space 辨識失敗:', err.message, '改用 Google Vision')
    }

    // 所有錯誤都返回空字串，不中斷流程
    return ''
  }
}

// 2026-05-14 William 拍板：徹底砍 Google Vision、純 OCR.space + cht 模式
// callGoogleVision / GoogleVisionResult 已移除（git history 可查）
