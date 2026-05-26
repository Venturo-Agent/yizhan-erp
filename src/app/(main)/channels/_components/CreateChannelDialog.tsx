'use client'

/**
 * CreateChannelDialog — 建頻道（blank / project / dm）
 *
 * 5/12 William 拍板：project 頻道也從這裡建、不再去 tour 詳情頁加按鈕。
 * - blank：填名字
 * - project：選 tour（限自己當 controller 的 tour）
 * - dm：選員工（員工 ↔ 員工 1on1）
 */

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { EntityFormDialog } from '@/components/shared/EntityFormDialog'
import { useAsyncSubmit } from '@/hooks/useAsyncSubmit'
import { Combobox } from '@/components/ui/combobox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import {
  createChannel,
  createChannelMember,
  invalidateChannels,
  invalidateChannelMembers,
  useEmployeesSlim,
  useToursSlim,
} from '@/data'
import { useAuthStore } from '@/stores/auth-store'
import type { ChannelType } from '@/types/channel.types'
import { useTourOptions } from '@/hooks'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateChannelDialog({ open, onOpenChange }: Props) {
  const router = useRouter()
  const { user } = useAuthStore()
  const [type, setType] = useState<ChannelType>('blank')
  const [name, setName] = useState('')
  const [tourId, setTourId] = useState<string>('')
  const [peerEmployeeId, setPeerEmployeeId] = useState<string>('')

  const { items: tours } = useToursSlim({ all: true })
  const { items: employees } = useEmployeesSlim({ all: true })

  // project 限自己當 controller 的 tour
  const myTours = useMemo(() => {
    if (!user?.id) return []
    return (tours ?? []).filter(
      t => (t as { controller_id?: string | null }).controller_id === user.id
    )
  }, [tours, user?.id])

  const tourOptions = useTourOptions(myTours)

  const peerOptions = useMemo(
    () =>
      (employees ?? [])
        .filter(e => e.id !== user?.id)
        .map(e => ({
          value: e.id,
          label: e.display_name || e.chinese_name || e.english_name || e.id,
        })),
    [employees, user?.id]
  )

  const { isSubmitting: submitting, execute: handleSubmit } = useAsyncSubmit(
    async () => {
      if (!user?.id) {
        toast.error('未登入')
        return
      }

      if (type === 'blank' && !name.trim()) {
        toast.error('請輸入頻道名稱')
        return
      }
      if (type === 'project' && !tourId) {
        toast.error('請選擇要綁的團')
        return
      }
      if (type === 'dm' && !peerEmployeeId) {
        toast.error('請選擇要私訊的同事')
        return
      }

      const tour = myTours.find(t => t.id === tourId)

      const payload: Record<string, unknown> = {
        type,
        // workspace_id 必須明確帶（channels entity 沒設 workspaceScoped、不會自動加）
        // 缺 workspace_id 會被 channels_insert RLS 擋
        workspace_id: user.workspace_id,
        created_by: user.id,
        is_system: false,
      }

      if (type === 'blank') {
        payload.name = name.trim()
      } else if (type === 'project') {
        payload.tour_id = tourId
        payload.name = tour?.name || tour?.code || '團專案'
      } else if (type === 'dm') {
        // DM channel.name 留 null、sidebar 對「我」動態算對方姓名
        // 避免「A 存對方名 → B 進來看到自己名」這種 bug
        payload.name = null
      }

      const newChannel = (await createChannel(payload as never)) as unknown as { id: string }

      // 建立成員（自己為 owner、DM 對方為 member）
      await createChannelMember({
        channel_id: newChannel.id,
        employee_id: user.id,
        role: 'owner',
      } as never)

      if (type === 'dm' && peerEmployeeId) {
        await createChannelMember({
          channel_id: newChannel.id,
          employee_id: peerEmployeeId,
          role: 'member',
        } as never)
      }

      await Promise.all([invalidateChannels(), invalidateChannelMembers()])
      toast.success('頻道已建立')
      onOpenChange(false)
      setName('')
      setTourId('')
      setPeerEmployeeId('')
      router.push(`/channels/${newChannel.id}`)
    },
    {
      onError: err => {
        logger.error('建頻道失敗', err)
        toast.error('建頻道失敗、請再試一次')
      },
    }
  )

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="頻道"
      entity={null}
      onSubmit={handleSubmit}
      isSubmitting={submitting}
      submitLabel="建立"
      level={1}
      maxWidth="md"
    >
      <div className="space-y-4 py-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-morandi-primary">頻道類型</label>
          <Select value={type} onValueChange={v => setType(v as ChannelType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="blank">空白群組（自由協作）</SelectItem>
              <SelectItem value="project">
                團專案頻道（綁某團、自己當 controller 才能建）
              </SelectItem>
              <SelectItem value="dm">私訊（員工 1on1）</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {type === 'blank' && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-morandi-primary">頻道名稱</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="例：業務組討論"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-morandi-gold"
              disabled={submitting}
            />
          </div>
        )}

        {type === 'project' && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-morandi-primary">
              綁哪個團（限自己當 controller）
            </label>
            <Combobox
              options={tourOptions}
              value={tourId}
              onChange={setTourId}
              placeholder={
                tourOptions.length === 0 ? '沒有可選的團（你還沒被指派為團控）' : '選團...'
              }
            />
          </div>
        )}

        {type === 'dm' && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-morandi-primary">私訊對象</label>
            <Combobox
              options={peerOptions}
              value={peerEmployeeId}
              onChange={setPeerEmployeeId}
              placeholder="選同事..."
            />
          </div>
        )}
      </div>
    </EntityFormDialog>
  )
}
