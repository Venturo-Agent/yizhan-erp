'use client'

/**
 * SendAnnouncementDialog — 在 announcement 頻道內發送公告
 *
 * 權限：channels.manage capability（admin / 老闆）才能發
 *
 * v1：純文字 + 立即送出 / 排程時間（datepicker）
 * v2：撤回 / 修改 / pg_cron 真正延後發送（目前 scheduled_at 只當 metadata、實際立即送）
 */

import { useState } from 'react'
import { EntityFormDialog } from '@/components/shared/EntityFormDialog'
import { DatePicker } from '@/components/ui/date-picker'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { createChannelMessage } from '@/data'
import { useAuthStore } from '@/stores/auth-store'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  channelId: string
}

export function SendAnnouncementDialog({ open, onOpenChange, channelId }: Props) {
  const { user } = useAuthStore()
  const [body, setBody] = useState('')
  const [scheduledDate, setScheduledDate] = useState<string>('')
  const [scheduledTime, setScheduledTime] = useState<string>('')
  const [sending, setSending] = useState(false)

  const handleSubmit = async () => {
    const trimmed = body.trim()
    if (!trimmed) {
      toast.error('請輸入公告內容')
      return
    }
    if (!user?.id) {
      toast.error('未登入')
      return
    }

    let scheduledAt: string | null = null
    if (scheduledDate) {
      const time = scheduledTime || '09:00'
      scheduledAt = new Date(`${scheduledDate}T${time}:00`).toISOString()
      if (new Date(scheduledAt).getTime() < Date.now()) {
        toast.error('排程時間不能早於現在')
        return
      }
    }

    setSending(true)
    try {
      await createChannelMessage({
        channel_id: channelId,
        sender_employee_id: user.id,
        body: trimmed,
        message_type: 'text',
        scheduled_at: scheduledAt,
      } as never)
      toast.success(scheduledAt ? '公告已預排' : '公告已發送')
      setBody('')
      setScheduledDate('')
      setScheduledTime('')
      onOpenChange(false)
    } catch (err) {
      logger.error('發送公告失敗', err)
      toast.error('發送失敗、請再試一次')
    } finally {
      setSending(false)
    }
  }

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="發送公告"
      entity={null}
      onSubmit={handleSubmit}
      isSubmitting={sending}
      submitDisabled={!body.trim()}
      submitLabel={scheduledDate ? '預排公告' : '立即發送'}
      level={1}
      maxWidth="lg"
    >
      <div className="space-y-4 py-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-morandi-primary">公告內容</label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={6}
            placeholder="輸入公告內容、支援多行..."
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-morandi-gold resize-none"
            disabled={sending}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-morandi-primary">
            排程發送時間（選填、不選即立即發送）
          </label>
          <div className="flex items-center gap-2">
            <DatePicker
              value={scheduledDate}
              onChange={setScheduledDate}
              className="w-40"
            />
            <input
              type="time"
              value={scheduledTime}
              onChange={e => setScheduledTime(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-2 text-sm w-28 focus:outline-none focus:ring-1 focus:ring-morandi-gold"
              disabled={!scheduledDate}
            />
            {scheduledDate && (
              <button
                type="button"
                onClick={() => {
                  setScheduledDate('')
                  setScheduledTime('')
                }}
                className="text-xs text-morandi-secondary hover:text-morandi-primary"
              >
                清除排程
              </button>
            )}
          </div>
          <p className="text-xs text-morandi-muted">
            v1 排程僅記錄時間、訊息立即送出；v2 才會接 cron 真正延後
          </p>
        </div>
      </div>
    </EntityFormDialog>
  )
}
