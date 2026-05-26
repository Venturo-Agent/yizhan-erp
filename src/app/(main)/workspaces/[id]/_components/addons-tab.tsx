'use client'

/**
 * AddonsTab — 附加服務（加值訂閱）
 *
 * William 2026-05-15 拍板：客戶可單獨購買的加值包、跟月費 module 分開計費。
 * William 2026-05-19 重組：分三區（資料庫 / API / AI），原 API 整合 tab 已砍、
 *   API 加值併入這、護照 / 航班走 IntegrationSettingsDialog 設定。
 *
 * 三區資料底層不同：
 * - 資料庫加值：workspace_features（toggle 寫 features 表）
 * - API 加值：workspace_integrations（toggle + config 寫 integrations 表、走 dialog）
 * - AI 加值：未來預留、目前 placeholder
 */

import { useEffect, useState } from 'react'
import {
  PackagePlus,
  Database,
  Hotel,
  MapPinned,
  UtensilsCrossed,
  Bot,
  Plug,
  Plane,
  ScanLine,
  Sparkles,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getAddonFeatures } from '@/lib/permissions'
import { INTEGRATIONS } from '@/lib/integrations/registry'
import { IntegrationSettingsDialog } from './integration-settings-dialog'
import { logger } from '@/lib/utils/logger'

interface AddonsTabProps {
  features: { feature_code: string; enabled: boolean }[]
  onToggle: (featureCode: string, enabled: boolean) => void
  workspaceId: string
}

// 資料庫加值 addon code → icon
const DB_ADDON_ICONS: Record<string, LucideIcon> = {
  addon_data_attractions: MapPinned,
  addon_data_hotels: Hotel,
  addon_data_restaurants: UtensilsCrossed,
}

// API 加值 integration code → icon
const API_ICONS: Record<string, LucideIcon> = {
  flight_search: Plane,
  passport_ocr: ScanLine,
}

interface IntegrationStatus {
  code: string
  enabled: boolean
  configured: boolean
}

export function AddonsTab({ features, onToggle, workspaceId }: AddonsTabProps) {
  const addonFeatures = getAddonFeatures()
  const [integrationStatus, setIntegrationStatus] = useState<Record<string, IntegrationStatus>>({})
  const [dialogCode, setDialogCode] = useState<string | null>(null)

  // 載入 integration 狀態（給卡片顯示啟用 / 已設定 badge）
  const refreshIntegrations = async () => {
    try {
      const res = await fetch(`/api/workspace-integrations?workspace_id=${workspaceId}`)
      if (!res.ok) return
      const list = (await res.json()) as IntegrationStatus[]
      const map: Record<string, IntegrationStatus> = {}
      for (const it of list) {
        map[it.code] = { code: it.code, enabled: it.enabled, configured: it.configured }
      }
      setIntegrationStatus(map)
    } catch (err) {
      logger.warn('載入 integration 狀態失敗', err)
    }
  }

  useEffect(() => {
    void refreshIntegrations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId])

  const isFeatureEnabled = (code: string) =>
    features.find(f => f.feature_code === code)?.enabled ?? false

  return (
    <div className="space-y-8">
      {/* 說明卡 */}
      <Card className="rounded-[24px] p-6 bg-gradient-to-t from-white to-morandi-cream border-[3px] border-white shadow-[rgba(180,160,120,0.15)_0px_12px_24px_-8px]">
        <div className="flex items-start gap-3">
          <div className="rounded-md p-2.5 bg-morandi-gold/10">
            <PackagePlus className="size-5 text-morandi-gold" />
          </div>
          <div>
            <h3 className="font-semibold text-morandi-primary mb-1">附加服務</h3>
            <p className="text-sm text-morandi-secondary leading-relaxed">
              可單獨販售的加值包、跟月費 module 分開計費。分三類：
              <strong className="text-morandi-primary">資料庫加值</strong>（共用旅遊資料）、
              <strong className="text-morandi-primary">API 加值</strong>（第三方 API 整合）、
              <strong className="text-morandi-primary">AI 加值</strong>（即將推出）。
            </p>
          </div>
        </div>
      </Card>

      {/* 📚 資料庫加值 */}
      <SectionHeader
        icon={Database}
        title="資料庫加值"
        description="購買後可讀取對應的共用旅遊資料。寫權限（編輯資料）另由 shared_data.X.write capability 控、預設只給漫途 + 角落。"
      />
      {addonFeatures.length === 0 ? (
        <EmptyState text="目前沒有可供販售的資料庫加值。" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addonFeatures.map(addon => {
            const Icon = DB_ADDON_ICONS[addon.code] ?? Database
            const enabled = isFeatureEnabled(addon.code)
            return (
              <AddonCard
                key={addon.code}
                icon={Icon}
                title={addon.name}
                description={addon.description}
                badgeText={addon.code}
                enabled={enabled}
                onToggle={next => onToggle(addon.code, next)}
              />
            )
          })}
        </div>
      )}

      {/* 🔌 API 加值 */}
      <SectionHeader
        icon={Plug}
        title="API 加值"
        description="第三方 API 整合（航班搜尋、護照辨識等）。啟用後需填入 API key、key 加密儲存、客戶內部與漫途員工皆看不到明文。"
      />
      {INTEGRATIONS.length === 0 ? (
        <EmptyState text="目前沒有可用的 API 加值整合。" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {INTEGRATIONS.map(it => {
            const Icon = API_ICONS[it.code] ?? Plug
            const status = integrationStatus[it.code]
            const enabled = status?.enabled ?? false
            const configured = status?.configured ?? false
            return (
              <Card
                key={it.code}
                className="rounded-[24px] p-5 bg-gradient-to-t from-white to-morandi-cream border-[3px] border-white shadow-[rgba(180,160,120,0.15)_0px_12px_24px_-8px]"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className={
                      enabled
                        ? 'rounded-md p-2.5 bg-morandi-gold/15 text-morandi-gold'
                        : 'rounded-md p-2.5 bg-morandi-secondary/10 text-morandi-secondary'
                    }
                  >
                    <Icon className="size-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-morandi-primary">{it.name}</span>
                      {enabled && (
                        <Badge
                          variant="outline"
                          className="text-[0.65rem] border-status-success/30 text-status-success bg-status-success-bg"
                        >
                          啟用中
                        </Badge>
                      )}
                      {configured && (
                        <Badge variant="outline" className="text-[0.65rem]">
                          已設定
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-morandi-secondary mt-1 leading-relaxed">
                      {it.description}
                    </p>
                    {it.affects.length > 0 && (
                      <p className="text-[0.65rem] text-morandi-muted mt-1">
                        影響：{it.affects.join(' / ')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs"
                    onClick={() => setDialogCode(it.code)}
                  >
                    <Settings className="w-3.5 h-3.5" />
                    設定
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* 🤖 AI 加值（預留） */}
      <SectionHeader
        icon={Sparkles}
        title="AI 加值"
        description="即將推出：RAG 知識庫、進階對話分析、AI 行程編輯等加值功能。"
      />
      <Card className="rounded-[24px] p-6 border-[3px] border-dashed border-morandi-muted/20 bg-morandi-container/10 text-center">
        <Bot className="size-6 mx-auto text-morandi-muted mb-2" strokeWidth={1.5} />
        <p className="text-sm text-morandi-muted">AI 加值功能開發中、近期上線。</p>
      </Card>

      {/* API 加值設定 dialog */}
      {dialogCode && (
        <IntegrationSettingsDialog
          open={!!dialogCode}
          onOpenChange={open => !open && setDialogCode(null)}
          workspaceId={workspaceId}
          integrationCode={dialogCode}
          onSaved={refreshIntegrations}
        />
      )}
    </div>
  )
}

// ============================================================
// Section helpers
// ============================================================

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-md p-2 bg-morandi-gold/10 shrink-0">
        <Icon className="size-4 text-morandi-gold" strokeWidth={1.5} />
      </div>
      <div className="flex-1">
        <h4 className="text-sm font-semibold text-morandi-primary">{title}</h4>
        <p className="text-xs text-morandi-secondary mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-8 text-morandi-muted text-sm border border-dashed border-morandi-muted/20 rounded-xl">
      {text}
    </div>
  )
}

function AddonCard({
  icon: Icon,
  title,
  description,
  badgeText,
  enabled,
  onToggle,
}: {
  icon: LucideIcon
  title: string
  description: string
  badgeText: string
  enabled: boolean
  onToggle: (next: boolean) => void
}) {
  return (
    <Card className="rounded-[24px] p-5 bg-gradient-to-t from-white to-morandi-cream border-[3px] border-white shadow-[rgba(180,160,120,0.15)_0px_12px_24px_-8px]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div
            className={
              enabled
                ? 'rounded-md p-2.5 bg-morandi-gold/15 text-morandi-gold'
                : 'rounded-md p-2.5 bg-morandi-secondary/10 text-morandi-secondary'
            }
          >
            <Icon className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-morandi-primary">{title}</div>
            <p className="text-sm text-morandi-secondary mt-1 leading-relaxed">{description}</p>
            <div className="mt-2">
              <Badge variant="outline" className="font-mono text-xs">
                {badgeText}
              </Badge>
            </div>
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={onToggle} />
      </div>
    </Card>
  )
}
