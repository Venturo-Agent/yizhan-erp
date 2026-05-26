'use client'

import { useRouter } from 'next/navigation'
import { useMyCapabilities } from '@/lib/permissions/useMyCapabilities'
import { useWorkspaceFeatures } from '@/lib/permissions'

interface TabConfig {
  value: string
  label: string
  href: string
  adminOnly?: boolean
  /** 必須有此 feature 才顯示（workspace_features.{code}.enabled）*/
  requireFeature?: string
}

const ALL_TABS: TabConfig[] = [
  // 5/26：個人設定改走側邊欄底部「扳手」dialog、settings 區只剩公司設定
  { value: 'company', label: '公司設定', href: '/settings/company', adminOnly: true },
]

export function SettingsTabs() {
  const router = useRouter()
  const { has } = useMyCapabilities()
  const { isFeatureEnabled } = useWorkspaceFeatures()
  // 用 settings.company.read 守門（語意最對）— 鐵律：系統內沒有 user 特權、一律走具體 capability
  const canViewCompany = has('settings.company.read')

  // 依權限 + feature flag 過濾
  const tabs = ALL_TABS.filter(tab => {
    if (tab.adminOnly && !canViewCompany) return false
    if (tab.requireFeature && !isFeatureEnabled(tab.requireFeature)) return false
    return true
  })

  const activeTab = 'company'

  return (
    <div className="flex items-center gap-1">
      {tabs.map(tab => {
        const isActive = activeTab === tab.value
        return (
          <button
            key={tab.value}
            data-tutorial={`tab-${tab.value}`}
            onClick={() => router.push(tab.href)}
            className={`px-4 py-1.5 text-sm font-medium transition-colors relative ${
              isActive
                ? 'text-morandi-primary'
                : 'text-morandi-secondary hover:text-morandi-primary'
            }`}
          >
            {tab.label}
            {isActive && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-0.5 bg-morandi-gold rounded-full" />
            )}
          </button>
        )
      })}
    </div>
  )
}
