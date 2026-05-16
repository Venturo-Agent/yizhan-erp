'use client'

/**
 * AI Hub - Setup tab
 *
 * 三通路機器人開通嚮導（合併原 /bot/setup + /bot/facebook-setup + /bot/instagram-setup）。
 *
 * 內部 sub-tab 切 LINE / FB / IG、各自的 5-step wizard 不動（移植自原 page.tsx）。
 *
 * URL pattern：/ai?tab=setup&channel=line|facebook|instagram
 *   - 預設 line（既有客戶最多）
 *   - 切 sub-tab 改 search param、可分享 URL
 *
 * 5/14 William 拍板：/bot 全部整合進 AI Hub、setup 是其中一個 tab
 */

import { useSearchParams, useRouter } from 'next/navigation'
import { Bot, Facebook, Instagram } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LineSetup } from './setup/LineSetup'
import { FacebookSetup } from './setup/FacebookSetup'
import { InstagramSetup } from './setup/InstagramSetup'

type Channel = 'line' | 'facebook' | 'instagram'

const CHANNELS: { value: Channel; label: string; icon: typeof Bot; brand: string }[] = [
  { value: 'line', label: 'LINE', icon: Bot, brand: 'text-[#06c755]' },
  { value: 'facebook', label: 'Facebook', icon: Facebook, brand: 'text-[#1877f2]' },
  { value: 'instagram', label: 'Instagram', icon: Instagram, brand: 'text-[#e4405f]' },
]

const VALID = new Set<Channel>(['line', 'facebook', 'instagram'])

export function AiSetupTab() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const raw = searchParams.get('channel') ?? 'line'
  const active: Channel = VALID.has(raw as Channel) ? (raw as Channel) : 'line'

  const handleSwitch = (next: Channel) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('channel', next)
    router.replace(`/ai?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sub-tab 切三通路 */}
      <div className="shrink-0 flex items-center gap-2 px-6 py-3 border-b border-morandi-muted/20 bg-morandi-container/20">
        <span className="text-xs font-medium text-morandi-muted mr-2">通路：</span>
        {CHANNELS.map((c) => {
          const isActive = active === c.value
          const Icon = c.icon
          return (
            <button
              key={c.value}
              onClick={() => handleSwitch(c.value)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                isActive
                  ? 'bg-white text-morandi-primary shadow-sm border border-morandi-muted/20'
                  : 'text-morandi-secondary hover:text-morandi-primary hover:bg-white/50'
              )}
            >
              <Icon className={cn('w-4 h-4', isActive ? c.brand : '')} strokeWidth={1.5} />
              {c.label}
            </button>
          )
        })}
      </div>

      {/* Wizard 內容 */}
      <div className="flex-1 min-h-0 overflow-auto">
        {active === 'line' && <LineSetup />}
        {active === 'facebook' && <FacebookSetup />}
        {active === 'instagram' && <InstagramSetup />}
      </div>
    </div>
  )
}
