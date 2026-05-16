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

import { useEffect, useState } from 'react'
import { Sparkles, Save } from 'lucide-react'
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

export function AiSettingsTab({ workspaceId }: AiSettingsTabProps) {
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<AiSettings>({
    prompt_template: '',
    data_sources: [],
    response_mode: 'friendly',
  })

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/workspaces/${workspaceId}/ai-settings`)
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          toast.error('讀取 AI 設定失敗', { description: body.error || `HTTP ${res.status}` })
          return
        }
        const data = await res.json()
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
  }, [workspaceId])

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
      const res = await fetch(`/api/workspaces/${workspaceId}/ai-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt_template: settings.prompt_template || null,
          data_sources: settings.data_sources,
          response_mode: settings.response_mode,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
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
