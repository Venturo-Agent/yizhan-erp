'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { alert as showAlert } from '@/lib/ui/alert-dialog'
import { apiMutate } from '@/lib/swr/api-mutate'
import { Users, CheckSquare } from 'lucide-react'
import { QuotaHistorySection } from './QuotaHistorySection'

// ─── 功能開關清單（純選配、不分版本套餐）────────────────────────────────────────
// William 2026-05-30：拆掉「輕量/標準/進階/旗艦」版本套餐、改成每個功能各自獨立開關、
// 誰要誰自己勾、新分店預設全關。tab 級 code 格式為 `{module}.{tab}`。
interface FeatureToggle {
  code: string
  name: string
  note?: string
  kind: 'module' | 'tab'
}

// 核心業務功能
const CORE_FEATURES: FeatureToggle[] = [
  { code: 'tours', name: '旅遊團（含報價單）', kind: 'module' },
  { code: 'orders', name: '訂單管理', kind: 'module' },
  { code: 'finance', name: '財務系統', kind: 'module' },
  { code: 'database.customers', name: '顧客管理', kind: 'tab' },
  { code: 'accounting', name: '會計系統', kind: 'module' },
  { code: 'hr_salary_settlement', name: '薪資結算', kind: 'module' },
  { code: 'hr_bonus_settlement', name: '獎金結算', kind: 'module' },
]

// 加值 / 可選功能
const ADDON_FEATURES: FeatureToggle[] = [
  { code: 'calendar', name: '行事曆', kind: 'module' },
  { code: 'todos', name: '待辦事項', kind: 'module' },
  { code: 'channels', name: '溝通頻道', kind: 'module' },
  { code: 'channels.happy', name: 'HAPPY 機器人', kind: 'tab' },
  { code: 'ai_hub', name: 'AI Hub', kind: 'module' },
  { code: 'esim', name: 'eSIM 管理', note: '開發中', kind: 'module' },
  { code: 'documents', name: '文件中心', kind: 'module' },
  { code: 'tours.contract', name: '電子合約系統', kind: 'tab' },
  { code: 'tours.display-itinerary', name: '展示行程', kind: 'tab' },
  { code: 'hr.severance', name: '資遣試算', kind: 'tab' },
]

// ─── Props ───────────────────────────────────────────────────────────────────

interface Workspace {
  id: string
  name: string
  code: string
  type: string
  is_active: boolean
  premium_enabled?: boolean
  admin_id?: string | null
}

interface WorkspaceFeature {
  feature_code: string
  enabled: boolean
}

interface OverviewTabProps {
  workspace: Workspace
  workspaceId: string
  features: WorkspaceFeature[]
  employeeCount: number
  adminName: string | null
  leavePolicy: 'calendar_year' | 'hire_anniversary'
  pensionSystem: 'old' | 'new' | 'mixed'
  savingHrPolicy: boolean
  onToggleFeature: (featureCode: string) => void
  onToggleTabFeature: (moduleCode: string, tabCode: string, nextEnabled: boolean) => void
  onSetLeavePolicy: (val: 'calendar_year' | 'hire_anniversary') => void
  onSetPensionSystem: (val: 'old' | 'new' | 'mixed') => void
  onSaveHrPolicy: () => void
}

// ─── Component ───────────────────────────────────────────────────────────────

export function OverviewTab({
  workspace,
  workspaceId,
  features,
  employeeCount,
  adminName,
  leavePolicy,
  pensionSystem,
  savingHrPolicy,
  onToggleFeature,
  onToggleTabFeature,
  onSetLeavePolicy,
  onSetPensionSystem,
  onSaveHrPolicy,
}: OverviewTabProps) {
  // 判定某功能是否啟用（module + tab 統一查 features、無記錄＝關）
  const isFeatureOn = (code: string) =>
    features.find(f => f.feature_code === code)?.enabled ?? false

  // 切換某功能（依 module / tab 走對應 handler）
  const handleToggle = (f: FeatureToggle, next: boolean) => {
    if (f.kind === 'tab') {
      const [mod, ...rest] = f.code.split('.')
      onToggleTabFeature(mod, rest.join('.'), next)
    } else {
      onToggleFeature(f.code)
    }
  }

  // 單一功能開關卡
  const renderToggle = (f: FeatureToggle) => (
    // eslint-disable-next-line venturo/no-forbidden-classes
    <div
      key={f.code}
      className="flex items-center justify-between gap-2 px-3 py-2 rounded-[12px] bg-gradient-to-t from-morandi-cream-soft to-morandi-cream-warm shadow-[rgba(180,160,120,0.15)_0px_4px_12px_-4px]"
    >
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-xs font-medium text-morandi-primary truncate">{f.name}</span>
        {f.note && <span className="text-[10px] text-morandi-secondary">{f.note}</span>}
      </div>
      <Switch checked={isFeatureOn(f.code)} onCheckedChange={next => handleToggle(f, next)} />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* ── 功能開關 ── */}
      {/* eslint-disable-next-line venturo/no-forbidden-classes */}
      <div className="rounded-[24px] overflow-hidden bg-gradient-to-t from-white to-morandi-cream border-[3px] border-white shadow-[rgba(180,160,120,0.15)_0px_12px_24px_-8px]">
        <div className="px-6 py-4 border-b border-morandi-gold/20 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-morandi-gold" />
          <h3 className="font-semibold text-morandi-primary">功能開關</h3>
          <span className="text-sm text-morandi-secondary">逐項開關、改完點上方「儲存」生效</span>
        </div>

        <div className="p-6 space-y-5">
          {/* 核心業務 */}
          <div>
            <p className="text-xs text-morandi-secondary mb-2">核心業務</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {CORE_FEATURES.map(renderToggle)}
            </div>
          </div>

          {/* 加值功能 */}
          <div>
            <p className="text-xs text-morandi-secondary mb-2">加值功能</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {ADDON_FEATURES.map(renderToggle)}
            </div>
          </div>
        </div>
      </div>

      {/* ── 租戶資訊 ── */}
      {/* eslint-disable-next-line venturo/no-forbidden-classes */}
      <div className="rounded-[24px] p-6 bg-gradient-to-t from-white to-morandi-cream border-[3px] border-white shadow-[rgba(180,160,120,0.15)_0px_12px_24px_-8px]">
        <div className="grid grid-cols-3 gap-6">
          <div>
            <div className="text-sm text-morandi-secondary mb-1">公司名稱</div>
            <div className="font-semibold text-morandi-primary">{workspace.name}</div>
          </div>
          <div>
            <div className="text-sm text-morandi-secondary mb-1">公司代碼</div>
            <div className="font-semibold text-morandi-primary">{workspace.code}</div>
          </div>
          <div>
            <div className="text-sm text-morandi-secondary mb-1">狀態</div>
            <Badge
              className={
                workspace.is_active
                  ? 'bg-status-success/20 text-status-success'
                  : 'bg-morandi-secondary/20 text-morandi-secondary'
              }
            >
              {workspace.is_active ? '啟用中' : '已停用'}
            </Badge>
          </div>
        </div>
      </div>

      {/* ── 系統主管 ── */}
      {/* eslint-disable-next-line venturo/no-forbidden-classes */}
      <div className="rounded-[24px] p-6 bg-gradient-to-t from-white to-morandi-cream border-[3px] border-white shadow-[rgba(180,160,120,0.15)_0px_12px_24px_-8px]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-morandi-gold" />
            <h3 className="font-semibold text-morandi-primary">系統主管資訊</h3>
          </div>
          <span className="text-sm text-morandi-secondary">{employeeCount} 位員工</span>
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <div className="text-sm text-morandi-secondary mb-1">系統主管</div>
            <div className="font-semibold text-morandi-primary">{adminName || '未指定'}</div>
          </div>
          <div>
            <div className="text-sm text-morandi-secondary mb-1">帳號</div>
            <div className="font-semibold text-morandi-primary">{workspace.code}-E001</div>
          </div>
          <div className="flex items-end">
            <Button
              variant="soft-gold"
              size="sm"
              className="border-morandi-gold text-morandi-gold hover:bg-morandi-gold/10"
              onClick={async () => {
                if (!workspace.admin_id) {
                  await showAlert('找不到此租戶的負責人', 'error')
                  return
                }
                const defaultPw = '12345678'
                try {
                  const res = await apiMutate<{ error?: string; message?: string }>(
                    '/api/auth/reset-employee-password',
                    {
                      method: 'POST',
                      body: { employee_id: workspace.admin_id, new_password: defaultPw },
                    }
                  )
                  if (!res.ok) {
                    await showAlert(res.data?.error || res.error || '重設失敗', 'error')
                    return
                  }
                  await showAlert(
                    `已重設系統主管「${adminName || ''}」的密碼為\n\n${defaultPw}\n\n請通知該系統主管使用此密碼登入、並盡快修改。`,
                    'success'
                  )
                } catch {
                  await showAlert('重設失敗、請稍後再試', 'error')
                }
              }}
            >
              重設密碼
            </Button>
          </div>
        </div>
      </div>

      {/* ── 員工帳號配額紀錄 ── */}
      <QuotaHistorySection workspaceId={workspaceId} />

      {/* ── HR 政策 ── */}
      {/* eslint-disable-next-line venturo/no-forbidden-classes */}
      <div className="rounded-[24px] overflow-hidden bg-gradient-to-t from-white to-morandi-cream border-[3px] border-white shadow-[rgba(180,160,120,0.15)_0px_12px_24px_-8px]">
        <div className="px-6 py-4 border-b border-morandi-gold/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-morandi-gold" />
            <h3 className="font-semibold text-morandi-primary">HR 政策</h3>
            <span className="text-sm text-morandi-secondary">特休 / 資遣費 計算依此設定</span>
          </div>
          <Button
            variant="morandi-gold"
            size="sm"
            disabled={savingHrPolicy}
            onClick={onSaveHrPolicy}
            className="border-morandi-gold text-morandi-gold hover:bg-morandi-gold/10"
          >
            <CheckSquare size="1em" />
            {savingHrPolicy ? '儲存中...' : '儲存 HR 政策'}
          </Button>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm text-morandi-secondary block mb-2">特休制度</label>
            <Select
              value={leavePolicy}
              onValueChange={v => onSetLeavePolicy(v as 'calendar_year' | 'hire_anniversary')}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hire_anniversary">週年制（以到職日週年計）</SelectItem>
                <SelectItem value="calendar_year">年度制（曆年 1/1 重算）</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-morandi-secondary mt-1">
              勞基法第 38 條、公司全員工統一適用。
            </p>
          </div>
          <div>
            <label className="text-sm text-morandi-secondary block mb-2">資遣費制度</label>
            <Select
              value={pensionSystem}
              onValueChange={v => onSetPensionSystem(v as 'old' | 'new' | 'mixed')}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">
                  新制（勞退條例第 12 條、1 年 0.5 月、上限 6 月）
                </SelectItem>
                <SelectItem value="old">舊制（勞基法第 17 條、1 年 1 月、無上限）</SelectItem>
                <SelectItem value="mixed">跨制（2005/7/1 前舊制 + 之後新制）</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-morandi-secondary mt-1">
              資遣試算預設用此制度、單筆可在資遣試算 dialog 內覆寫。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
