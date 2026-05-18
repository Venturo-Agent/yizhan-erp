'use client'

import useSWR from 'swr'
import { Users } from 'lucide-react'

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

function formatQuota(v: number | null) {
  return v == null ? '無限制' : `${v} 人`
}

function getEmployeeName(emp: QuotaLog['changed_by_employee']) {
  if (!emp) return '系統'
  return emp.display_name || emp.chinese_name || emp.english_name || emp.employee_number || '未知'
}

export function QuotaHistorySection({ workspaceId }: { workspaceId: string }) {
  const { data: logs = [], isLoading } = useSWR<QuotaLog[]>(
    `quota-logs-${workspaceId}`,
    async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}/employee-quota`)
      if (!res.ok) return []
      return res.json()
    },
    { revalidateOnFocus: false }
  )

  return (
    /* eslint-disable-next-line venturo/no-forbidden-classes */
    <div className="rounded-[24px] overflow-hidden bg-gradient-to-t from-white to-morandi-cream border-[3px] border-white shadow-[rgba(180,160,120,0.15)_0px_12px_24px_-8px]">
      <div className="px-6 py-4 border-b border-morandi-gold/20 flex items-center gap-2">
        <Users className="h-4 w-4 text-morandi-gold" />
        <h3 className="font-semibold text-morandi-primary">員工帳號配額紀錄</h3>
      </div>

      <div className="p-6">
        {isLoading && (
          <p className="text-sm text-morandi-secondary">載入中…</p>
        )}

        {!isLoading && logs.length === 0 && (
          <p className="text-sm text-morandi-secondary">尚無配額變更紀錄</p>
        )}

        {!isLoading && logs.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-morandi-border/30">
                  <th className="text-left pb-2 font-medium text-morandi-secondary w-[180px]">時間</th>
                  <th className="text-left pb-2 font-medium text-morandi-secondary w-[120px]">操作人</th>
                  <th className="text-left pb-2 font-medium text-morandi-secondary w-[100px]">變更前</th>
                  <th className="text-left pb-2 font-medium text-morandi-secondary w-[100px]">變更後</th>
                  <th className="text-left pb-2 font-medium text-morandi-secondary">備註</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} className="border-b border-morandi-border/10 last:border-0">
                    <td className="py-2.5 text-morandi-secondary font-mono text-xs">
                      {new Date(log.created_at).toLocaleString('zh-TW', {
                        year: 'numeric', month: '2-digit', day: '2-digit',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5 text-morandi-primary">
                      {getEmployeeName(log.changed_by_employee)}
                    </td>
                    <td className="py-2.5 text-morandi-secondary">
                      {formatQuota(log.old_quota)}
                    </td>
                    <td className="py-2.5 font-semibold text-morandi-primary">
                      {formatQuota(log.new_quota)}
                    </td>
                    <td className="py-2.5 text-morandi-secondary">
                      {log.reason ?? '—'}
                    </td>
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
