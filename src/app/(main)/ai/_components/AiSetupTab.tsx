'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Bot, Facebook, Instagram } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LineSetup } from './setup/LineSetup'
import { FacebookSetup } from './setup/FacebookSetup'
import { InstagramSetup } from './setup/InstagramSetup'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

type Channel = 'line' | 'facebook' | 'instagram'

const CHANNELS: { value: Channel; label: string; icon: typeof Bot; brand: string; disabled?: boolean }[] = [
  { value: 'line', label: 'LINE', icon: Bot, brand: 'text-[#06c755]' },
  { value: 'facebook', label: 'Facebook', icon: Facebook, brand: 'text-[#1877f2]', disabled: true },
  { value: 'instagram', label: 'Instagram', icon: Instagram, brand: 'text-[#e4405f]', disabled: true },
]

const VALID = new Set<Channel>(['line', 'facebook', 'instagram'])

export function AiSetupTab() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const raw = searchParams.get('channel') ?? 'line'
  const active: Channel = VALID.has(raw as Channel) ? (raw as Channel) : 'line'

  const handleSwitch = (next: Channel, disabled?: boolean) => {
    if (disabled) return
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
            <Tooltip key={c.value}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleSwitch(c.value, c.disabled)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                    isActive
                      ? 'bg-white text-morandi-primary shadow-sm border border-morandi-muted/20'
                      : c.disabled
                      ? 'text-morandi-muted cursor-not-allowed opacity-60'
                      : 'text-morandi-secondary hover:text-morandi-primary hover:bg-white/50'
                  )}
                >
                  <Icon className={cn('w-4 h-4', isActive ? c.brand : '')} strokeWidth={1.5} />
                  {c.label}
                </button>
              </TooltipTrigger>
              {c.disabled ? (
                <TooltipContent>
                  <p>AI 整合中，敬請期待</p>
                </TooltipContent>
              ) : null}
            </Tooltip>
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
