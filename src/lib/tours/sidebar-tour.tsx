'use client'

import type { Tour, Step } from 'nextstepjs'
import { useWorkspaceFeatures } from '@/lib/permissions'
import { useMyCapabilities } from '@/lib/permissions/useMyCapabilities'
import { SIDEBAR_ORDER, SIDEBAR_META } from '@/components/layout/sidebar-config'
import { ALL_MODULES } from '@/modules/_registry'

/**
 * 側邊欄新手導覽腳本（動態版）
 *
 * 1) 跟著側邊欄走：遍歷 SIDEBAR_ORDER（同序），只保留使用者實際看得到的項目。
 *      可見判斷 = feature 有開（isFeatureEnabled）+ 員工有讀權限（canReadAnyInModule）
 *      —— 跟 sidebar.tsx filterMenuByPermissions 同一套規則。沒開的功能自動跳過。
 * 2) 錨點 selector 跟 sidebar 同源計算（避免「code ≠ 網址」框錯，如 database → /library）。
 * 3) EXCLUDED：租戶管理（workspaces）是漫途自己管所有租戶用的、客戶不會用，導覽不介紹。
 */

// 不介紹的模組（客戶用不到）
const EXCLUDED = new Set<string>(['workspaces'])

// 各模組導覽說明
const STEP_CONTENT: Record<string, string> = {
  dashboard: '隨時點這裡回到總覽，看你今天該關注的重點。',
  calendar: '你的行程、團期、重要日子，都在這張日曆上。',
  todos: '像便利貼一樣管理待辦事項，拖拉就能換狀態。',
  channels: '跟同事的訊息、溝通都集中在這裡。',
  ai_hub: 'AI 工具集中在這，幫你加速日常工作。',
  tours: '管理團體行程：開團、排行程、出團都在這裡。',
  orders: '客人的訂單、收款狀態，在這裡一目了然。',
  finance: '點右邊的箭頭會展開子選單（收款、請款、出納…）。其他有箭頭的選單也一樣。',
  accounting: '傳票、科目、期末結轉、會計報表都在這裡。',
  hr: '員工、組織、薪資、獎金都在這裡管理。',
  documents: '公司的文件、檔案集中在這裡管理。',
  database: '顧客、供應商、旅遊資料庫，都在這裡維護。',
  marketing: '行銷活動與推廣工具都在這裡。',
  websites: '對外的客戶官網在這裡管理。',
  shared_data_management: '跨單位共用的基礎資料在這裡維護。',
  platform_integrations: '串接第三方服務（如 AiToEarn）。',
}

// 算某 module 在 sidebar 的 data-tutorial 錨點（跟 sidebar.tsx 的 href 算法同源）
function navSelector(code: string): string {
  const href = SIDEBAR_META[code]?.href ?? ALL_MODULES.find(m => m.code === code)?.routes[0] ?? ''
  const key = href.replace(/^\//, '').split('/')[0]
  return `[data-tutorial="nav-${key}"]`
}

// 固定步驟：開頭框整條側邊欄
const logoStep: Step = {
  icon: null,
  title: '歡迎使用 一棧 ERP',
  content: '左邊這一整條就是主選單，整套系統的功能都從這裡進去。接下來帶你認識各個功能。',
  selector: '[data-tutorial="sidebar-root"]',
  side: 'right',
  showControls: true,
  showSkip: true,
  pointerPadding: 4,
  pointerRadius: 0,
}

// 固定步驟：結尾介紹個人區
// side='right-top'（右側、頂端對齊）+ TourCard 對最後一步手動往上推，
// 達成「右側、下緣對齊、往上長」—— 繞過 NextStepjs 防切機制把 right-bottom 翻成往下的毛病。
const userStep: Step = {
  icon: null,
  title: '你的個人區',
  content:
    '最下面是你的名字、個人偏好（齒輪）和登出。這個齒輪改的是「你自己」的偏好——頭像、配色、字體、密碼，屬於個人設定。',
  selector: '[data-tutorial="sidebar-user"]',
  side: 'right-top',
  showControls: true,
  showSkip: true,
  pointerPadding: 4,
  pointerRadius: 8,
}

/**
 * 動態生成側邊欄導覽：跟著使用者實際看得到的側邊欄、逐項介紹（排除租戶管理）。
 * 用法：在 client component 內 const steps = useSidebarTour()
 */
export function useSidebarTour(): Tour[] {
  const { isFeatureEnabled } = useWorkspaceFeatures()
  const { canReadAnyInModule, has } = useMyCapabilities()

  // 跟 sidebar.tsx filterMenuByPermissions 一致：feature 有開 + 有讀權限才算可見
  const isVisible = (code: string) => isFeatureEnabled(code) && canReadAnyInModule(code)

  const moduleSteps: Step[] = SIDEBAR_ORDER.filter(
    code => !EXCLUDED.has(code) && isVisible(code)
  ).map(code => ({
    icon: null,
    title: SIDEBAR_META[code]?.label ?? code,
    content: STEP_CONTENT[code] ?? '',
    selector: navSelector(code),
    side: 'right',
    showControls: true,
    showSkip: true,
    pointerPadding: 4,
    pointerRadius: 8,
  }))

  // 公司設定：選單最下方的「設定」項目（需 settings.company.read，跟 sidebar 一致）
  const settingsSteps: Step[] = has('settings.company.read')
    ? [
        {
          icon: null,
          title: '設定（公司設定）',
          content:
            '這是改「公司」的設定——法人資料、銀行帳號、Logo、結帳與獎金政策…只有有權限的人看得到。',
          selector: '[data-tutorial="nav-settings"]',
          side: 'right',
          showControls: true,
          showSkip: true,
          pointerPadding: 4,
          pointerRadius: 8,
        },
      ]
    : []

  return [
    {
      tour: 'sidebar',
      steps: [logoStep, ...moduleSteps, ...settingsSteps, userStep],
    },
  ]
}
