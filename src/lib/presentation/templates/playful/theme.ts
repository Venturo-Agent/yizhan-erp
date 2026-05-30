/**
 * theme.ts — Playful 模板 theme
 *
 * Morandi Warm Gold（莫蘭迪暖金）
 * 風格：圓角卡片、暖色系、大量留白
 * 適合：客戶提案、旅客分享
 */

export const playfulTheme = {
  // 主色系
  primary: '3a3633', // warm dark text
  secondary: '8b8680', // warm gray
  accent: 'c9aa7c', // morandi gold
  light: 'f5f0e8', // light cream card bg
  bg: 'fff8f0', // warm cream slide bg

  // 強調色
  coral: 'f07167', // coral red (Day badge, CTA)
  green: '9fa68f', // muted green (success)

  // 字體
  fontChinese: 'Microsoft YaHei',
  fontEnglish: 'Arial',

  // 圓角半徑
  radius: {
    card: 0.15, // 卡片圓角
    badge: 0.1, // 小標籤圓角
    pill: 0.25, // 藥丸形
  },

  // 間距
  spacing: {
    margin: 0.5,
    gap: 0.25,
    padding: 0.2,
  },

  // 頁面安全範圍
  safeZone: {
    left: 0.5,
    right: 0.5,
    top: 0.4,
    bottom: 0.4,
  },
} as const

export type PresentationTheme = typeof playfulTheme
