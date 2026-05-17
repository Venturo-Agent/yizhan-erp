'use client'

/**
 * AI 設定 tab — workspace 詳情頁
 *
 * 顯示 / 編輯 per-workspace 的 AI 行為設定：
 *   - prompt template（多行 textarea）
 *   - 資料來源（checkbox：行程 / 景點 / 供應商 / 訂單 / 客戶）
 *   - 回應語氣（select：formal / friendly / minimal）
 *
 * 守門：API 端守 workspaces.write、UI 不另檢、操作失敗會被 403 擋下並 toast
 */

import { useCallback, useEffect, useState } from 'react'
import { Sparkles, Save, Cpu, KeyRound, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { ModuleLoading } from '@/components/module-loading'
import { useAsyncSubmit } from '@/hooks/useAsyncSubmit'
import { LlmTokenSetupDialog } from './llm-token-setup-dialog'
import { apiMutate } from '@/lib/swr/api-mutate'

const RESPONSE_MODE_OPTIONS = [
  { value: 'formal', label: '正式（formal）' },
  { value: 'friendly', label: '親切（friendly）' },
  { value: 'minimal', label: '極簡（minimal）' },
] as const

const DATA_SOURCE_OPTIONS = [
  { value: 'tours', label: '行程' },
  { value: 'attractions', label: '景點' },
  { value: 'suppliers', label: '供應商' },
  { value: 'orders', label: '訂單' },
  { value: 'customers', label: '客戶' },
] as const

type ResponseMode = (typeof RESPONSE_MODE_OPTIONS)[number]['value']

interface AiSettings {
  prompt_template: string
  data_sources: string[]
  response_mode: ResponseMode
}

interface AiSettingsTabProps {
  workspaceId: string
}

interface LlmStatus {
  provider: string | null
  model: string | null
  has_token: boolean
  is_active: boolean
  last_used_at: string | null
}

export function AiSettingsTab({ workspaceId }: AiSettingsTabProps) {
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<AiSettings>({
    prompt_template: '',
    data_sources: [],
    response_mode: 'friendly',
  })
  const [llmStatus, setLlmStatus] = useState<LlmStatus | null>(null)
  const [llmDialogOpen, setLlmDialogOpen] = useState(false)
  const [llmDeleting, setLlmDeleting] = useState(false)

  const loadLlmStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/ai-settings/status`)
      if (res.ok) {
        const data = await res.json()
        setLlmStatus(data)
      }
    } catch {
      // 失敗就保持 null、UI 顯示「未設定」、user 可以重設
    }
  }, [workspaceId])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const [behaviorRes] = await Promise.all([
          fetch(`/api/workspaces/${workspaceId}/ai-settings`),
          loadLlmStatus(),
        ])
        if (!behaviorRes.ok) {
          const body = await behaviorRes.json().catch(() => ({}))
          toast.error('讀取 AI 設定失敗', { description: body.error || `HTTP ${behaviorRes.status}` })
          return
        }
        const data = await behaviorRes.json()
        if (cancelled) return
        setSettings({
          prompt_template: data.prompt_template ?? '',
          data_sources: Array.isArray(data.data_sources) ? data.data_sources : [],
          response_mode: data.response_mode ?? 'friendly',
        })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [workspaceId, loadLlmStatus])

  const handleRemoveLlm = async () => {
    if (!confirm('確定移除 LLM 設定？該租戶的 AI 對話將無法運作。')) return
    setLlmDeleting(true)
    try {
      const res = await apiMutate(`/api/workspaces/${workspaceId}/ai-settings`, {
        method: 'DELETE',
        invalidate: [
          `/api/workspaces/${workspaceId}/ai-settings`,
          `/api/workspaces/${workspaceId}/ai-settings/status`,
        ],
      })
      if (!res.ok) {
        throw new Error(res.error || `HTTP ${res.status}`)
      }
      toast.success('LLM 設定已移除')
      await loadLlmStatus()
    } catch (err) {
      toast.error('移除失敗', {
        description: err instanceof Error ? err.message : '請稍後再試',
      })
    } finally {
      setLlmDeleting(false)
    }
  }

  const toggleDataSource = (value: string) => {
    setSettings(prev => {
      const has = prev.data_sources.includes(value)
      return {
        ...prev,
        data_sources: has
          ? prev.data_sources.filter(v => v !== value)
          : [...prev.data_sources, value],
      }
    })
  }

  const { isSubmitting: saving, execute: handleSave } = useAsyncSubmit(
    async () => {
      const res = await apiMutate(`/api/workspaces/${workspaceId}/ai-settings`, {
        method: 'PUT',
        body: {
          prompt_template: settings.prompt_template || null,
          data_sources: settings.data_sources,
          response_mode: settings.response_mode,
        },
        invalidate: [`/api/workspaces/${workspaceId}/ai-settings`],
      })
      if (!res.ok) {
        throw new Error(res.error || `HTTP ${res.status}`)
      }
      toast.success('已儲存 AI 設定')
    },
    {
      onError: () =>
        toast.error('儲存失敗', { description: '請稍後再試' }),
    }
  )

  if (loading) {
    return <ModuleLoading />
  }

  return (
    <div className="space-y-6">
      {/* ============================================================== */}
      {/* LLM Token 設定（最上方、最重要） */}
      {/* ============================================================== */}
      {/* eslint-disable-next-line venturo/no-forbidden-classes */}
      <div className="rounded-[24px] p-6 bg-gradient-to-t from-white to-morandi-cream border-[3px] border-white shadow-[rgba(180,160,120,0.15)_0px_12px_24px_-8px]">
        <div className="flex items-center gap-2 mb-4">
          <Cpu className="h-4 w-4 text-morandi-gold" />
          <h3 className="font-semibold text-morandi-primary">LLM Token 設定</h3>
        </div>

        <div className="space-y-4">
          <p className="text-xs text-morandi-secondary">
            幫此租戶填入 LLM 服務商的 API token。
            該租戶的 LINE Bot AI 對話會用這組憑證跑、計費也算在他們頭上。
            漫途幫客戶代設（客戶自己看不到這個分頁）。
          </p>

          <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-morandi-cream-soft/40 border border-morandi-gold/10">
            <div>
              <div className="text-xs text-morandi-secondary">Provider</div>
              <div className="text-sm font-medium font-mono">
                {llmStatus?.provider ?? <span className="text-morandi-secondary">未設定</span>}
              </div>
            </div>
            <div>
              <div className="text-xs text-morandi-secondary">Model</div>
              <div className="text-sm font-medium font-mono">
                {llmStatus?.model ?? <span className="text-morandi-secondary">—</span>}
              </div>
            </div>
            <div>
              <div className="text-xs text-morandi-secondary">Token 狀態</div>
              <div className="text-sm font-medium">
                {llmStatus?.has_token ? (
                  <span className="font-mono">已設定（••••••••）</span>
                ) : (
                  <span className="text-morandi-secondary">未設定</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-xs text-morandi-secondary">啟用狀態</div>
              <div className="text-sm font-medium">
                {llmStatus?.is_active ? (
                  <span className="text-green-700">✅ 啟用中</span>
                ) : (
                  <span className="text-morandi-secondary">未啟用</span>
                )}
              </div>
            </div>
            <div className="col-span-2">
              <div className="text-xs text-morandi-secondary">最後使用</div>
              <div className="text-sm font-medium">
                {llmStatus?.last_used_at
                  ? new Date(llmStatus.last_used_at).toLocaleString('zh-TW')
                  : <span className="text-morandi-secondary">—</span>}
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            {llmStatus?.has_token && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveLlm}
                disabled={llmDeleting}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                {llmDeleting ? '移除中...' : '移除設定'}
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => setLlmDialogOpen(true)}
              className="bg-morandi-gold hover:bg-morandi-gold/90 text-white"
            >
              <KeyRound className="h-3.5 w-3.5 mr-1.5" />
              {llmStatus?.has_token ? '變更 Token' : '設定 Token'}
            </Button>
          </div>
        </div>
      </div>

      <LlmTokenSetupDialog
        workspaceId={workspaceId}
        open={llmDialogOpen}
        onOpenChange={setLlmDialogOpen}
        onSaved={() => {
          loadLlmStatus()
        }}
      />

      {/* ============================================================== */}
      {/* AI 行為設定（原有） */}
      {/* ============================================================== */}
      {/* eslint-disable-next-line venturo/no-forbidden-classes */}
      <div className="rounded-[24px] p-6 bg-gradient-to-t from-white to-morandi-cream border-[3px] border-white shadow-[rgba(180,160,120,0.15)_0px_12px_24px_-8px]">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-4 w-4 text-morandi-gold" />
          <h3 className="font-semibold text-morandi-primary">AI 行為設定</h3>
        </div>

        <div className="space-y-6">
          {/* Prompt Template */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-morandi-primary">
              系統提示詞（Prompt Template）
            </Label>
            <p className="text-xs text-morandi-secondary">
              AI 對話開頭注入的系統提示。建議寫貴司角色定位、語言風格、禁忌主題。
            </p>
            <Textarea
              value={settings.prompt_template}
              onChange={e =>
                setSettings(prev => ({ ...prev, prompt_template: e.target.value }))
              }
              placeholder="例如：你是漫途旅行社的 AI 助理、回答客戶旅遊相關問題、語氣親切..."
              rows={6}
            />
          </div>

          {/* Data Sources */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-morandi-primary">
              允許讀取的資料來源
            </Label>
            <p className="text-xs text-morandi-secondary">
              勾選 AI 在對話時可查詢的內部資料表。未勾選代表 AI 看不到這類資料。
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2">
              {DATA_SOURCE_OPTIONS.map(option => {
                const checked = settings.data_sources.includes(option.value)
                return (
                  // eslint-disable-next-line venturo/no-forbidden-classes
                  <label
                    key={option.value}
                    className="flex items-center gap-2 px-4 py-3 rounded-[16px] cursor-pointer bg-gradient-to-t from-morandi-cream-soft to-morandi-cream-warm shadow-[rgba(180,160,120,0.3)_0px_8px_20px_-4px] hover:shadow-md transition-all"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleDataSource(option.value)}
                    />
                    <span className="text-sm font-medium text-morandi-primary">
                      {option.label}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Response Mode */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-morandi-primary">
              回應語氣
            </Label>
            <p className="text-xs text-morandi-secondary">
              AI 回覆給客戶時的口吻風格。
            </p>
            <Select
              value={settings.response_mode}
              onValueChange={value =>
                setSettings(prev => ({ ...prev, response_mode: value as ResponseMode }))
              }
            >
              <SelectTrigger className="max-w-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESPONSE_MODE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end pt-6 mt-6 border-t border-morandi-gold/20">
          <Button
            variant="soft-gold"
            onClick={handleSave}
            disabled={saving}
            className="border-morandi-gold text-morandi-gold hover:bg-morandi-gold/10"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? '儲存中...' : '儲存 AI 設定'}
          </Button>
        </div>
      </div>
    </div>
  )
}
