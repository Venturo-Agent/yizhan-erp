/**
 * ImageEditor 輔助函數
 */

import type { ImageAdjustments, ImageEditorSettings, CornerOffsets } from './types'
import { solveHomography } from './perspective-math'

/**
 * 應用旋轉和翻轉到圖片（用於預覽）
 *
 * 5/14：加 fineRotation 微調（-45 ~ +45 度水平校正）、跟 90° rotation 相加。
 */
export async function applyTransformToImage(
  src: string,
  rotation: number,
  flipH: boolean,
  fineRotation = 0
): Promise<string> {
  // 如果沒有變換，直接返回原圖
  if (rotation === 0 && !flipH && fineRotation === 0) return src

  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(src)
        return
      }

      const totalAngle = rotation + fineRotation
      const radians = (totalAngle * Math.PI) / 180
      const absCos = Math.abs(Math.cos(radians))
      const absSin = Math.abs(Math.sin(radians))
      // bounding box 算法：旋轉後的畫布要能裝下整張圖（不切角）
      canvas.width = Math.round(img.width * absCos + img.height * absSin)
      canvas.height = Math.round(img.width * absSin + img.height * absCos)

      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate(radians)
      if (flipH) {
        ctx.scale(-1, 1)
      }
      ctx.drawImage(img, -img.width / 2, -img.height / 2)

      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => resolve(src)
    img.src = src
  })
}

/**
 * 應用色彩調整到圖片
 */
export async function applyAdjustmentsToImage(
  src: string,
  adjustments: ImageAdjustments
): Promise<string> {
  // 如果沒有調整，直接返回原圖
  const hasChanges = Object.values(adjustments).some(v => v !== 0)
  if (!hasChanges) return src

  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(src)
        return
      }

      canvas.width = img.width
      canvas.height = img.height

      // 基本繪製
      ctx.drawImage(img, 0, 0)

      // 獲取像素數據
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data

      // 先處理銳利度（需要鄰近像素，所以要先處理）
      if (adjustments.clarity && adjustments.clarity !== 0) {
        const originalData = new Uint8ClampedArray(data)
        const width = canvas.width
        const height = canvas.height
        const amount = adjustments.clarity / 100 // -1 到 1

        for (let y = 1; y < height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4

            for (let c = 0; c < 3; c++) {
              // 取鄰近像素
              const top = originalData[((y - 1) * width + x) * 4 + c]
              const bottom = originalData[((y + 1) * width + x) * 4 + c]
              const left = originalData[(y * width + (x - 1)) * 4 + c]
              const right = originalData[(y * width + (x + 1)) * 4 + c]
              const center = originalData[idx + c]

              // Unsharp mask: center + amount * (center - blur)
              const blur = (top + bottom + left + right) / 4
              const sharpened = center + amount * (center - blur) * 2

              data[idx + c] = Math.max(0, Math.min(255, sharpened))
            }
          }
        }
      }

      // 應用其他調整
      for (let i = 0; i < data.length; i += 4) {
        let r = data[i]
        let g = data[i + 1]
        let b = data[i + 2]

        // 曝光度
        if (adjustments.exposure !== 0) {
          const factor = 1 + adjustments.exposure / 100
          r = Math.min(255, r * factor)
          g = Math.min(255, g * factor)
          b = Math.min(255, b * factor)
        }

        // 對比度
        if (adjustments.contrast !== 0) {
          const factor = (259 * (adjustments.contrast + 255)) / (255 * (259 - adjustments.contrast))
          r = factor * (r - 128) + 128
          g = factor * (g - 128) + 128
          b = factor * (b - 128) + 128
        }

        // 飽和度
        if (adjustments.saturation !== 0) {
          const gray = 0.2989 * r + 0.587 * g + 0.114 * b
          const factor = 1 + adjustments.saturation / 100
          r = gray + factor * (r - gray)
          g = gray + factor * (g - gray)
          b = gray + factor * (b - gray)
        }

        // 色溫
        if (adjustments.temperature !== 0) {
          const temp = adjustments.temperature / 100
          r = r + temp * 30
          b = b - temp * 30
        }

        // 限制範圍
        data[i] = Math.max(0, Math.min(255, r))
        data[i + 1] = Math.max(0, Math.min(255, g))
        data[i + 2] = Math.max(0, Math.min(255, b))
      }

      ctx.putImageData(imageData, 0, 0)
      resolve(canvas.toDataURL('image/jpeg', 0.9))
    }
    img.onerror = () => resolve(src)
    img.src = src
  })
}

/**
 * 裁切圖片
 */
export async function cropImage(
  src: string,
  settings: ImageEditorSettings,
  aspectRatio: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      // 先處理旋轉/翻轉
      const isRotated90 = settings.rotation === 90 || settings.rotation === 270
      const srcWidth = isRotated90 ? img.height : img.width
      const srcHeight = isRotated90 ? img.width : img.height

      // 建立臨時 canvas 來應用旋轉/翻轉
      const tempCanvas = document.createElement('canvas')
      const tempCtx = tempCanvas.getContext('2d')
      if (!tempCtx) {
        reject(new Error('Canvas context not available'))
        return
      }

      tempCanvas.width = srcWidth
      tempCanvas.height = srcHeight

      // 應用變換
      tempCtx.translate(srcWidth / 2, srcHeight / 2)
      tempCtx.rotate((settings.rotation * Math.PI) / 180)
      if (settings.flipH) {
        tempCtx.scale(-1, 1)
      }
      tempCtx.drawImage(img, -img.width / 2, -img.height / 2)

      // 現在從變換後的圖片裁切
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas context not available'))
        return
      }

      // 計算裁切區域
      const imgRatio = srcWidth / srcHeight
      let cropWidth: number, cropHeight: number, cropX: number, cropY: number

      if (imgRatio > aspectRatio) {
        // 圖片較寬，以高度為基準
        cropHeight = srcHeight / settings.scale
        cropWidth = cropHeight * aspectRatio
      } else {
        // 圖片較高，以寬度為基準
        cropWidth = srcWidth / settings.scale
        cropHeight = cropWidth / aspectRatio
      }

      // 根據位置計算偏移
      const maxOffsetX = srcWidth - cropWidth
      const maxOffsetY = srcHeight - cropHeight
      cropX = (settings.x / 100) * maxOffsetX
      cropY = (settings.y / 100) * maxOffsetY

      // 設定輸出尺寸
      canvas.width = cropWidth
      canvas.height = cropHeight

      ctx.drawImage(tempCanvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight)

      canvas.toBlob(
        blob => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Canvas to Blob failed'))
          }
        },
        'image/jpeg',
        0.9
      )
    }
    img.onerror = () => reject(new Error('Image load failed'))
    img.src = src
  })
}

/**
 * Perspective 裁切 — 把原圖中 4 個角圍出來的梯形區域、拉直成矩形輸出
 *
 * 演算法：inverse mapping + bilinear 取樣
 * 1. 算 inverse homography：output 矩形 4 角 → 原圖梯形 4 角
 * 2. 對 output canvas 每個 pixel (u, v)、用 H 反推原圖位置 (x, y)
 * 3. bilinear 插值取色
 *
 * src 應該已套用旋轉 / 翻轉 / 色彩調整（previewSrc）。
 * cornerOffsets 是百分比 0-100、相對 src 整張圖。
 *
 * outputMaxDimension：輸出長邊上限、預設 1600（避免巨大檔）。
 */
export async function perspectiveCropImage(
  src: string,
  cornerOffsets: CornerOffsets,
  outputMaxDimension = 1600
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const srcWidth = img.width
      const srcHeight = img.height

      // 4 角的原圖像素座標（按 cornerOffsets 百分比換算）
      const tl = {
        x: (cornerOffsets.tl.x / 100) * srcWidth,
        y: (cornerOffsets.tl.y / 100) * srcHeight,
      }
      const tr = {
        x: (cornerOffsets.tr.x / 100) * srcWidth,
        y: (cornerOffsets.tr.y / 100) * srcHeight,
      }
      const br = {
        x: (cornerOffsets.br.x / 100) * srcWidth,
        y: (cornerOffsets.br.y / 100) * srcHeight,
      }
      const bl = {
        x: (cornerOffsets.bl.x / 100) * srcWidth,
        y: (cornerOffsets.bl.y / 100) * srcHeight,
      }

      // 估算輸出尺寸：取上邊 / 下邊長度的平均當寬、左邊 / 右邊平均當高
      const topEdge = Math.hypot(tr.x - tl.x, tr.y - tl.y)
      const bottomEdge = Math.hypot(br.x - bl.x, br.y - bl.y)
      const leftEdge = Math.hypot(bl.x - tl.x, bl.y - tl.y)
      const rightEdge = Math.hypot(br.x - tr.x, br.y - tr.y)
      let outW = Math.round((topEdge + bottomEdge) / 2)
      let outH = Math.round((leftEdge + rightEdge) / 2)
      if (outW < 1 || outH < 1) {
        reject(new Error('Invalid crop dimensions'))
        return
      }
      // 限制長邊不超過 outputMaxDimension
      const longSide = Math.max(outW, outH)
      if (longSide > outputMaxDimension) {
        const scale = outputMaxDimension / longSide
        outW = Math.round(outW * scale)
        outH = Math.round(outH * scale)
      }

      // Inverse homography：output 矩形 → 原圖梯形
      const H = solveHomography(
        [
          { x: 0, y: 0 },
          { x: outW, y: 0 },
          { x: outW, y: outH },
          { x: 0, y: outH },
        ],
        [tl, tr, br, bl]
      )

      // 載原圖到 canvas、撈 pixel data
      const srcCanvas = document.createElement('canvas')
      srcCanvas.width = srcWidth
      srcCanvas.height = srcHeight
      const srcCtx = srcCanvas.getContext('2d')
      if (!srcCtx) {
        reject(new Error('Source canvas context not available'))
        return
      }
      srcCtx.drawImage(img, 0, 0)
      const srcData = srcCtx.getImageData(0, 0, srcWidth, srcHeight).data

      // Output canvas
      const outCanvas = document.createElement('canvas')
      outCanvas.width = outW
      outCanvas.height = outH
      const outCtx = outCanvas.getContext('2d')
      if (!outCtx) {
        reject(new Error('Output canvas context not available'))
        return
      }
      const outImageData = outCtx.createImageData(outW, outH)
      const outData = outImageData.data

      const [h11, h12, h13, h21, h22, h23, h31, h32, h33] = H

      for (let v = 0; v < outH; v++) {
        for (let u = 0; u < outW; u++) {
          // inverse mapping：(u, v) → (x, y) on src
          const w = h31 * u + h32 * v + h33
          const xs = (h11 * u + h12 * v + h13) / w
          const ys = (h21 * u + h22 * v + h23) / w

          // bilinear 取樣
          const idx = (v * outW + u) * 4
          if (xs < 0 || xs >= srcWidth - 1 || ys < 0 || ys >= srcHeight - 1) {
            // 出界 → 透明 / 黑色
            outData[idx] = 0
            outData[idx + 1] = 0
            outData[idx + 2] = 0
            outData[idx + 3] = 0
            continue
          }
          const x0 = Math.floor(xs)
          const y0 = Math.floor(ys)
          const dx = xs - x0
          const dy = ys - y0
          const i00 = (y0 * srcWidth + x0) * 4
          const i10 = (y0 * srcWidth + x0 + 1) * 4
          const i01 = ((y0 + 1) * srcWidth + x0) * 4
          const i11 = ((y0 + 1) * srcWidth + x0 + 1) * 4
          for (let c = 0; c < 4; c++) {
            const c00 = srcData[i00 + c]
            const c10 = srcData[i10 + c]
            const c01 = srcData[i01 + c]
            const c11 = srcData[i11 + c]
            const top = c00 + (c10 - c00) * dx
            const bot = c01 + (c11 - c01) * dx
            outData[idx + c] = Math.round(top + (bot - top) * dy)
          }
        }
      }

      outCtx.putImageData(outImageData, 0, 0)
      outCanvas.toBlob(
        blob => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Canvas to Blob failed'))
          }
        },
        'image/jpeg',
        0.9
      )
    }
    img.onerror = () => reject(new Error('Image load failed'))
    img.src = src
  })
}
