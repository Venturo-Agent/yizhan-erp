/**
 * 永成款（Yongcheng）設計 Tokens
 *
 * 視覺基準：/Users/william/Downloads/tokyo-sendai-private-2026.html
 * 拍板：William 2026-05-17
 *
 * 規範來源：2026-05-17-展示行程引擎-yongcheng-engine-spec.md
 *
 * 為什麼集中放這裡：
 * - 色彩 / 字體 / 字級 / 間距集中、各 section 不准散刻
 * - 未來要做 dark mode 或別款主題、從這裡擴展
 */

export const YONGCHENG_COLORS = {
  ink: '#2D1F18',           // 深栗 主色（文字 / 主框）
  copper: '#C85A38',        // 紅銅 accent（數字 / 標題裝飾）
  paper: '#F5F0E8',         // 霧米 分區底色
  gold: '#E8B97D',          // 金色（V2 滿版圖封面用）
  rule: 'rgba(45,31,24,0.15)',       // 細分隔線
  ruleStrong: 'rgba(45,31,24,0.4)',  // 粗分隔線
  muted: 'rgba(45,31,24,0.55)',      // 次要文字
  white: '#FFFFFF',
} as const

export const YONGCHENG_FONTS = {
  // 標題：Noto Serif TC + Cormorant Garamond（西文裝飾）
  serif: "'Noto Serif TC', serif",
  // 內文：Noto Sans TC
  sans: "'Noto Sans TC', sans-serif",
  // 數字裝飾 / 英文 eyebrow：Cormorant Garamond Italic
  cormorant: "'Cormorant Garamond', serif",
} as const

/**
 * 字級系統（5 段）
 * 來源：規格書 § 5.4
 */
export const YONGCHENG_TEXT_SIZES = {
  xs: '12px',   // 注釋 / caption
  sm: '14px',   // 摘要 / 次要說明
  md: '16px',   // 正文（預設）
  lg: '20px',   // 景點標題
  xl: '28px',   // 封面大標
} as const

export const YONGCHENG_LINE_HEIGHTS = {
  compact: 1.4,
  normal: 1.7,  // 預設
  loose: 2.0,
} as const

/**
 * 全局 CSS 變數（給 styled-jsx 或 inline style 用）
 *
 * 用法：在 Layout 組件 root style 套用、子組件用 var(--ink) 取
 */
export const YONGCHENG_CSS_VARS: React.CSSProperties = {
  '--ink': YONGCHENG_COLORS.ink,
  '--copper': YONGCHENG_COLORS.copper,
  '--paper': YONGCHENG_COLORS.paper,
  '--gold': YONGCHENG_COLORS.gold,
  '--rule': YONGCHENG_COLORS.rule,
  '--rule-strong': YONGCHENG_COLORS.ruleStrong,
  '--muted': YONGCHENG_COLORS.muted,
} as React.CSSProperties

/**
 * Google Fonts 載入字串（給 Next.js head 或 layout 用）
 *
 * 為什麼三套字體：
 * - Noto Serif TC 中文標題
 * - Noto Sans TC 中文內文
 * - Cormorant Garamond 西文裝飾（數字 / 英文 eyebrow / italic）
 */
export const YONGCHENG_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@300;400;500;600;700&family=Noto+Sans+TC:wght@300;400;500;700&family=Cormorant+Garamond:wght@400;500;600&display=swap'

/**
 * 排版守則（Yongcheng Typography Principles v1）
 *
 * 1. 斷行語意優先：<br> 必須斷在意群之間
 * 2. 行末只能是句號（。）— 逗號、頓號、分號、開引號絕不放行末
 * 3. 標題 / hero 最後一行 ≥ 4 中文字
 * 4. body / 引言用 text-wrap: pretty + max-width 控制行寬
 * 5. 改寫優於將就 — 文案斷不乾淨拆成多個短句
 */
export const YONGCHENG_TEXT_STYLE: React.CSSProperties = {
  textWrap: 'pretty',
  wordBreak: 'keep-all',
  lineBreak: 'strict',
}
