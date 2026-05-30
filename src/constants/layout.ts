/**
 * Layout Constants
 * 版面配置相關常數
 */

// Header
const _HEADER_HEIGHT = 72 // px
export const HEADER_HEIGHT_PX = '72px'

// Sidebar
const _SIDEBAR_WIDTH_EXPANDED = 180 // px (與 Sidebar 的 w-[180px] 一致)
const _SIDEBAR_WIDTH_COLLAPSED = 64 // px (與 Sidebar 的 w-16 一致)
export const SIDEBAR_WIDTH_EXPANDED_PX = '180px'
export const SIDEBAR_WIDTH_COLLAPSED_PX = '64px'

// Transitions
export const LAYOUT_TRANSITION_DURATION = 300 // ms

// Pages without sidebar
export const NO_SIDEBAR_PAGES = [
  '/login',
  '/no-access',
  '/view', // 分享的行程預覽頁面（無需登入、無側邊欄）
]

// Pages with custom layout (no padding, full height)
// 註：用「pathname === page || startsWith(page + '/')」精確匹配、避免 /workspace 誤吃 /workspaces
// 5/13 William 拍板：channels 是沉浸式對話、跟 Slack 一致、不要 framework padding / header
// 5/15 William 拍板：/ai 從沉浸式拿掉、改用標準 ContentPageLayout
// 2026-05-21 William 翻回沉浸式：跟 /channels 視覺統一、sidebar header 加齒輪 / 收側欄 / 新增
//   設定本身走 sidebar header 的齒輪 → 滿版 dialog、不再需要主標題區
export const CUSTOM_LAYOUT_PAGES = ['/editor', '/design/new', '/channels', '/ai']
