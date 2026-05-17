'use client'

/**
 * TourDisplayItineraryTab - 展示行程 tab
 * 
 * 功能：
 * - 預覽展示行程（永成款視覺）
 * - 編輯展示行程（Phase 2+）
 * - 分享連結給客戶
 * - 開啟/關閉報名功能
 */

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { ExternalLink, Copy, Check, Share2, Settings2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Tour } from '@/stores/types'

interface TourDisplayItineraryTabProps {
  tour: Tour
}

export function TourDisplayItineraryTab({ tour }: TourDisplayItineraryTabProps) {
  const t = useTranslations('tour')
  const [copied, setCopied] = useState(false)

  const publicUrl = `/p/tour/${tour.code}`
  const fullUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}${publicUrl}` 
    : publicUrl

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopied(true)
      toast.success('已複製連結')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('複製失敗')
    }
  }

  const handleOpenPreview = () => {
    window.open(publicUrl, '_blank')
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">展示行程</h2>
          <p className="text-sm text-muted-foreground mt-1">
            對客展示用的精美行程頁面
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenPreview}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            開啟預覽
          </Button>
        </div>
      </div>

      {/* Share Link Card */}
      <div className="border rounded-xl p-6 bg-card">
        <div className="flex items-center gap-2 mb-4">
          <Share2 className="w-5 h-5 text-morandi-accent" />
          <h3 className="font-medium">分享連結</h3>
        </div>
        
        <p className="text-sm text-muted-foreground mb-4">
          複製連結分享給客戶，客戶即可查看精美的展示行程頁面
        </p>

        <div className="flex items-center gap-2">
          <div className="flex-1 px-3 py-2 bg-muted rounded-lg text-sm font-mono truncate">
            {fullUrl}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
          >
            {copied ? (
              <Check className="w-4 h-4 mr-2 text-green-500" />
            ) : (
              <Copy className="w-4 h-4 mr-2" />
            )}
            {copied ? '已複製' : '複製連結'}
          </Button>
        </div>
      </div>

      {/* Settings Card (Placeholder for Phase 2) */}
      <div className="border rounded-xl p-6 bg-card">
        <div className="flex items-center gap-2 mb-4">
          <Settings2 className="w-5 h-5 text-morandi-accent" />
          <h3 className="font-medium">展示設定</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">開啟報名功能</p>
              <p className="text-sm text-muted-foreground">讓客戶可以直接填寫報名資料</p>
            </div>
            <Button variant="outline" size="sm" disabled>
              即將推出
            </Button>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">一次性連結</p>
              <p className="text-sm text-muted-foreground">連結 72 小時後自動過期</p>
            </div>
            <Button variant="outline" size="sm" disabled>
              即將推出
            </Button>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="text-xs text-muted-foreground">
        目前的展示行程使用行程資料自動生成。<br />
        自訂編輯功能（拖曳、換圖、區塊調整）將在下一階段實作。
      </div>
    </div>
  )
}