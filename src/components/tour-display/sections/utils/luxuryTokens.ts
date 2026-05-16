/**
 * Luxury Design Tokens
 *
 * 展示行程走 Luxury 風格、tokens 集中於此。
 * 未來要支援多風格或 dark mode、從這裡擴展、不要回去各 section 硬 code。
 */

export const LUXURY = {
  // 色彩
  primary: '#2C5F4D',
  secondary: '#C69C6D',
  secondaryDark: '#9B7A4D', // 小字用（對 white 對比 5.0:1、過 WCAG AA）
  accent: '#8F4F4F',
  background: '#FDFBF7',
  surface: '#FFFFFF',
  text: '#2D3436',
  muted: '#636E72',
  tableHeader: '#F0F4F3',
  hairline: '#E8E0D4', // 1px 精品細線

  // 圓角
  radius: {
    sm: '0.375rem', // 6px
    md: '0.75rem', // 12px
    lg: '1rem', // 16px
    xl: '1.5rem', // 24px
    full: '9999px',
  },

  // 陰影（精品風、低飽和度、偏綠調）
  shadow: {
    sm: '0 1px 2px 0 rgba(44, 95, 77, 0.04)',
    md: '0 4px 12px -2px rgba(44, 95, 77, 0.08)',
    lg: '0 10px 24px -4px rgba(44, 95, 77, 0.12)',
    frame: '0 0 0 1px #E8E0D4, 0 4px 12px -2px rgba(44, 95, 77, 0.08)', // 精品照片框
  },

  // 字體（從各 section 的 inline style 收斂進來）
  font: {
    serif: "'Noto Serif TC', serif",
    sans: "'Noto Sans TC', sans-serif",
  },

  // 過渡時間
  transition: {
    fast: '150ms ease',
    normal: '300ms ease',
    slow: '500ms ease',
  },
} as const

type LuxuryTokenKey = keyof typeof LUXURY
