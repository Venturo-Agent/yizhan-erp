/**
 * PDF 中文字體載入工具
 *
 * 用於 jsPDF 的中文字體支援
 * 使用 ChironHeiHK 字體（香港明體）
 */

import type jsPDF from 'jspdf'
import { logger } from '@/lib/utils/logger'

// 字體快取
let fontLoaded = false
let normalFontBase64: string | null = null
let boldFontBase64: string | null = null

/**
 * 將 ArrayBuffer 轉換為 Base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * 載入中文字體到 jsPDF
 *
 * @param doc - jsPDF 實例
 * @returns Promise<void>
 */
export async function loadChineseFonts(doc: jsPDF): Promise<void> {
  // 如果字體已經載入過，直接使用快取
  if (fontLoaded && normalFontBase64 && boldFontBase64) {
    addFontsToDoc(doc, normalFontBase64, boldFontBase64)
    return
  }

  try {
    // 載入字體檔案
    const [normalResponse, boldResponse] = await Promise.all([
      fetch('/assets/fonts/ChironHeiHK-N.ttf'),
      fetch('/assets/fonts/ChironHeiHK-B.ttf'),
    ])

    if (!normalResponse.ok || !boldResponse.ok) {
      logger.warn('無法載入中文字體，將使用預設字體')
      return
    }

    const [normalBuffer, boldBuffer] = await Promise.all([
      normalResponse.arrayBuffer(),
      boldResponse.arrayBuffer(),
    ])

    // 轉換為 Base64
    normalFontBase64 = arrayBufferToBase64(normalBuffer)
    boldFontBase64 = arrayBufferToBase64(boldBuffer)
    fontLoaded = true

    addFontsToDoc(doc, normalFontBase64, boldFontBase64)
  } catch (error) {
    logger.warn('載入中文字體失敗:', error)
  }
}

/**
 * 將字體添加到 jsPDF 文件
 */
function addFontsToDoc(doc: jsPDF, normalFont: string, boldFont: string): void {
  // 添加 Normal 字體
  doc.addFileToVFS('ChironHeiHK-N.ttf', normalFont)
  doc.addFont('ChironHeiHK-N.ttf', 'ChironHeiHK', 'normal')

  // 添加 Bold 字體
  doc.addFileToVFS('ChironHeiHK-B.ttf', boldFont)
  doc.addFont('ChironHeiHK-B.ttf', 'ChironHeiHK', 'bold')

  // 設定為預設字體
  doc.setFont('ChironHeiHK', 'normal')
}

/**
 * 設定 jsPDF 使用中文字體
 *
 * @param doc - jsPDF 實例
 * @param style - 'normal' | 'bold'
 */
function _setChineseFont(doc: jsPDF, style: 'normal' | 'bold' = 'normal'): void {
  doc.setFont('ChironHeiHK', style)
}

/**
 * 取得 autoTable 使用的字體設定
 */
function _getAutoTableFontOptions(): { font: string } {
  return { font: 'ChironHeiHK' }
}
