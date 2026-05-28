'use client'

import { NextStepProvider, NextStep, useNextStep } from 'nextstepjs'
import type { Step } from 'nextstepjs'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useSidebarTour } from '@/lib/tours/sidebar-tour'
import { getVisibleSettingsSteps } from '@/lib/tours/settings-tour'
import { toursTour } from '@/lib/tours/tours-tour'
import { openTourTour } from '@/lib/tours/open-tour-tour'
import { openProposalTour } from '@/lib/tours/open-proposal-tour'
import { TourCard } from './TourCard'

/**
 * 導覽控制器
 *
 * 封裝 NextStepjs 的 Provider + 氣泡 + 腳本 + 莫蘭迪卡片，
 * 包在 (main)/layout 最外層、涵蓋所有有側邊欄的頁面。
 *
 * 管 3 個導覽：
 *   - 'sidebar'：進首頁自動跑（介紹側邊欄）
 *   - 'settings'：進公司設定頁自動跑；步驟用 getVisibleSettingsSteps()
 *     在 DOM ready 後過濾「畫面上真的有的欄位」，UI 改了不會指空（防護）。
 *   - 'tours'：進旅遊團頁自動跑（介紹工具列 + 新增專案下拉）
 *
 * 階段 B 待做：讀 user_preferences「看過就不跑」+「重看導覽」入口 + 跨頁接續。
 */

const SETTINGS_PATHS = ['/settings/company', '/settings']
const TOURS_PATHS = ['/tours']

const isSettingsPath = (pathname: string) => SETTINGS_PATHS.includes(pathname)
const isToursPath = (pathname: string) => TOURS_PATHS.includes(pathname)

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
  const startedTours = useRef(false)

  // 首頁：側邊欄導覽
  useEffect(() => {
    if ((pathname === '/' || pathname === '/dashboard') && !startedSidebar.current) {
      startedSidebar.current = true
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

  // settings steps 準備好（已進 NextStep prop）→ 才觸發
  useEffect(() => {
    if (settingsReady && !startedSettings.current && isSettingsPath(pathname)) {
      startedSettings.current = true
      startNextStep('settings')
    }
  }, [settingsReady, pathname, startNextStep])

  // 旅遊團頁：步驟固定（無動態欄位），直接觸發
  useEffect(() => {
    if (isToursPath(pathname) && !startedTours.current) {
      startedTours.current = true
      const timer = setTimeout(() => startNextStep('tours'), 800)
      return () => clearTimeout(timer)
    }
  }, [pathname, startNextStep])

  return null
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const sidebarTour = useSidebarTour()
  const [settingsSteps, setSettingsSteps] = useState<Step[]>([])

  const steps = [
    ...sidebarTour,
    ...(settingsSteps.length > 0 ? [{ tour: 'settings', steps: settingsSteps }] : []),
    ...toursTour,
    ...openTourTour,
    ...openProposalTour,
  ]

  // tours 工具列導覽跑完 → 自動觸發「開團」dialog，接續 open-tour 教學
  // （透過 CustomEvent 通知 ToursPage 開 dialog；解耦不直接 import handler）
  const handleTourComplete = (tourName: string | null) => {
    if (tourName === 'tours') {
      window.dispatchEvent(new CustomEvent('venturo:open-tour-dialog'))
    }
  }

  // 公司設定導覽：每步切換時自己「瞬間定位」把欄位帶到視野中央。
  // 為什麼自己帶：NextStep 內建是「平滑捲動」（動畫），高亮框跟不上而錯位；
  // 改成 behavior:'auto'（瞬間）讓欄位先到位、框才算得準。
  // 只對 settings tour、且「不在畫面上」的欄位捲（已在畫面的不亂動）。
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
        onComplete={handleTourComplete}
        overlayZIndex={9999}
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
