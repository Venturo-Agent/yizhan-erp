'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Users } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { apiMutate } from '@/lib/swr/api-mutate'
import { logger } from '@/lib/utils/logger'

interface QuotaLog {
  id: string
  old_quota: number | null
  new_quota: number | null
  reason: string | null
  created_at: string
  changed_by_employee: {
    id: string
    display_name: string | null
    chinese_name: string | null
    english_name: string | null
    employee_number: string | null
  } | null
}

interface QuotaResponse {
  max_employees: number | null
  employee_count: number
  logs: QuotaLog[]
}

function formatQuota(v: number | null) {
  return v == null ? '無限制' : `${v} 人`
}

function getEmployeeName(emp: QuotaLog['changed_by_employee']) {
  if (!emp) return '系統'
  return emp.display_name || emp.chinese_name || emp.english_name || emp.employee_number || '未知'
}

const EMPTY: QuotaResponse = { max_employees: null, employee_count: 0, logs: [] }

export function QuotaHistorySection({ workspaceId }: { workspaceId: string }) {
  const swrKey = `quota-logs-${workspaceId}`
  const {
    data = EMPTY,
    isLoading,
    mutate,
  } = useSWR<QuotaResponse>(
    swrKey,
    async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}/employee-quota`)
      if (!res.ok) return EMPTY
      return res.json()
    },
    { revalidateOnFocus: false }
  )

  const { max_employees: currentQuota, employee_count: employeeCount, logs } = data

  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)

  const startEdit = () => {
    setValue(currentQuota != null ? String(currentQuota) : '')
    setEditing(true)
  }

  const handleSave = async () => {
    const trimmed = value.trim()
    const newQuota = trimmed === '' ? null : parseInt(trimmed, 10)
    if (newQuota != null && (Number.isNaN(newQuota) || newQuota < 1)) {
      toast.error('員工上限需為正整數、或留空代表無限制')
      return
    }
    if (newQuota != null && newQuota < employeeCount) {
      toast.error(`上限不可低於目前在職人數（${employeeCount} 人）`)
      return
    }
    setSaving(true)
    try {
      const res = await apiMutate<{ error?: string }>(
        `/api/workspaces/${workspaceId}/employee-quota`,
        { method: 'PATCH', body: { max_employees: newQuota } }
      )
      if (!res.ok) throw new Error(res.data?.error || '員工上限更新失敗')
      toast.success('員工上限已更新')
      setEditing(false)
      await mutate()
    } catch (e) {
      logger.error('[QuotaHistory] update failed:', e)
      toast.error(e instanceof Error ? e.message : '更新失敗')
    } finally {
      setSaving(false)
    }
  }

  return (
    /* eslint-disable-next-line venturo/no-forbidden-classes */
    <div className="rounded-[24px] overflow-hidden bg-gradient-to-t from-white to-morandi-cream border-[3px] border-white shadow-[rgba(180,160,120,0.15)_0px_12px_24px_-8px]">
      <div className="px-6 py-4 border-b border-morandi-gold/20 flex items-center gap-2">
        <Users className="h-4 w-4 text-morandi-gold" />
        <h3 className="font-semibold text-morandi-primary">員工帳號配額</h3>
      </div>

      {/* ── 目前上限 + 編輯 ── */}
      <div className="px-6 py-4 border-b border-morandi-gold/10 flex items-center justify-between gap-4">
        <div className="text-sm">
          <span className="text-morandi-secondary">目前在職 </span>
          <span className="font-semibold text-morandi-primary">{employeeCount} 人</span>
          <span className="text-morandi-secondary"> / 上限 </span>
          <span className="font-semibold text-morandi-primary">{formatQuota(currentQuota)}</span>
        </div>
        {editing ? (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="1"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="留空 = 無限制"
              className="w-[140px]"
              disabled={saving}
            />
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? '儲存中…' : '儲存'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
              取消
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={startEdit} disabled={isLoading}>
            修改上限
          </Button>
        )}
      </div>

      <div className="p-6">
        {isLoading && <p className="text-sm text-morandi-secondary">載入中…</p>}

        {!isLoading && logs.length === 0 && (
          <p className="text-sm text-morandi-secondary">尚無配額變更紀錄</p>
        )}

        {!isLoading && logs.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-morandi-border/30">
                  <th className="text-left pb-2 font-medium text-morandi-secondary w-[180px]">
                    時間
                  </th>
                  <th className="text-left pb-2 font-medium text-morandi-secondary w-[120px]">
                    操作人
                  </th>
                  <th className="text-left pb-2 font-medium text-morandi-secondary w-[100px]">
                    變更前
                  </th>
                  <th className="text-left pb-2 font-medium text-morandi-secondary w-[100px]">
                    變更後
                  </th>
                  <th className="text-left pb-2 font-medium text-morandi-secondary">備註</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} className="border-b border-morandi-border/10 last:border-0">
                    <td className="py-2.5 text-morandi-secondary font-mono text-xs">
                      {new Date(log.created_at).toLocaleString('zh-TW', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5 text-morandi-primary">
                      {getEmployeeName(log.changed_by_employee)}
                    </td>
                    <td className="py-2.5 text-morandi-secondary">{formatQuota(log.old_quota)}</td>
                    <td className="py-2.5 font-semibold text-morandi-primary">
                      {formatQuota(log.new_quota)}
                    </td>
                    <td className="py-2.5 text-morandi-secondary">{log.reason ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
