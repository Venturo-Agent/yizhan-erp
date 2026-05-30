'use client'

/**
 * GeneratePptxButton — 展示行程「產簡報」按鈕
 *
 * 把當前畫面的 canvas 帶給 /api/tours/[code]/generate-presentation、
 * 收到 PPTX 後在瀏覽器觸發下載。所見即所得（用當前 canvas、含未存草稿的微調）。
 *
 * 權限：寄生在展示行程權限（API 守 tours.display-itinerary.read）。
 * 風格：目前引擎只有「活潑版」(playful) 可用、之後其他風格做好再加選單。
 */

import { useState } from 'react'
import { FileDown } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { logger } from '@/lib/utils/logger'
import type { Canvas } from '@/components/canvas-renderer'

interface GeneratePptxButtonProps {
  code: string
  canvas: Canvas
}

export function GeneratePptxButton({ code, canvas }: GeneratePptxButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch(`/api/tours/${code}/generate-presentation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canvas, template: 'playful' }),
      })

      if (!res.ok) {
        // 後端錯誤一律帶 { error }、抓出來給使用者看
        const detail = await res.json().catch(() => null)
        throw new Error(detail?.error || `產生失敗（${res.status}）`)
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `簡報-${code}.pptx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)

      toast.success('簡報已產生、開始下載')
    } catch (err) {
      const message = err instanceof Error ? err.message : '產生簡報失敗'
      logger.error('generate presentation failed', err)
      toast.error(`產生簡報失敗：${message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" onClick={handleGenerate} disabled={loading} className="gap-2">
      <FileDown className="h-4 w-4" />
      {loading ? '產生中⋯' : '產簡報'}
    </Button>
  )
}
