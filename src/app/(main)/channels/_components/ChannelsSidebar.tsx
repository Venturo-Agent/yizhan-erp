'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Megaphone,
  Bell,
  Bot,
  MessagesSquare,
  Hash,
  Briefcase,
  Loader2,
  Pin,
  Users,
  Plus,
} from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { cn } from '@/lib/utils'
import { useWorkspaceFeatures } from '@/lib/permissions'
import {
  useChannels,
  useChannelMembers,
  useEmployeeDictionary,
  useEmployeesSlim,
  useAiAgentsSlim,
  invalidateChannels,
  invalidateChannelMembers,
} from '@/data'
import { apiPost } from '@/lib/api/client'
import { useAuthStore } from '@/stores/auth-store'
import type { Channel } from '@/types/channel.types'

/**
 * 5/13 William 拍板（v2）：扁平結構、3 section
 *
 * 1. 📌 官方頻道（is_official=true）— 扁平、每 channel 一行、icon 表類型
 *    - 📢 announcement / 🤖 bot / 🔔 system_notice
 *
 * 2. 💬 私訊（type=dm）
 *
 * 3. 📦 專案 & 群組（type IN [project, blank]）— icon 區分綁團與否
 */

const OFFICIAL_ICON: Record<'announcement' | 'bot' | 'system_notice', typeof Megaphone> = {
  announcement: Megaphone,
  bot: Bot,
  system_notice: Bell,
}

const OFFICIAL_TYPE_ORDER: Array<'announcement' | 'bot' | 'system_notice'> = [
  'announcement',
  'bot',
  'system_notice',
]

interface Props {
  activeChannelId?: string
  onCreateChannel?: () => void
}

export function ChannelsSidebar({ activeChannelId, onCreateChannel }: Props) {
  const router = useRouter()
  const { user } = useAuthStore()
  const { items: channels, loading } = useChannels({ all: true })
  const { items: members } = useChannelMembers({ all: true })
  const { items: allEmployees } = useEmployeesSlim({ all: true })
  const { get: getEmployee } = useEmployeeDictionary()
  const { items: aiAgents } = useAiAgentsSlim()
  const { isFeatureEnabled } = useWorkspaceFeatures()
  const happyEnabled = isFeatureEnabled('channels.happy')
  const [openingDm, setOpeningDm] = useState<string | null>(null)

  // 同事清單（合併「同事 + 私訊」成單一「私訊」section）：
  //   當前 workspace active human、排除自己、排除 bot / system_bot / integration
  //   有 DM channel 的 → 點擊跳該 channel + 顯示未讀
  //   沒 DM channel 的 → 點擊建 DM + 跳
  const coworkers = useMemo(() => {
    if (!user?.workspace_id) return []
    return (allEmployees ?? []).filter(
      e =>
        e.workspace_id === user.workspace_id &&
        e.status === 'active' &&
        e.id !== user.id &&
        // 排除所有 bot 類員工（LINE Bot 系統 / 系統 bot / 第三方整合）
        (e as { employee_type?: string }).employee_type !== 'bot' &&
        (e as { employee_type?: string }).employee_type !== 'system_bot' &&
        (e as { employee_type?: string }).employee_type !== 'integration'
    )
  }, [allEmployees, user?.workspace_id, user?.id])

  // peer employee id → 既有 DM channel（沒有就是 null、點擊時才建）
  const dmChannelByPeer = useMemo(() => {
    const map = new Map<string, Channel>()
    if (!user?.id) return map
    const myDmChannelIds = (members ?? [])
      .filter(m => m.employee_id === user.id)
      .map(m => m.channel_id)
    for (const m of members ?? []) {
      if (m.employee_id === user.id) continue
      if (!myDmChannelIds.includes(m.channel_id)) continue
      const ch = (channels ?? []).find(c => c.id === m.channel_id)
      if (!ch || ch.type !== 'dm' || ch.is_archived || ch.agent_id) continue
      map.set(m.employee_id, ch)
    }
    return map
  }, [members, channels, user?.id])

  // 找 / 建跟某員工的 DM channel、然後跳轉
  // 走 API（不走 client supabase）— channels_insert RLS 有詭異互動、API 用 admin client 繞、安全等價
  const openDmWith = async (peerEmployeeId: string) => {
    if (!user?.id || openingDm) return
    setOpeningDm(peerEmployeeId)
    try {
      const res = await apiPost<{ channel_id: string; created: boolean }>('/api/channels/dm', {
        peer_employee_id: peerEmployeeId,
      })
      if (res.created) {
        // 先 invalidate members（對方 row 進 cache）、再 invalidate channels（新 channel 出現時對方已可解析）
        // 並行 Promise.all 會 race、新 channel 先到 → resolveDmDisplayName fallback 為「私訊」flash
        await invalidateChannelMembers()
        await invalidateChannels()
      }
      router.push(`/channels/${res.channel_id}`)
    } catch (err) {
      logger.error('開私訊失敗', err)
      toast.error('開私訊失敗、再試一次')
    } finally {
      setOpeningDm(null)
    }
  }

  const resolveDmDisplayName = (channel: Channel): string => {
    if (channel.agent_id) {
      const agent = (aiAgents ?? []).find(a => a.id === channel.agent_id)
      return agent?.name || '私訊'
    }
    if (channel.name) return channel.name
    if (!user?.id) return '私訊'
    const peer = (members ?? []).find(
      m => m.channel_id === channel.id && m.employee_id !== user.id
    )
    if (!peer) return '私訊'
    const emp = getEmployee(peer.employee_id)
    return emp?.display_name || emp?.chinese_name || emp?.english_name || '私訊'
  }

  const isUnread = (channel: Channel): boolean => {
    if (!user?.id) return false
    const myMember = (members ?? []).find(
      m => m.channel_id === channel.id && m.employee_id === user.id
    )
    if (!myMember) return false
    // Phase A.8 修：last_read_at 為 null 時 fallback joined_at 當基準。
    // 之前邏輯「沒讀過 → 永遠不顯紅點」是 bug、新員工 / 沒進過該 channel 的人即使收新訊息也看不到紅點。
    // 新邏輯：channel.updated_at > (last_read_at ?? joined_at) 才算未讀。
    // - 新訊息 trigger touch updated_at → updated_at 超過 baseline → 顯紅點
    // - 進入頻道 ChannelView 寫 last_read_at = now() → 之後 updated_at 不再超過、紅點消
    // - 罕見 migration 改 channel 觸發 updated_at 變動 → 用戶看到紅點、點進去 last_read_at 寫進 DB → 恢復
    const baseline = myMember.last_read_at ?? myMember.joined_at
    return new Date(channel.updated_at).getTime() > new Date(baseline).getTime()
  }

  // 三 section 分組（官方扁平、不再分子標題）
  const sections = useMemo(() => {
    const officialFlat: Channel[] = []
    const dms: Channel[] = []
    const projectsAndGroups: Channel[] = []

    for (const c of channels ?? []) {
      if (c.is_archived) continue

      if (c.is_official) {
        // 機器人頻道（HAPPY）守租戶 feature gate：沒開 channels.happy 不顯示
        if (c.type === 'bot' && !happyEnabled) continue
        if (c.type === 'announcement' || c.type === 'bot' || c.type === 'system_notice') {
          officialFlat.push(c)
        }
        continue
      }

      if (c.type === 'dm') {
        // 過濾 race：channels 已到 / members 還沒到 → 不顯示「無法解析對方」的 DM
        // 等 members cache 更新後該 channel 才出現、避免 flash「私訊」未命名
        const hasPeer = (members ?? []).some(
          m => m.channel_id === c.id && m.employee_id !== user?.id
        )
        if (hasPeer) dms.push(c)
      } else if (c.type === 'project' || c.type === 'blank') {
        projectsAndGroups.push(c)
      }
    }

    // 官方排序：announcement → bot → system_notice、再按 created_at
    officialFlat.sort((a, b) => {
      const ai = OFFICIAL_TYPE_ORDER.indexOf(a.type as 'announcement' | 'bot' | 'system_notice')
      const bi = OFFICIAL_TYPE_ORDER.indexOf(b.type as 'announcement' | 'bot' | 'system_notice')
      if (ai !== bi) return ai - bi
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })

    return { officialFlat, dms, projectsAndGroups }
  }, [channels, happyEnabled])

  const renderChannelItem = (
    channel: Channel,
    displayOverride: string,
    IconCmp: typeof Megaphone
  ) => {
    const unread = isUnread(channel) && activeChannelId !== channel.id
    return (
      <li key={channel.id}>
        <Link
          href={`/channels/${channel.id}`}
          className={cn(
            'flex items-center gap-2 px-4 py-1.5 text-sm hover:bg-morandi-gold-light transition-colors',
            activeChannelId === channel.id
              ? 'bg-morandi-gold-light text-morandi-primary font-medium'
              : unread
                ? 'text-morandi-primary font-medium'
                : 'text-morandi-secondary'
          )}
        >
          <IconCmp className="h-3.5 w-3.5 shrink-0 opacity-70" />
          <span className="flex-1 truncate">{displayOverride}</span>
          {unread && <span className="ml-auto h-2 w-2 rounded-full bg-morandi-gold shrink-0" />}
        </Link>
      </li>
    )
  }

  return (
    <aside className="w-72 shrink-0 border-r border-border bg-card flex flex-col">
      {/* Sidebar header — 取代主標題區、放「頻道」label + 新增按鈕 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <MessagesSquare className="h-4 w-4 text-morandi-gold" />
          <h2 className="text-sm font-semibold text-morandi-primary">頻道</h2>
        </div>
        {onCreateChannel && (
          <button
            type="button"
            onClick={onCreateChannel}
            className="p-1 rounded hover:bg-morandi-gold-light text-morandi-secondary hover:text-morandi-primary transition-colors"
            title="新增頻道"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-morandi-muted" />
          </div>
        )}

        {!loading && (
          <>
            {/* Section 1: 官方頻道（置頂 Pin、扁平列表、每 channel 自帶 type icon） */}
            {sections.officialFlat.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-1.5 px-4 py-1 text-[0.647rem] text-morandi-muted uppercase tracking-wide">
                  <Pin className="h-3 w-3 text-morandi-gold" />
                  置頂
                </div>
                <ul>
                  {sections.officialFlat.map(c => {
                    const Icon = OFFICIAL_ICON[c.type as 'announcement' | 'bot' | 'system_notice']
                    const display =
                      c.type === 'bot' && c.agent_id
                        ? (aiAgents ?? []).find(a => a.id === c.agent_id)?.name || c.name || 'HAPPY'
                        : c.name ?? '未命名'
                    return renderChannelItem(c, display, Icon)
                  })}
                </ul>
              </div>
            )}

            {/* Section 2: 私訊（同事 + 既有 DM 合併、點頭像 = 開 DM）*/}
            {coworkers.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-1.5 px-4 py-1 text-[0.647rem] text-morandi-muted uppercase tracking-wide">
                  <MessagesSquare className="h-3 w-3" />
                  私訊
                </div>
                <ul>
                  {coworkers.map(emp => {
                    const display = emp.display_name || emp.chinese_name || emp.english_name || '未命名'
                    const avatarUrl = (emp as { avatar_url?: string | null }).avatar_url ?? null
                    const initial = display[0] ?? '?'
                    const isOpening = openingDm === emp.id
                    const existingDm = dmChannelByPeer.get(emp.id)
                    const unread = existingDm ? isUnread(existingDm) : false
                    const isActive = existingDm?.id === activeChannelId

                    // 既有 DM channel → 直接 Link 跳該 channel
                    // 沒 DM channel → button 點擊時建 DM 再跳
                    const handleClick = () => {
                      if (existingDm) {
                        router.push(`/channels/${existingDm.id}`)
                      } else {
                        void openDmWith(emp.id)
                      }
                    }

                    return (
                      <li key={emp.id}>
                        <button
                          type="button"
                          onClick={handleClick}
                          disabled={isOpening}
                          className={cn(
                            'w-full flex items-center gap-2 px-4 py-1.5 text-sm hover:bg-morandi-gold-light transition-colors',
                            isActive
                              ? 'bg-morandi-gold-light text-morandi-primary font-medium'
                              : unread
                                ? 'text-morandi-primary font-medium'
                                : 'text-morandi-secondary',
                            isOpening && 'opacity-60 cursor-wait'
                          )}
                        >
                          {/* 頭像 20×20 圓形、無頭像顯首字 */}
                          <div className="shrink-0 w-5 h-5 rounded-full bg-morandi-gold/20 overflow-hidden flex items-center justify-center text-[0.588rem] font-medium text-morandi-gold">
                            {avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={avatarUrl} alt={display} className="w-full h-full object-cover" />
                            ) : (
                              <span>{initial}</span>
                            )}
                          </div>
                          <span className="flex-1 text-left truncate">{display}</span>
                          {isOpening && <Loader2 className="h-3 w-3 animate-spin" />}
                          {unread && (
                            <span className="ml-auto h-2 w-2 rounded-full bg-morandi-gold shrink-0" />
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            {/* Section 3: 專案 & 群組 */}
            {sections.projectsAndGroups.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-1.5 px-4 py-1 text-[0.647rem] text-morandi-muted uppercase tracking-wide">
                  <Hash className="h-3 w-3" />
                  專案 & 群組
                </div>
                <ul>
                  {sections.projectsAndGroups.map(c => {
                    const hasTour = !!c.tour_id
                    return renderChannelItem(c, c.name ?? '未命名', hasTour ? Briefcase : Hash)
                  })}
                </ul>
              </div>
            )}

            {(channels ?? []).length === 0 && (
              <div className="px-4 py-6 text-center">
                <p className="text-xs text-morandi-muted">尚未加入任何頻道</p>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  )
}
