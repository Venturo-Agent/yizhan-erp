'use client'

/**
 * AddonsTab — 附加服務（加值訂閱）
 *
 * 2026-05-15 William 拍板：客戶可單獨購買的加值包（資料庫、未來 AI 知識庫等）。
 * 跟「總覽」的 module feature 開關獨立、商業上是另一條銷售動作。
 *
 * 設計：
 * - 跟 page.tsx 共用 features state（toggle 透過 onToggle callback）
 * - 儲存沿用 page.tsx 的 handleSave（PUT /api/permissions/features）
 * - 列出所有 category === 'addon' 的 feature
 * - UI 用卡片式呈現、勾選 = 該客戶買了這個 addon
 *
 * 未來擴增：新加 addon module 一個檔（src/modules/addon_*.ts）就自動出現在這個 tab、
 * 不用動 UI 程式。
 */

import { PackagePlus, Database, Hotel, MapPinned, UtensilsCrossed, Bot } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { getAddonFeatures } from '@/lib/permissions'

interface AddonsTabProps {
  features: { feature_code: string; enabled: boolean }[]
  onToggle: (featureCode: string, enabled: boolean) => void
}

// addon code → icon mapping、新加 addon 在這加一行
const ADDON_ICONS: Record<string, typeof Database> = {
  addon_data_attractions: MapPinned,
  addon_data_hotels: Hotel,
  addon_data_restaurants: UtensilsCrossed,
  // 未來：
  // addon_ai_knowledge_base: Bot,
}

export function AddonsTab({ features, onToggle }: AddonsTabProps) {
  const addonFeatures = getAddonFeatures()

  const isEnabled = (code: string) => {
    return features.find(f => f.feature_code === code)?.enabled ?? false
  }

  return (
    <div className="space-y-6">
      {/* 說明卡 */}
      <div className="rounded-[24px] p-6 bg-gradient-to-t from-white to-morandi-cream border-[3px] border-white shadow-[rgba(180,160,120,0.15)_0px_12px_24px_-8px]">
        <div className="flex items-start gap-3">
          <div className="rounded-md p-2.5 bg-morandi-gold/10">
            <PackagePlus className="size-5 text-morandi-gold" />
          </div>
          <div>
            <h3 className="font-semibold text-morandi-primary mb-1">附加服務</h3>
            <div className="text-sm text-morandi-secondary leading-relaxed">
              可單獨販售的加值包、跟月費 module 分開計費。
              客戶購買後即可讀取對應的公共資料、或使用對應加值能力。
              寫權限（編輯資料）另由
              <Badge variant="outline" className="mx-1 font-mono text-xs">
                shared_data.X.write
              </Badge>
              capability 控、預設只給漫途 + 角落。
            </div>
          </div>
        </div>
      </div>

      {/* Addon 清單 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {addonFeatures.map(addon => {
          const Icon = ADDON_ICONS[addon.code] ?? Database
          const enabled = isEnabled(addon.code)
          return (
            <div
              key={addon.code}
              className="rounded-[24px] p-5 bg-gradient-to-t from-white to-morandi-cream border-[3px] border-white shadow-[rgba(180,160,120,0.15)_0px_12px_24px_-8px]"
            >
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
                    <div className="font-semibold text-morandi-primary">{addon.name}</div>
                    <p className="text-sm text-morandi-secondary mt-1 leading-relaxed">
                      {addon.description}
                    </p>
                    <div className="mt-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {addon.code}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={next => onToggle(addon.code, next)}
                />
              </div>
            </div>
          )
        })}
      </div>

      {addonFeatures.length === 0 && (
        <div className="text-center py-12 text-morandi-secondary text-sm">
          目前沒有可供販售的附加服務。新加 addon module 在 src/modules/ 內、跑 codegen 即可。
        </div>
      )}
    </div>
  )
}
