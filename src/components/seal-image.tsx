'use client'

/**
 * SealImage — 公司章 / 個人章 / 發票章列印用統一元件
 *
 * 為什麼：每個 user 上傳的章子原圖尺寸不一（200×200 / 800×800 ...）、
 * 直接 <img> 顯示會導致合約 / 收據版面跑掉。
 * 此元件強制固定 box + object-contain、章子保比例縮放在統一尺寸 box 內、
 * 所有 user 在同一份列印文件上印出來都「等比例」。
 *
 * 配套：上傳時的 crop dialog（src/app/(main)/settings/company/_components/ImageUploadField.tsx）
 * 把章子周圍空白裁掉、確保 box 內沒有大量留白。
 *
 * 用法：
 *   <SealImage url={workspace.company_seal_url} size={80} />
 *   <SealImage url={workspace.invoice_seal_image_url} size={110} rotate={-6} />
 */

import React from 'react'

interface SealImageProps {
  url: string | null | undefined
  /** box 尺寸（px、預設 80）— 章子保比例 fit 在 size×size box 內 */
  size?: number
  /** 旋轉角度（度數、預設 0） */
  rotate?: number
  /** 透明度（預設 0.95、列印章子常微透避免太刻意） */
  opacity?: number
  alt?: string
  className?: string
  style?: React.CSSProperties
}

export function SealImage({
  url,
  size = 80,
  rotate = 0,
  opacity = 0.95,
  alt = 'seal',
  className,
  style,
}: SealImageProps) {
  if (!url) return null
  return (
    <img
      src={url}
      alt={alt}
      className={className}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        objectFit: 'contain',
        opacity,
        transform: rotate ? `rotate(${rotate}deg)` : undefined,
        ...style,
      }}
    />
  )
}
