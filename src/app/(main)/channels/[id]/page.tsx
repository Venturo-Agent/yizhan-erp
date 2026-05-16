'use client'

/**
 * /channels/[id] — 單一頻道訊息頁
 */

import { useParams } from 'next/navigation'
import { ChannelView } from '../_components/ChannelView'

export default function ChannelPage() {
  const params = useParams<{ id: string }>()
  if (!params?.id) return null
  return <ChannelView channelId={params.id} />
}
