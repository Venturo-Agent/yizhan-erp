'use client'

/**
 * /channels — 頻道首頁
 *
 * 5/13 William 拍板：進來預設導向第一個官方公告頻道、不要 placeholder「請選頻道」。
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useChannels } from '@/data'

export default function ChannelsPage() {
  const router = useRouter()
  const { items: channels, loading } = useChannels({ all: true })

  useEffect(() => {
    if (loading) return
    const list = channels ?? []
    if (list.length === 0) return

    // 優先順序：第一個官方 announcement → 任一 official → 任一 channel
    const target =
      list.find(c => c.is_official && c.type === 'announcement' && !c.is_archived) ||
      list.find(c => c.is_official && !c.is_archived) ||
      list.find(c => !c.is_archived)

    if (target) {
      router.replace(`/channels/${target.id}`)
    }
  }, [channels, loading, router])

  return (
    <div className="flex-1 flex items-center justify-center">
      <Loader2 className="h-4 w-4 animate-spin text-morandi-muted" />
    </div>
  )
}
