'use client'

import { NextStepProvider, NextStep, useNextStep } from 'nextstepjs'
import type { Step } from 'nextstepjs'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useSidebarTour } from '@/lib/tours/sidebar-tour'
import { getVisibleSettingsSteps } from '@/lib/tours/settings-tour'
import { TourCard } from './TourCard'

/**
 * 導覽控制器
 *
 * 封裝 NextStepjs 的 Provider + 氣泡 + 腳本 + 莫蘭迪卡片，
 * 包在 (main)/layout 最外層、涵蓋所有有側邊欄的頁面。
 *
 * 管兩個導覽：
 *   - 'sidebar'：進首頁自動跑（介紹側邊欄）
 *   - 'settings'：進公司設定頁自動跑（逐欄介紹）；步驟用 getVisibleSettingsSteps()
 *     在 DOM ready 後過濾「畫面上真的有的欄位」，UI 改了不會指空（防護）。
 *
 * 階段 B 待做：讀 user_preferences「看過就不跑」+「重看導覽」入口 + 跨頁接續。
 */

const SETTINGS_PATHS = ['/settings/company', '/settings']
const isSettingsPath = (pathname: string) => SETTINGS_PATHS.includes(pathname)

function TourAutoStart({
  settingsReady,
  onPrepareSettings,
}: {
  settingsReady: boolean
  onPrepareSettings: (steps: Step[]) => void
}) {
  const { startNextStep } = useNextStep()
  const pathname = usePathname()
  const startedSidebar = useRef(false)
  const startedSettings = useRef(false)

  // 首頁：側邊欄導覽
  useEffect(() => {
    if ((pathname === '/' || pathname === '/dashboard') && !startedSidebar.current) {
      startedSidebar.current = true
      // 延遲讓側邊欄先 render 完、selector 才找得到錨點
      const timer = setTimeout(() => startNextStep('sidebar'), 1000)
      return () => clearTimeout(timer)
    }
  }, [pathname, startNextStep])

  // 公司設定頁：DOM ready 後過濾「畫面上有的欄位」、設定 steps
  useEffect(() => {
    if (isSettingsPath(pathname) && !startedSettings.current) {
      const timer = setTimeout(() => onPrepareSettings(getVisibleSettingsSteps()), 900)
      return () => clearTimeout(timer)
    }
  }, [pathname, onPrepareSettings])

  // settings steps 準備好（已進 NextStep prop）→ 才觸發，避免 steps 還沒進去就啟動
  useEffect(() => {
    if (settingsReady && !startedSettings.current && isSettingsPath(pathname)) {
      startedSettings.current = true
      startNextStep('settings')
    }
  }, [settingsReady, pathname, startNextStep])

  return null
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const sidebarTour = useSidebarTour()
  const [settingsSteps, setSettingsSteps] = useState<Step[]>([])

  const steps =
    settingsSteps.length > 0
      ? [...sidebarTour, { tour: 'settings', steps: settingsSteps }]
      : sidebarTour

  // 公司設定導覽：每步切換時，自己「瞬間定位」把欄位帶到視野中央。
  // 為什麼自己帶：NextStep 內建是「平滑捲動」（動畫），高亮框只算一次會跟不上 → 錯位；
  // 改成 behavior:'auto'（瞬間）讓欄位先到位、框才算得準。
  // 只對「不在畫面上」的欄位捲（已在畫面的不亂動，免得它也錯位）。
  const handleStepChange = (step: number, tourName: string | null) => {
    if (tourName !== 'settings') return
    const selector = settingsSteps[step]?.selector
    if (!selector) return
    const el = document.querySelector(selector)
    if (!el) return
    const rect = el.getBoundingClientRect()
    const fullyInView = rect.top >= 0 && rect.bottom <= window.innerHeight
    if (!fullyInView) {
      el.scrollIntoView({ block: 'center', behavior: 'auto' })
    }
  }

  return (
    <NextStepProvider>
      <NextStep
        steps={steps}
        cardComponent={TourCard}
        displayArrow={false}
        shadowRgb="44, 40, 36"
        shadowOpacity="0.72"
        scrollToTop={false}
        noInViewScroll={true}
        onStepChange={handleStepChange}
      >
        <TourAutoStart
          settingsReady={settingsSteps.length > 0}
          onPrepareSettings={setSettingsSteps}
        />
        {children}
      </NextStep>
    </NextStepProvider>
  )
}
