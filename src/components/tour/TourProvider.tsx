'use client'

import { NextStepProvider, NextStep, useNextStep } from 'nextstepjs'
import type { Step } from 'nextstepjs'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useSidebarTour } from '@/lib/tours/sidebar-tour'
import { getVisibleSettingsSteps } from '@/lib/tours/settings-tour'
import { toursTour } from '@/lib/tours/tours-tour'
import { openTourTour } from '@/lib/tours/open-tour-tour'
import { openProposalTour } from '@/lib/tours/open-proposal-tour'
import { hrRolesTour } from '@/lib/tours/hr-roles-tour'
import { hrEmployeesTour } from '@/lib/tours/hr-employees-tour'
import { disbursementTour } from '@/lib/tours/disbursement-tour'
import { financePaymentsTour } from '@/lib/tours/finance-payments-tour'
import { financeRequestsTour } from '@/lib/tours/finance-requests-tour'
import { tourOrdersTour } from '@/lib/tours/tour-orders-tour'
import { orderMembersTour } from '@/lib/tours/order-members-tour'
import { addReceiptTour } from '@/lib/tours/add-receipt-tour'
import { addRequestTour } from '@/lib/tours/add-request-tour'
import { isTourEnabled, markTourSeen } from '@/lib/tours/tour-preferences'
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
const HR_ROLES_PATHS = ['/hr/roles']
const HR_EMPLOYEES_PATHS = ['/hr']
const DISBURSEMENT_PATHS = ['/finance/treasury/disbursement']
const PAYMENTS_PATHS = ['/finance/payments']
const REQUESTS_PATHS = ['/finance/requests']

const isSettingsPath = (pathname: string) => SETTINGS_PATHS.includes(pathname)
const isToursPath = (pathname: string) => TOURS_PATHS.includes(pathname)
const isHrRolesPath = (pathname: string) => HR_ROLES_PATHS.includes(pathname)
const isHrEmployeesPath = (pathname: string) => HR_EMPLOYEES_PATHS.includes(pathname)
const isDisbursementPath = (pathname: string) => DISBURSEMENT_PATHS.includes(pathname)
const isPaymentsPath = (pathname: string) => PAYMENTS_PATHS.includes(pathname)
const isRequestsPath = (pathname: string) => REQUESTS_PATHS.includes(pathname)
// 團詳情頁 pattern：/tours/<code>（含中文 / 編號）、排除 /tours 列表本身跟 /tours/<code>/display-editor 子頁
const isTourDetailPath = (pathname: string) =>
  pathname.startsWith('/tours/') &&
  !TOURS_PATHS.includes(pathname) &&
  !pathname.includes('/display-editor')

function TourAutoStart({
  settingsReady,
  onPrepareSettings,
}: {
  settingsReady: boolean
  onPrepareSettings: (steps: Step[]) => void
}) {
  const { startNextStep } = useNextStep()
  const pathname = usePathname()

  // 包裝：只有教學偏好開著才真的觸發、否則跳過（看過 + 還沒勾回來 = 不煩）
  const startIfEnabled = (name: string) => {
    if (isTourEnabled(name)) startNextStep(name)
  }
  const startedSidebar = useRef(false)
  const startedSettings = useRef(false)
  const startedTours = useRef(false)
  const startedHrRoles = useRef(false)
  // hr-employees 由 hr-roles 完成事件帶過來、不能直接看 pathname 自動跑、
  // 用旗標：收到 event 才允許下一次進 /hr 時起跑。
  const pendingHrEmployees = useRef(false)
  const startedHrEmployees = useRef(false)
  const startedDisbursement = useRef(false)
  const startedPayments = useRef(false)
  const startedRequests = useRef(false)
  const startedTourOrders = useRef(false)
  // order-members 由 dialog open event 觸發、不靠 pathname（dialog 是 modal、URL 不變）
  // 每次 dialog 重開都 reset、讓 user 重看（除非偏好已關）
  const startedOrderMembers = useRef(false)
  const startedAddReceipt = useRef(false)
  const startedAddRequest = useRef(false)

  // 首頁：側邊欄導覽
  useEffect(() => {
    if ((pathname === '/' || pathname === '/dashboard') && !startedSidebar.current) {
      startedSidebar.current = true
      const timer = setTimeout(() => startIfEnabled('sidebar'), 1000)
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
      startIfEnabled('settings')
    }
  }, [settingsReady, pathname, startNextStep])

  // 旅遊團頁：步驟固定（無動態欄位），直接觸發
  useEffect(() => {
    if (isToursPath(pathname) && !startedTours.current) {
      startedTours.current = true
      const timer = setTimeout(() => startIfEnabled('tours'), 800)
      return () => clearTimeout(timer)
    }
  }, [pathname, startNextStep])

  // 職務管理頁：進去後等 RoleListPanel 載入（roles SWR + 預設選中第一筆需時間）
  useEffect(() => {
    if (isHrRolesPath(pathname) && !startedHrRoles.current) {
      startedHrRoles.current = true
      const timer = setTimeout(() => startIfEnabled('hr-roles'), 1000)
      return () => clearTimeout(timer)
    }
  }, [pathname, startNextStep])

  // 監聽 hr-roles 完成事件：標記「下一次進 /hr 要跑 hr-employees」
  useEffect(() => {
    const handler = () => {
      pendingHrEmployees.current = true
    }
    window.addEventListener('venturo:hr-roles-done', handler)
    return () => window.removeEventListener('venturo:hr-roles-done', handler)
  }, [])

  // 員工列表頁：只有「pending 旗標 + 第一次進」才自動跑（不像 sidebar 是每次登入跑）
  useEffect(() => {
    if (isHrEmployeesPath(pathname) && pendingHrEmployees.current && !startedHrEmployees.current) {
      startedHrEmployees.current = true
      pendingHrEmployees.current = false
      const timer = setTimeout(() => startIfEnabled('hr-employees'), 800)
      return () => clearTimeout(timer)
    }
  }, [pathname, startNextStep])

  // 出納管理頁：步驟固定（無動態欄位）、直接觸發
  useEffect(() => {
    if (isDisbursementPath(pathname) && !startedDisbursement.current) {
      startedDisbursement.current = true
      const timer = setTimeout(() => startIfEnabled('disbursement'), 800)
      return () => clearTimeout(timer)
    }
  }, [pathname, startNextStep])

  // 收款管理頁
  useEffect(() => {
    if (isPaymentsPath(pathname) && !startedPayments.current) {
      startedPayments.current = true
      const timer = setTimeout(() => startIfEnabled('finance-payments'), 800)
      return () => clearTimeout(timer)
    }
  }, [pathname, startNextStep])

  // 請款管理頁
  useEffect(() => {
    if (isRequestsPath(pathname) && !startedRequests.current) {
      startedRequests.current = true
      const timer = setTimeout(() => startIfEnabled('finance-requests'), 800)
      return () => clearTimeout(timer)
    }
  }, [pathname, startNextStep])

  // 團詳情訂單 tab：預設 activeTab='orders'、進去後 tour-orders-content 錨點就在 DOM
  // 1500ms delay 等 OrderListView 動態 import + useOrdersSlim SWR
  useEffect(() => {
    if (isTourDetailPath(pathname) && !startedTourOrders.current) {
      startedTourOrders.current = true
      const timer = setTimeout(() => startIfEnabled('tour-orders'), 1500)
      return () => clearTimeout(timer)
    }
  }, [pathname, startNextStep])

  // 訂單成員 dialog 開啟：由 OrderMembersDialog 派 event 觸發
  // 1000ms delay 等 OrderMembersExpandable lazy import + toolbar 投影到 DialogHeader
  useEffect(() => {
    const handler = () => {
      if (startedOrderMembers.current) return
      startedOrderMembers.current = true
      setTimeout(() => startIfEnabled('order-members'), 1000)
    }
    window.addEventListener('venturo:order-members-opened', handler)
    return () => window.removeEventListener('venturo:order-members-opened', handler)
  }, [])

  // 新增收款 dialog 開啟
  useEffect(() => {
    const handler = () => {
      if (startedAddReceipt.current) return
      startedAddReceipt.current = true
      setTimeout(() => startIfEnabled('add-receipt'), 800)
    }
    window.addEventListener('venturo:add-receipt-opened', handler)
    return () => window.removeEventListener('venturo:add-receipt-opened', handler)
  }, [])

  // 新增請款 dialog 開啟
  useEffect(() => {
    const handler = () => {
      if (startedAddRequest.current) return
      startedAddRequest.current = true
      setTimeout(() => startIfEnabled('add-request'), 800)
    }
    window.addEventListener('venturo:add-request-opened', handler)
    return () => window.removeEventListener('venturo:add-request-opened', handler)
  }, [])

  return null
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const sidebarTour = useSidebarTour()
  const router = useRouter()
  const [settingsSteps, setSettingsSteps] = useState<Step[]>([])

  const steps = [
    ...sidebarTour,
    ...(settingsSteps.length > 0 ? [{ tour: 'settings', steps: settingsSteps }] : []),
    ...toursTour,
    ...openTourTour,
    ...openProposalTour,
    ...hrRolesTour,
    ...hrEmployeesTour,
    ...disbursementTour,
    ...financePaymentsTour,
    ...financeRequestsTour,
    ...tourOrdersTour,
    ...orderMembersTour,
    ...addReceiptTour,
    ...addRequestTour,
  ]

  // tours 工具列導覽跑完 → 自動觸發「開團」dialog，接續 open-tour 教學
  // hr-roles 跑完  → 派 event 設旗標 + 切到 /hr、由 hr-employees 接續
  //（透過 CustomEvent 解耦、不直接 import handler）
  // 任何 tour 跑完 → markTourSeen(name)、下次進不再自動跑（除非 user 在個人偏好勾回來）
  const handleTourComplete = (tourName: string | null) => {
    if (tourName) {
      markTourSeen(tourName)
    }
    if (tourName === 'tours') {
      window.dispatchEvent(new CustomEvent('venturo:open-tour-dialog'))
    }
    if (tourName === 'hr-roles') {
      window.dispatchEvent(new CustomEvent('venturo:hr-roles-done'))
      router.push('/hr')
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
