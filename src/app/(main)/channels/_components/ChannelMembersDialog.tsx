'use client'

/**
 * ChannelMembersDialog — 看 + 加 + 移除頻道成員
 *
 * 拍板 Q5：邀請 = 直接 INSERT、不發機器人通知（簡化版方案 A）
 */

import { useMemo, useState } from 'react'
import { FormDialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { UserPlus, UserMinus, Loader2, Crown } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import {
  useChannelMembers,
  createChannelMember,
  deleteChannelMember,
  invalidateChannelMembers,
  useEmployeeDictionary,
  useEmployeesSlim,
} from '@/data'
import { useAuthStore } from '@/stores/auth-store'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  channelId: string
}

export function ChannelMembersDialog({ open, onOpenChange, channelId }: Props) {
  const { user } = useAuthStore()
  const { items: members } = useChannelMembers({ all: true, filter: { channel_id: channelId } })
  const { items: employees } = useEmployeesSlim({ all: true })
  const { get: getEmployee } = useEmployeeDictionary()

  const [adding, setAdding] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  const channelMembers = useMemo(
    () => (members ?? []).filter(m => m.channel_id === channelId),
    [members, channelId]
  )

  const myMember = useMemo(
    () => channelMembers.find(m => m.employee_id === user?.id),
    [channelMembers, user?.id]
  )

  const iAmOwner = myMember?.role === 'owner'

  const memberIds = useMemo(() => new Set(channelMembers.map(m => m.employee_id)), [channelMembers])

  const addOptions = useMemo(
    () =>
      (employees ?? [])
        .filter(e => !memberIds.has(e.id))
        .map(e => ({
          value: e.id,
          label: e.display_name || e.chinese_name || e.english_name || e.id,
        })),
    [employees, memberIds]
  )

  const handleAdd = async () => {
    if (!adding) return
    setSubmitting(true)
    try {
      await createChannelMember({
        channel_id: channelId,
        employee_id: adding,
        role: 'member',
      } as never)
      await invalidateChannelMembers()
      toast.success('已加入成員')
      setAdding('')
    } catch (err) {
      logger.error('加入成員失敗', err)
      toast.error('加入失敗')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemove = async (memberId: string) => {
    setSubmitting(true)
    try {
      await deleteChannelMember(memberId)
      await invalidateChannelMembers()
      toast.success('已移除')
    } catch (err) {
      logger.error('移除成員失敗', err)
      toast.error('移除失敗')
    } finally {
      setSubmitting(false)
    }
  }

  const footer = (
    <div className="flex items-center justify-end">
      <Button variant="soft-gold" onClick={() => onOpenChange(false)}>
        關閉
      </Button>
    </div>
  )

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="頻道成員"
      footer={footer}
      loading={submitting}
      level={2}
      maxWidth="md"
    >
      <div className="space-y-4 py-2">
        {iAmOwner && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-morandi-primary">加入成員</label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Combobox
                  options={addOptions}
                  value={adding}
                  onChange={setAdding}
                  placeholder={addOptions.length === 0 ? '沒有可加入的同事' : '選同事...'}
                />
              </div>
              <Button onClick={handleAdd} disabled={submitting || !adding} className="gap-1">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                加入
              </Button>
            </div>
            <p className="text-xs text-morandi-muted">
              邀請後對方直接加入、不會收到通知
            </p>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-morandi-primary">
            目前成員（{channelMembers.length} 位）
          </label>
          <ul className="rounded-md border border-border divide-y divide-border">
            {channelMembers.map(m => {
              const emp = getEmployee(m.employee_id)
              const display = emp?.display_name || emp?.chinese_name || emp?.english_name || m.employee_id
              const isMe = m.employee_id === user?.id
              const isOwner = m.role === 'owner'
              return (
                <li key={m.id} className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-morandi-primary">{display}</span>
                    {isOwner && (
                      <span className="inline-flex items-center gap-0.5 text-xs text-morandi-gold">
                        <Crown className="h-3 w-3" />
                        owner
                      </span>
                    )}
                    {isMe && <span className="text-xs text-morandi-muted">（你）</span>}
                  </div>
                  {iAmOwner && !isMe && (
                    <button
                      onClick={() => handleRemove(m.id)}
                      disabled={submitting}
                      className="text-morandi-muted hover:text-morandi-red"
                      title="移除"
                    >
                      <UserMinus className="h-4 w-4" />
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </FormDialog>
  )
}
