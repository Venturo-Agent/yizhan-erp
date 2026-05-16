'use client'

/**
 * React hook: 把 DB 存的 passport 值（filename 或完整 URL）
 * 轉成可顯示的 15 分鐘短效簽章 URL。
 *
 * 用法：
 *   const displayUrl = usePassportImageUrl(member.passport_image_url)
 *   return <img src={displayUrl ?? ''} />
 */

import { useEffect, useState } from 'react'
import { getPassportDisplayUrl } from './index'

export function usePassportImageUrl(
  stored: string | null | undefined,
  ttlSeconds?: number
): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!stored) {
      setUrl(null)
      return
    }
    let cancelled = false
    getPassportDisplayUrl(stored, ttlSeconds).then(signed => {
      if (!cancelled) setUrl(signed)
    })
    return () => {
      cancelled = true
    }
  }, [stored, ttlSeconds])

  return url
}
