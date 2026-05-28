'use client'

import type { Step } from 'nextstepjs'

/**
 * 公司設定頁導覽腳本（氣泡逐格介紹欄位）
 *
 * 錨點用公司設定頁現成的 #field-* id（CompanyInfoCard 各欄位 div）。
 *
 * 🛡 防護（解 William 擔心的「UI 改了導覽擱著跑」）：
 *   getVisibleSettingsSteps() 會用 querySelector 過濾掉「畫面上找不到的欄位」，
 *   所以之後移除某欄位，導覽自動少講那一格、不會指空或卡住。
 *   （加新欄位仍要手動在這裡補一筆——加東西要講、拿掉不用。）
 */

const baseStep = {
  icon: null,
  side: 'bottom' as const,
  showControls: true,
  showSkip: true,
  pointerPadding: 6,
  pointerRadius: 8,
  disableInteraction: true,
}

// 候選步驟（對應公司設定頁現有欄位）。順序照頁面由上到下。
const SETTINGS_STEP_CANDIDATES: Step[] = [
  {
    ...baseStep,
    title: '法定公司名稱',
    content: '公司的正式法定名稱，會印在合約、發票、報價單上。',
    selector: '#field-legal_name',
  },
  {
    ...baseStep,
    title: '公司統編',
    content: '公司統一編號（8 碼）。請再次確認沒打錯——報稅、開發票都靠它。',
    selector: '#field-tax_id',
  },
  {
    ...baseStep,
    title: '公司標語',
    content: '一句話傳達公司理念或特色，會顯示在對外文件（報價單、行程表）的公司抬頭下方。',
    selector: '#field-subtitle',
  },
  {
    ...baseStep,
    title: '公司地址',
    content: '公司地址，會出現在對外單據上。',
    selector: '#field-address',
  },
  {
    ...baseStep,
    title: '公司官網',
    content: '公司官網網址，方便客戶連過去看。',
    selector: '#field-website',
  },
  {
    ...baseStep,
    title: '公司電話',
    content: '公司聯絡電話。',
    selector: '#field-phone',
  },
  {
    ...baseStep,
    title: '公司傳真',
    content: '公司傳真號碼，沒有可以留空。',
    selector: '#field-fax',
  },
  {
    ...baseStep,
    title: '客服信箱',
    content: '對外客服信箱，客戶聯絡用。',
    selector: '#field-email',
  },
  {
    ...baseStep,
    title: '公司 Logo',
    content: '上傳公司 Logo，會印在帳單、報價單等單據的頁首；上傳後可微調位置與大小。',
    selector: '#field-logo_url',
    side: 'top',
  },
  {
    ...baseStep,
    title: '公司大章',
    content: '公司大章，用在合約、正式對外文件上。',
    selector: '#field-company_seal_url',
    side: 'top',
  },
  {
    ...baseStep,
    title: '公司小章',
    content: '公司小章 / 負責人章，用在一般單據。',
    selector: '#field-personal_seal_url',
    side: 'top',
  },
  {
    ...baseStep,
    title: '發票章',
    content: '代收轉付發票專用的印章。',
    selector: '#field-invoice_seal_image_url',
    side: 'top',
  },
  {
    ...baseStep,
    title: '旅行屬性功能設定',
    content: '設定可開的旅遊團類型——方便未來分析公司營運方向。',
    selector: '#field-tour-attributes',
    side: 'top',
  },
]

/**
 * 過濾出「畫面上真的存在」的步驟（防 UI 改後指空 / 卡住）。
 * 在 client、DOM ready 後呼叫（導覽觸發前）。
 */
export function getVisibleSettingsSteps(): Step[] {
  if (typeof document === 'undefined') return SETTINGS_STEP_CANDIDATES
  return SETTINGS_STEP_CANDIDATES.filter(
    s => !s.selector || document.querySelector(s.selector) !== null
  )
}
