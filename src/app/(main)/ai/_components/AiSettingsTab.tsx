'use client'

/**
 * AI Hub - Settings tab
 *
 * LINE postback template 管理（快捷回覆 + Rich Menu 自動回覆）
 * workspace_ai_agents 人格設定（Phase 2）
 */

import { useState } from 'react'
import useSWR, { mutate } from 'swr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Plus, Trash2, Pencil, Check, X, GripVertical } from 'lucide-react'
import { toast } from 'sonner'

interface PostbackTemplate {
  id: string
  label: string
  postback_data: string
  response_text: string
  sort_order: number
  is_active: boolean
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

const API = '/api/line/postback-templates'

export function AiSettingsTab() {
  return (
    <div className="p-6 space-y-8 max-w-2xl">
      <PostbackTemplatesSection />
    </div>
  )
}

function PostbackTemplatesSection() {
  const { data, isLoading, error } = useSWR<{ data: PostbackTemplate[] }>(API, fetcher, {
    revalidateOnFocus: false,
  })
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const templates = data?.data ?? []

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`確定刪除「${label}」？`)) return
    const res = await fetch(`${API}/${id}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('刪除失敗'); return }
    await mutate(API)
    toast.success('已刪除')
  }

  const handleToggleActive = async (t: PostbackTemplate) => {
    const res = await fetch(`${API}/${t.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !t.is_active }),
    })
    if (!res.ok) { toast.error('更新失敗'); return }
    await mutate(API)
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-morandi-primary">LINE 快捷回覆模板</h2>
          <p className="text-xs text-morandi-muted mt-0.5">
            Rich Menu postback 自動回覆 + AI Hub 對話抽屜快捷按鈕
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => { setShowForm(true); setEditingId(null) }}
          className="gap-1.5"
        >
          <Plus className="w-4 h-4" />
          新增
        </Button>
      </div>

      {isLoading && <div className="text-sm text-morandi-muted">載入中...</div>}
      {error && <div className="text-sm text-red-600">載入失敗</div>}

      {showForm && !editingId && (
        <TemplateForm
          onSave={async (payload) => {
            const res = await fetch(API, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            })
            const json = await res.json() as { error?: string }
            if (!res.ok) { toast.error(json.error || '建立失敗'); return }
            await mutate(API)
            setShowForm(false)
            toast.success('已新增')
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="space-y-2">
        {templates.map(t => (
          <div key={t.id}>
            {editingId === t.id ? (
              <TemplateForm
                initial={t}
                onSave={async (payload) => {
                  const res = await fetch(`${API}/${t.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                  })
                  if (!res.ok) { toast.error('更新失敗'); return }
                  await mutate(API)
                  setEditingId(null)
                  toast.success('已更新')
                }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <TemplateRow
                t={t}
                onEdit={() => setEditingId(t.id)}
                onDelete={() => handleDelete(t.id, t.label)}
                onToggle={() => handleToggleActive(t)}
              />
            )}
          </div>
        ))}
      </div>

      {!isLoading && templates.length === 0 && !showForm && (
        <div className="border border-dashed border-morandi-muted/30 rounded-xl p-8 text-center text-sm text-morandi-muted">
          尚未設定任何模板，點「新增」建立第一個。
        </div>
      )}
    </section>
  )
}

function TemplateRow({
  t,
  onEdit,
  onDelete,
  onToggle,
}: {
  t: PostbackTemplate
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
}) {
  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
        t.is_active ? 'border-morandi-muted/20 bg-white' : 'border-morandi-muted/10 bg-morandi-container/20 opacity-60'
      }`}
    >
      <GripVertical className="w-4 h-4 text-morandi-muted/40 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-morandi-primary">{t.label}</span>
          <span className="text-[0.65rem] font-mono bg-morandi-container/40 text-morandi-muted px-1.5 py-0.5 rounded border border-morandi-muted/20">
            {t.postback_data}
          </span>
        </div>
        <p className="text-xs text-morandi-secondary mt-1 line-clamp-2">{t.response_text}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onToggle}
          title={t.is_active ? '停用' : '啟用'}
          className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
            t.is_active
              ? 'border-green-200 text-green-700 bg-green-50 hover:bg-green-100'
              : 'border-morandi-muted/20 text-morandi-muted hover:bg-morandi-container/40'
          }`}
        >
          {t.is_active ? '啟用' : '停用'}
        </button>
        <button onClick={onEdit} className="p-1 text-morandi-muted hover:text-morandi-primary">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button onClick={onDelete} className="p-1 text-morandi-muted hover:text-red-600">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

interface TemplatePayload {
  label: string
  postback_data: string
  response_text: string
  sort_order: number
}

function TemplateForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: PostbackTemplate
  onSave: (payload: TemplatePayload) => Promise<void>
  onCancel: () => void
}) {
  const [label, setLabel] = useState(initial?.label ?? '')
  const [postbackData, setPostbackData] = useState(initial?.postback_data ?? '')
  const [responseText, setResponseText] = useState(initial?.response_text ?? '')
  const [sortOrder, setSortOrder] = useState(initial?.sort_order ?? 0)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!label.trim() || !postbackData.trim() || !responseText.trim()) {
      toast.error('三個欄位都必填')
      return
    }
    setSaving(true)
    try {
      await onSave({ label: label.trim(), postback_data: postbackData.trim(), response_text: responseText.trim(), sort_order: sortOrder })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border border-morandi-gold/30 rounded-xl p-4 bg-morandi-gold/5 space-y-3 mb-2">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-morandi-secondary mb-1 block">按鈕標籤 *</label>
          <Input
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="例：查詢行程"
            className="h-8 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-morandi-secondary mb-1 block">Postback Data *</label>
          <Input
            value={postbackData}
            onChange={e => setPostbackData(e.target.value)}
            placeholder="例：action=check_tours"
            className="h-8 text-sm font-mono"
          />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-morandi-secondary mb-1 block">回覆內容 *</label>
        <textarea
          value={responseText}
          onChange={e => setResponseText(e.target.value)}
          placeholder="用戶點擊按鈕後自動送出的文字..."
          className="w-full h-20 text-sm px-3 py-2 rounded-md border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-xs text-morandi-secondary">排序</label>
          <Input
            type="number"
            value={sortOrder}
            onChange={e => setSortOrder(Number(e.target.value))}
            className="h-7 w-16 text-sm"
            min={0}
            max={999}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
            <X className="w-3.5 h-3.5" />
            取消
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={saving} className="gap-1">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            儲存
          </Button>
        </div>
      </div>
    </div>
  )
}
