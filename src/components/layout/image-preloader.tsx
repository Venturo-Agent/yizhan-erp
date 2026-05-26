'use client'

import { useEffect } from 'react'
import { useWorkspaceSettings } from '@/hooks/useWorkspaceSettings'

/**
 * ImagePreloader - 員工登入後背景預載 logo + 三章到 browser cache
 *
 * 為什麼存在(2026-05-20 William 反映「按列印太快、logo 還沒載入完就印出去」):
 *   - 列印 dialog 開啟時才 <img src="..."> → 瀏覽器才開始下載 → 太快按列印就會缺圖
 *   - 把這些圖在 layout 層級早早 preload、員工 idle 時就下載好、列印時直接從 cache 取
 *
 * 機制:
 *   new Image().src = url 會觸發瀏覽器 fetch、命中後存進 image cache
 *   後續 <img src={same url}> 直接從 cache 渲染、零網路延遲
 *
 * 為什麼用 new Image() 而不是 <link rel="preload" as="image">:
 *   - rel=preload 在 next/head 內處理 dynamic URL 比較吵
 *   - new Image() 更直觀、且 useEffect 自然只在 client 跑
 *
 * 為什麼放 (main)/layout.tsx:
 *   - 員工登入後第一個 mount 的 layout、idle 時就開始預載
 *   - workspace 設定改動(換 logo)時 useWorkspaceSettings 會 invalidate、URL 換、自動 re-preload
 */
export function ImagePreloader() {
  const ws = useWorkspaceSettings()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const urls = [
      ws.logo_url,
      ws.company_seal_url,
      ws.personal_seal_url,
      ws.invoice_seal_image_url,
    ].filter((u): u is string => !!u)

    for (const url of urls) {
      const img = new window.Image()
      img.src = url
    }
  }, [ws.logo_url, ws.company_seal_url, ws.personal_seal_url, ws.invoice_seal_image_url])

  return null
}
