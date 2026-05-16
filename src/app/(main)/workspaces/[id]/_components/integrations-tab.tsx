'use client'

/**
 * Workspace API 整合設定 tab
 *
 * William 拍板 2026-05-11：未來一棧 ERP 是 API 整合平台、每個客戶在這設自己的 API key
 *
 * 流程：
 * - GET /api/workspace-integrations?workspace_id={id} 載入所有 integration 狀態
 *   → sensitive 欄位回傳 '••••••••' 遮罩、不曝光明文
 * - 每張卡支援 啟用 toggle + 欄位編輯 + 儲存
 * - sensitive 欄位若保留 '••••••••' = 沒改、儲存時 API 自動保留原值
 * - 改 sensitive 欄位 = 清空後重新輸入、儲存時加密後存 DB
 */

import { useEffect, useState } from 'react'
import { Plug, Save, Loader2, Link2, Copy, Check } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { IpFormSection } from './ip-form-section'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { alert as showAlert } from '@/lib/ui/alert-dialog'
import { logger } from '@/lib/utils/logger'
import type { IntegrationFieldDef } from '@/lib/integrations/registry'

interface IntegrationView {
  code: string
  name: string
  description: string
  affects: string[]
  fields: IntegrationFieldDef[]
  enabled: boolean
  config: Record<string, string>
  configured: boolean
}

interface IntegrationsTabProps {
  workspaceId: string
}

export function IntegrationsTab({ workspaceId }: IntegrationsTabProps) {
  const [integrations, setIntegrations] = useState<IntegrationView[]>([])
  const [loading, setLoading] = useState(true)
  const [savingCode, setSavingCode] = useState<string | null>(null)
  // 編輯中的 config 狀態（per integration_code）
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({})
  const [draftEnabled, setDraftEnabled] = useState<Record<string, boolean>>({})

  // 各 integration 的本月用量（per-code map）
  const [usageMap, setUsageMap] = useState<Record<string, { total: number; success: number; failed: number }>>({})

  // 一次性 setup 連結生成狀態
  const [generatingLinkCode, setGeneratingLinkCode] = useState<string | null>(null)
  const [linkResult, setLinkResult] = useState<{
    integration_name: string
    url: string
    expires_at: string
  } | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)

  async function generateSetupLink(integrationCode: string) {
    setGeneratingLinkCode(integrationCode)
    setLinkCopied(false)
    try {
      const res = await fetch('/api/setup-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          integration_code: integrationCode,
          expires_hours: 24,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        await showAlert(data.error || '生成連結失敗', 'error')
        return
      }
      setLinkResult({
        integration_name: data.integration?.name ?? integrationCode,
        url: data.url,
        expires_at: data.expires_at,
      })
    } catch (err) {
      logger.error('生成 setup 連結失敗', err)
      await showAlert('網路錯誤、請稍後重試', 'error')
    } finally {
      setGeneratingLinkCode(null)
    }
  }

  async function copyLink() {
    if (!linkResult) return
    try {
      await navigator.clipboard.writeText(linkResult.url)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch {
      // 不 critical、靜默
    }
  }

  // 載入
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/workspace-integrations?workspace_id=${workspaceId}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as IntegrationView[]
        if (cancelled) return
        setIntegrations(data)
        // 初始化 drafts = 當前 config 副本
        const d: Record<string, Record<string, string>> = {}
        const e: Record<string, boolean> = {}
        for (const it of data) {
          d[it.code] = { ...it.config }
          e[it.code] = it.enabled
        }
        setDrafts(d)
        setDraftEnabled(e)

        // 並行 fetch 各 integration 本月用量
        const usageResults = await Promise.all(
          data.map(async it => {
            try {
              const r = await fetch(
                `/api/integrations/usage?workspace_id=${workspaceId}&integration_code=${it.code}`,
              )
              if (!r.ok) return [it.code, { total: 0, success: 0, failed: 0 }] as const
              const u = await r.json()
              return [it.code, u.monthly] as const
            } catch {
              return [it.code, { total: 0, success: 0, failed: 0 }] as const
            }
          }),
        )
        if (!cancelled) {
          setUsageMap(Object.fromEntries(usageResults))
        }
      } catch (err) {
        logger.error('載入 integrations 失敗', err)
        await showAlert('載入 API 整合設定失敗', 'error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [workspaceId])

  const updateField = (code: string, key: string, value: string) => {
    setDrafts(prev => ({ ...prev, [code]: { ...prev[code], [key]: value } }))
  }

  const updateEnabled = (code: string, value: boolean) => {
    setDraftEnabled(prev => ({ ...prev, [code]: value }))
  }

  // 點 sensitive 欄位的「重新輸入」清空遮罩、user 才能輸入新值
  const clearSensitive = (code: string, key: string) => {
    setDrafts(prev => ({ ...prev, [code]: { ...prev[code], [key]: '' } }))
  }

  const handleSave = async (it: IntegrationView) => {
    setSavingCode(it.code)
    try {
      const res = await fetch('/api/workspace-integrations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          integration_code: it.code,
          config: drafts[it.code] ?? {},
          enabled: draftEnabled[it.code] ?? false,
        }),
      })
      const body = await res.json()
      if (!res.ok) {
        await showAlert(body.error || '儲存失敗', 'error')
        return
      }
      // 重撈、拿到最新遮罩
      const refreshRes = await fetch(`/api/workspace-integrations?workspace_id=${workspaceId}`)
      const refreshed = (await refreshRes.json()) as IntegrationView[]
      setIntegrations(refreshed)
      const newDraft = refreshed.find(x => x.code === it.code)
      if (newDraft) {
        setDrafts(prev => ({ ...prev, [it.code]: { ...newDraft.config } }))
        setDraftEnabled(prev => ({ ...prev, [it.code]: newDraft.enabled }))
      }
      await showAlert(`${it.name} 已儲存`, 'success')
    } catch (err) {
      logger.error('儲存 integration 失敗', err)
      await showAlert('儲存失敗', 'error')
    } finally {
      setSavingCode(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-morandi-secondary">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        載入中…
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-morandi-secondary">
        <Plug className="h-4 w-4" />
        每個 workspace 各自存自己的 API key、加密儲存。改了「啟用」要按儲存才生效。
      </div>

      {/* 申請文件工具 */}
      <IpFormSection workspaceId={workspaceId} />

      {/* 一次性 setup link 結果 modal */}
      {linkResult && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setLinkResult(null)}
        >
          <div
            className="bg-card border border-border rounded-xl shadow-lg max-w-lg w-full p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div>
              <h3 className="font-medium text-morandi-primary mb-1">
                設定連結已生成 ✓
              </h3>
              <p className="text-xs text-morandi-secondary">
                {linkResult.integration_name} · 有效期至 {new Date(linkResult.expires_at).toLocaleString('zh-TW')}
              </p>
            </div>

            <div className="bg-morandi-background/50 border border-border rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={linkResult.url}
                  className="text-xs font-mono h-8 flex-1"
                  onClick={e => (e.target as HTMLInputElement).select()}
                />
                <Button
                  size="sm"
                  variant="soft-gold"
                  onClick={copyLink}
                  className="gap-1 flex-shrink-0"
                >
                  {linkCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {linkCopied ? '已複製' : '複製'}
                </Button>
              </div>
            </div>

            <div className="text-xs text-morandi-muted space-y-1">
              <p>• 客戶開連結 → 直接進設定頁、不需登入</p>
              <p>• 填完 API key 儲存 → 連結即失效</p>
              <p>• 24 小時內未使用會自動過期</p>
              <p>• 加密儲存、漫途員工也看不到客戶填的明文</p>
            </div>

            <div className="flex justify-end">
              <Button variant="soft-gold" size="sm" onClick={() => setLinkResult(null)}>
                關閉
              </Button>
            </div>
          </div>
        </div>
      )}

      {integrations.map(it => {
        const draft = drafts[it.code] ?? {}
        const enabled = draftEnabled[it.code] ?? false
        const isSaving = savingCode === it.code
        return (
          <Card key={it.code} className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-medium">{it.name}</h3>
                  {it.configured && (
                    <Badge variant="outline" className="text-[0.588rem]">
                      已設定
                    </Badge>
                  )}
                  {usageMap[it.code] && usageMap[it.code].total > 0 && (
                    <Badge
                      variant="outline"
                      className={`text-[0.588rem] ${
                        usageMap[it.code].failed > 0
                          ? 'border-morandi-red/40 text-morandi-red'
                          : 'border-morandi-green/40 text-morandi-green'
                      }`}
                      title={`本月成功 ${usageMap[it.code].success} 次 / 失敗 ${usageMap[it.code].failed} 次`}
                    >
                      本月 {usageMap[it.code].total} 次
                      {usageMap[it.code].failed > 0 && ` (${usageMap[it.code].failed} 失敗)`}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-morandi-secondary">{it.description}</p>
                {it.affects.length > 0 && (
                  <p className="text-[0.647rem] text-morandi-muted">
                    影響：{it.affects.join(' / ')}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-morandi-secondary">啟用</Label>
                <Switch
                  checked={enabled}
                  onCheckedChange={v => updateEnabled(it.code, v)}
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
              {it.fields.map(field => {
                const value = draft[field.key] ?? ''
                const isMasked = field.sensitive && value === '••••••••'

                // Checkbox field (e.g. chinese_recognition)
                if (field.type === 'checkbox') {
                  const isChecked = value === 'true'
                  return (
                    <div key={field.key} className="space-y-1 col-span-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={isChecked}
                          onCheckedChange={v => updateField(it.code, field.key, v ? 'true' : 'false')}
                          disabled={isSaving}
                        />
                        <Label className="text-xs cursor-pointer" onClick={() => !isSaving && updateField(it.code, field.key, isChecked ? 'false' : 'true')}>
                          {field.label}
                          {field.required && <span className="text-status-danger ml-1">*</span>}
                        </Label>
                      </div>
                      {field.hint && (
                        <p className="text-[0.588rem] text-morandi-muted ml-11">{field.hint}</p>
                      )}
                    </div>
                  )
                }

                // Text / password / url fields
                return (
                  <div key={field.key} className="space-y-1">
                    <Label className="text-xs">
                      {field.label}
                      {field.required && <span className="text-status-danger ml-1">*</span>}
                    </Label>
                    <div className="flex gap-1">
                      <Input
                        type={field.type === 'password' ? 'password' : 'text'}
                        value={value}
                        onChange={e => updateField(it.code, field.key, e.target.value)}
                        placeholder={field.placeholder}
                        disabled={isMasked || isSaving}
                        className="h-8 text-xs"
                      />
                      {isMasked && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-[0.588rem] px-2 flex-shrink-0"
                          onClick={() => clearSensitive(it.code, field.key)}
                        >
                          重新輸入
                        </Button>
                      )}
                    </div>
                    {field.hint && (
                      <p className="text-[0.588rem] text-morandi-muted">{field.hint}</p>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => generateSetupLink(it.code)}
                disabled={generatingLinkCode === it.code}
                className="gap-1 text-morandi-secondary"
                title="生成一次性設定連結、發給客戶自己填"
              >
                {generatingLinkCode === it.code ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Link2 className="h-3 w-3" />
                )}
                發送設定連結
              </Button>
              <Button
                size="sm"
                variant="soft-gold"
                onClick={() => handleSave(it)}
                disabled={isSaving}
                className="gap-1"
              >
                {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                儲存
              </Button>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
