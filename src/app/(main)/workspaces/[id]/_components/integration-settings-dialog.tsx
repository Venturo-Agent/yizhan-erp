'use client'

/**
 * IntegrationSettingsDialog — 第三方 API 整合設定 dialog
 *
 * 從原 IntegrationsTab.tsx 抽出（已於 2026-05-19 砍 tab、邏輯移進附加服務）
 *
 * 流程：
 * - GET /api/workspace-integrations?workspace_id={id} 載入該 workspace 的 integration 狀態
 * - sensitive 欄位回傳 '••••••••' 遮罩、不曝光明文
 * - 改 sensitive 欄位 = 「重新輸入」按鈕清空、user 重填、儲存時加密後存 DB
 * - PUT 儲存（enabled + config）
 */

import { useEffect, useState } from 'react'
import { Loader2, CheckSquare } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { alert as showAlert } from '@/lib/ui/alert-dialog'
import { apiMutate } from '@/lib/swr/api-mutate'
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

interface IntegrationSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId: string
  integrationCode: string
  /** 儲存完成後 callback、給外層刷新狀態 */
  onSaved?: () => void
}

export function IntegrationSettingsDialog({
  open,
  onOpenChange,
  workspaceId,
  integrationCode,
  onSaved,
}: IntegrationSettingsDialogProps) {
  const [integration, setIntegration] = useState<IntegrationView | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draftConfig, setDraftConfig] = useState<Record<string, string>>({})
  const [draftEnabled, setDraftEnabled] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/workspace-integrations?workspace_id=${workspaceId}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const list = (await res.json()) as IntegrationView[]
        if (cancelled) return
        const it = list.find(x => x.code === integrationCode) ?? null
        setIntegration(it)
        if (it) {
          setDraftConfig({ ...it.config })
          setDraftEnabled(it.enabled)
        }
      } catch (err) {
        logger.error('載入 integration 失敗', err)
        await showAlert('載入設定失敗', 'error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, workspaceId, integrationCode])

  const updateField = (key: string, value: string) => {
    setDraftConfig(prev => ({ ...prev, [key]: value }))
  }

  // sensitive 欄位的「重新輸入」清空遮罩、user 才能輸入新值
  const clearSensitive = (key: string) => {
    setDraftConfig(prev => ({ ...prev, [key]: '' }))
  }

  const handleSave = async () => {
    if (!integration) return
    setSaving(true)
    try {
      const res = await apiMutate('/api/workspace-integrations', {
        method: 'PUT',
        body: {
          workspace_id: workspaceId,
          integration_code: integration.code,
          config: draftConfig,
          enabled: draftEnabled,
        },
        invalidate: [`/api/workspace-integrations?workspace_id=${workspaceId}`],
      })
      if (!res.ok) {
        await showAlert(res.error || '儲存失敗', 'error')
        return
      }
      await showAlert(`${integration.name} 已儲存`, 'success')
      onSaved?.()
      onOpenChange(false)
    } catch (err) {
      logger.error('儲存 integration 失敗', err)
      await showAlert('儲存失敗', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {integration?.name ?? '載入中…'}
            {integration?.configured && (
              <Badge variant="outline" className="ml-2 text-[0.65rem] align-middle">
                已設定
              </Badge>
            )}
          </DialogTitle>
          {integration?.description && (
            <DialogDescription className="text-xs leading-relaxed">
              {integration.description}
            </DialogDescription>
          )}
        </DialogHeader>

        {loading || !integration ? (
          <div className="flex items-center justify-center py-12 text-morandi-muted">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            載入中…
          </div>
        ) : (
          <div className="space-y-4">
            {integration.affects.length > 0 && (
              <p className="text-[0.65rem] text-morandi-muted">
                影響功能：{integration.affects.join(' / ')}
              </p>
            )}

            <div className="flex items-center justify-between p-3 rounded-md bg-morandi-container/30 border border-morandi-muted/15">
              <Label className="text-sm text-morandi-primary">啟用此整合</Label>
              <Switch checked={draftEnabled} onCheckedChange={setDraftEnabled} disabled={saving} />
            </div>

            <div className="grid grid-cols-1 gap-3">
              {integration.fields.map(field => {
                const value = draftConfig[field.key] ?? ''
                const isMasked = field.sensitive && value === '••••••••'

                if (field.type === 'checkbox') {
                  const isChecked = value === 'true'
                  return (
                    <div key={field.key} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={isChecked}
                          onCheckedChange={v => updateField(field.key, v ? 'true' : 'false')}
                          disabled={saving}
                        />
                        <Label
                          className="text-xs cursor-pointer"
                          onClick={() =>
                            !saving && updateField(field.key, isChecked ? 'false' : 'true')
                          }
                        >
                          {field.label}
                          {field.required && <span className="text-status-danger ml-1">*</span>}
                        </Label>
                      </div>
                      {field.hint && (
                        <p className="text-[0.65rem] text-morandi-muted ml-11">{field.hint}</p>
                      )}
                    </div>
                  )
                }

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
                        onChange={e => updateField(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        disabled={isMasked || saving}
                        className="h-9 text-sm"
                      />
                      {isMasked && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 text-[0.65rem] px-2 flex-shrink-0"
                          onClick={() => clearSensitive(field.key)}
                        >
                          重新輸入
                        </Button>
                      )}
                    </div>
                    {field.hint && (
                      <p className="text-[0.65rem] text-morandi-muted">{field.hint}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
            取消
          </Button>
          <Button
            variant="morandi-gold"
            size="sm"
            onClick={handleSave}
            disabled={saving || loading || !integration}
            className="gap-1"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckSquare className="h-3.5 w-3.5" />
            )}
            儲存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
