'use client'

/**
 * TenantFeatureSection — 新增租戶時的功能勾選
 *
 * William 2026-05-30：拆掉「輕量/標準/進階/旗艦」版本套餐、改成逐項勾選要開的功能、
 * 預設全關。系統運作必要的基礎功能（dashboard / settings / hr / database / quotes /
 * itinerary 等）由後端自動開通、不在此清單。功能清單與租戶詳情頁總覽 tab 一致。
 */

import { Check } from 'lucide-react'

interface FeatureToggle {
  code: string
  name: string
  note?: string
}

// 核心業務功能
const CORE_FEATURES: FeatureToggle[] = [
  { code: 'tours', name: '旅遊團（含報價單）' },
  { code: 'orders', name: '訂單管理' },
  { code: 'finance', name: '財務系統' },
  { code: 'database.customers', name: '顧客管理' },
  { code: 'accounting', name: '會計系統' },
  { code: 'hr_salary_settlement', name: '薪資結算' },
  { code: 'hr_bonus_settlement', name: '獎金結算' },
]

// 加值 / 可選功能
const ADDON_FEATURES: FeatureToggle[] = [
  { code: 'calendar', name: '行事曆' },
  { code: 'todos', name: '待辦事項' },
  { code: 'channels', name: '溝通頻道' },
  { code: 'channels.happy', name: 'HAPPY 機器人' },
  { code: 'ai_hub', name: 'AI Hub' },
  { code: 'esim', name: 'eSIM 管理', note: '開發中' },
  { code: 'documents', name: '文件中心' },
  { code: 'tours.contract', name: '電子合約系統' },
  { code: 'tours.display-itinerary', name: '展示行程' },
  { code: 'hr.severance', name: '資遣試算' },
]

interface Props {
  selectedFeatures: string[]
  onChange: (features: string[]) => void
}

export function TenantFeatureSection({ selectedFeatures, onChange }: Props) {
  const toggle = (code: string) => {
    if (selectedFeatures.includes(code)) {
      onChange(selectedFeatures.filter(c => c !== code))
    } else {
      onChange([...selectedFeatures, code])
    }
  }

  const renderGroup = (title: string, list: FeatureToggle[]) => (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-morandi-primary">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {list.map(({ code, name, note }) => {
          const checked = selectedFeatures.includes(code)
          return (
            <button
              key={code}
              type="button"
              onClick={() => toggle(code)}
              title={note}
              className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full transition-all ${
                checked
                  ? 'bg-morandi-gold/20 text-morandi-primary hover:bg-morandi-gold/30'
                  : 'bg-morandi-container/20 text-morandi-secondary hover:bg-morandi-container/40'
              }`}
            >
              {checked && <Check className="h-2.5 w-2.5" />}
              {name}
              {note && <span className="text-morandi-secondary">（{note}）</span>}
            </button>
          )
        })}
      </div>
    </div>
  )

  return (
    <section className="space-y-3">
      <div>
        <p className="text-sm font-medium text-morandi-primary">功能開通</p>
        <p className="text-xs text-morandi-secondary mt-0.5">
          勾選要開通的功能、預設全關。建立後可在租戶詳情再調整。
        </p>
      </div>
      {renderGroup('核心業務', CORE_FEATURES)}
      {renderGroup('加值功能', ADDON_FEATURES)}
    </section>
  )
}
