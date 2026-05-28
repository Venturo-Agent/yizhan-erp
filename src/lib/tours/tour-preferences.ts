'use client'

/**
 * 教學偏好管理（SSOT）
 *
 * 管 7 個 tour 的「開 / 關」、用 localStorage 跨頁共享、不跨裝置（W 5/28 拍板：先本機、之後客戶嫌再升 DB）。
 *
 * 規則：
 * - 預設「開」（首次登入或第一次看到、自動跑）
 * - tour 跑完 → 自動「關」（不再煩、除非 user 自己重開）
 * - 個人偏好 dialog 可手動勾 / 取消勾、或一鍵「全部重看」
 *
 * localStorage key 結構：
 *   venturo:tour-prefs = { sidebar: false, settings: true, ... }
 *
 * 為什麼自己管不靠 nextstepjs：nextstepjs 沒記憶機制、每次自動跑、user 覺得煩。
 */

import { useEffect, useState, useCallback } from 'react'

// ============ Tour 定義（SSOT） ============

export interface TourDefinition {
  name: string
  label: string
  description: string
}

/**
 * 所有可開關的 tour 中央定義。
 * 加新 tour 後、來這裡補一行、個人偏好 UI 自動列出。
 */
export const TOUR_DEFINITIONS: TourDefinition[] = [
  {
    name: 'sidebar',
    label: '側邊欄導覽',
    description: '進首頁時、介紹左側 17 個模組',
  },
  {
    name: 'settings',
    label: '公司設定',
    description: '進公司設定頁時、介紹識別 / 聯絡 / Logo / 大小章 / 旅行屬性',
  },
  {
    name: 'tours',
    label: '旅遊團管理',
    description: '進旅遊團頁時、介紹工具列 / 5 個分頁 / 新增專案',
  },
  {
    name: 'open-tour',
    label: '開團表單',
    description: '建立正式團時、5 步引導：資訊 / 類型 / 目的地 / 訂單 / 建立',
  },
  {
    name: 'open-proposal',
    label: '提案 / 模板表單',
    description: '建立提案或模板時引導',
  },
  {
    name: 'hr-roles',
    label: '人資 — 職務管理',
    description: '進 /hr/roles 時、介紹建職務 / 功能權限 / 旅遊團權限對應團控 vs 業務',
  },
  {
    name: 'hr-employees',
    label: '人資 — 員工列表',
    description: '從職務管理串接過來、指員工新增按鈕',
  },
  {
    name: 'disbursement',
    label: '出納管理',
    description: '進 /finance/treasury/disbursement 時、介紹列表 / 批次匯款 / 出帳不可改',
  },
  {
    name: 'finance-payments',
    label: '收款管理',
    description: '進 /finance/payments 時、介紹團體收款 vs 公司收款的差別',
  },
  {
    name: 'finance-requests',
    label: '請款管理',
    description: '進 /finance/requests 時、介紹團體請款 / 公司請款 / 薪資的差別',
  },
  {
    name: 'tour-orders',
    label: '團詳情 — 訂單分頁',
    description: '進團詳情頁時、介紹一團多訂單概念 + 6 個操作按鈕用途',
  },
  {
    name: 'order-members',
    label: '訂單成員 dialog',
    description: '點訂單「成員」按鈕開啟 dialog 時、介紹 toolbar + PNR 配對概念',
  },
  {
    name: 'add-receipt',
    label: '新增收款 dialog',
    description: '點訂單「收款」/ 列表「新增收款」開 dialog 時、介紹 5 元素 + 確認流程',
  },
  {
    name: 'add-request',
    label: '新增請款 dialog',
    description: '點訂單「請款」/ 列表「新增請款」開 dialog 時、介紹流程 + 後續出納鏈',
  },
]

// ============ localStorage layer ============

const STORAGE_KEY = 'venturo:tour-prefs'

type TourPrefsMap = Record<string, boolean>

function readPrefs(): TourPrefsMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return {}
    return parsed as TourPrefsMap
  } catch {
    return {}
  }
}

function writePrefs(prefs: TourPrefsMap): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
    // 同分頁多 hook 同步：派 custom event（storage event 不會在同分頁觸發）
    window.dispatchEvent(new CustomEvent('venturo:tour-prefs-changed'))
  } catch {
    // localStorage 滿了或 disabled、忽略
  }
}

// ============ 純函式 API（給 TourProvider 用、不靠 React） ============

/**
 * 查單個 tour 是否啟用。
 * 預設 true（沒記憶 = 還沒跑過 = 該跑）；user 手動關 / 自動跑完後變 false。
 */
export function isTourEnabled(name: string): boolean {
  const prefs = readPrefs()
  return prefs[name] !== false
}

/** 設定單個 tour 是否啟用。 */
export function setTourEnabled(name: string, enabled: boolean): void {
  const prefs = readPrefs()
  prefs[name] = enabled
  writePrefs(prefs)
}

/** 標記某個 tour 為「看過了」（= 關）、跑完後 TourProvider 自動 call。 */
export function markTourSeen(name: string): void {
  setTourEnabled(name, false)
}

/** 一鍵全部重看（all true）。 */
export function resetAllTours(): void {
  const prefs: TourPrefsMap = {}
  for (const t of TOUR_DEFINITIONS) {
    prefs[t.name] = true
  }
  writePrefs(prefs)
}

// ============ React hook（給設定 UI 用） ============

/**
 * 訂閱教學偏好、回傳 reactive map + 操作函式。
 * 跨 hook 同步：監聽 'venturo:tour-prefs-changed' event。
 */
export function useTourPreferences() {
  const [prefs, setPrefs] = useState<TourPrefsMap>({})

  // 初始載入 + 訂閱變更
  useEffect(() => {
    setPrefs(readPrefs())
    const handler = () => setPrefs(readPrefs())
    window.addEventListener('venturo:tour-prefs-changed', handler)
    return () => window.removeEventListener('venturo:tour-prefs-changed', handler)
  }, [])

  const isEnabled = useCallback(
    (name: string) => {
      return prefs[name] !== false
    },
    [prefs]
  )

  const setEnabled = useCallback((name: string, enabled: boolean) => {
    setTourEnabled(name, enabled)
  }, [])

  const resetAll = useCallback(() => {
    resetAllTours()
  }, [])

  return {
    prefs,
    isEnabled,
    setEnabled,
    resetAll,
    definitions: TOUR_DEFINITIONS,
  }
}
