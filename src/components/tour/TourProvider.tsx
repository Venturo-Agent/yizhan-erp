'use client'

import { NextStepProvider, NextStep, useNextStep } from 'nextstepjs'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { useSidebarTour } from '@/lib/tours/sidebar-tour'
import { TourCard } from './TourCard'

/**
 * 導覽控制器
 *
 * 封裝 NextStepjs 的 Provider + 氣泡 + 腳本 + 莫蘭迪卡片，
 * 包在 (main)/layout 最外層、涵蓋所有有側邊欄的頁面。
 *
 * 階段 A（demo）：進首頁自動跑一次側邊欄導覽，方便看感覺；重新整理首頁可重看。
 * 階段 B：改成讀 user_preferences「看過就不跑」+ 個人偏好裡加「重看導覽」入口
 *         + 跨頁導覽（nextRoute）。
 */
function TourAutoStart() {
  const { startNextStep } = useNextStep()
  const pathname = usePathname()
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    // 只在首頁自動起跑（避免每切一頁就跳）
    if (pathname !== '/' && pathname !== '/dashboard') return
    started.current = true
    // 延遲讓側邊欄先 render 完、selector 才找得到錨點
    const timer = setTimeout(() => startNextStep('sidebar'), 1000)
    return () => clearTimeout(timer)
  }, [pathname, startNextStep])

  return null
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const sidebarTour = useSidebarTour()
  return (
    <NextStepProvider>
      <NextStep
        steps={sidebarTour}
        cardComponent={TourCard}
        displayArrow={false}
        shadowRgb="44, 40, 36"
        shadowOpacity="0.72"
      >
        <TourAutoStart />
        {children}
      </NextStep>
    </NextStepProvider>
  )
}
