/**
 * Tour Page 統一主題系統
 *
 * 所有風格的配色、字體、陰影等集中定義
 * 元件只需接受 style prop，根據主題渲染
 */

export type TourStyle =
  | 'original'
  | 'luxury'
  | 'art'
  | 'dreamscape'
  | 'collage'
  | 'nature'
  | 'gemini'

export interface TourTheme {
  name: TourStyle
  colors: {
    primary: string // 主要強調色
    secondary: string // 次要強調色
    accent: string // 點綴色
    background: string // 區塊背景
    surface: string // 卡片表面
    text: string // 主要文字
    muted: string // 次要文字
    border: string // 邊框
  }
  fonts: {
    heading: string // 標題字體
    body: string // 內文字體
    accent: string // 裝飾字體
  }
  effects: {
    shadow: string // 陰影效果
    borderRadius: string // 圓角
    borderWidth: string // 邊框粗細
  }
}

// ============================================
// 各風格主題定義
// ============================================

const themes: Record<TourStyle, TourTheme> = {
  original: {
    name: 'original',
    colors: {
      primary: '#B5986D', // 莫蘭迪金
      secondary: '#8B7355',
      accent: '#D4C5A9',
      background: '#FAF9F6',
      surface: '#FFFFFF',
      text: '#4A4A4A',
      muted: '#888888',
      border: '#E8E4DE',
    },
    fonts: {
      heading: "'Noto Serif TC', serif",
      body: "'Noto Sans TC', sans-serif",
      accent: "'Noto Serif TC', serif",
    },
    effects: {
      shadow: '0 4px 12px rgba(0,0,0,0.08)',
      borderRadius: '12px',
      borderWidth: '1px',
    },
  },

  luxury: {
    name: 'luxury',
    colors: {
      primary: '#2C5F4D', // 深綠
      secondary: '#C69C6D', // 金棕
      accent: '#8F4F4F', // 酒紅
      background: '#FDFBF7',
      surface: '#FFFFFF',
      text: '#2D3436',
      muted: '#636E72',
      border: '#f0f0f0',
    },
    fonts: {
      heading: "'Noto Serif TC', serif",
      body: "'Noto Sans TC', sans-serif",
      accent: "'Cormorant Garamond', serif",
    },
    effects: {
      shadow: '0 8px 24px rgba(0,0,0,0.12)',
      borderRadius: '16px',
      borderWidth: '2px',
    },
  },

  art: {
    name: 'art',
    colors: {
      primary: '#1C1C1C', // 墨黑
      secondary: '#BF5B3D', // 陶土
      accent: '#C6A87C', // 金褐
      background: '#F2F0E9', // 紙色
      surface: '#FFFFFF',
      text: '#1C1C1C',
      muted: '#8b8680',
      border: '#1C1C1C',
    },
    fonts: {
      heading: "'PP Editorial New', serif",
      body: "'Noto Sans TC', sans-serif",
      accent: "'PP Editorial New', serif",
    },
    effects: {
      shadow: '6px 6px 0px 0px rgba(28,28,28,1)', // Brutalist
      borderRadius: '0px',
      borderWidth: '3px',
    },
  },

  dreamscape: {
    name: 'dreamscape',
    colors: {
      primary: '#6366F1', // 靛藍
      secondary: '#A78BFA', // 紫羅蘭
      accent: '#F472B6', // 粉紅
      background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)',
      surface: 'rgba(255,255,255,0.1)',
      text: '#FFFFFF',
      muted: 'rgba(255,255,255,0.7)',
      border: 'rgba(255,255,255,0.2)',
    },
    fonts: {
      heading: "'Outfit', sans-serif",
      body: "'Noto Sans TC', sans-serif",
      accent: "'Outfit', sans-serif",
    },
    effects: {
      shadow: '0 8px 32px rgba(99,102,241,0.3)',
      borderRadius: '24px',
      borderWidth: '1px',
    },
  },

  collage: {
    name: 'collage',
    colors: {
      primary: '#FF6B35', // 珊瑚橘
      secondary: '#004E89', // 深藍
      accent: '#F7C59F', // 奶油黃
      background: '#FFFCF2',
      surface: '#FFFFFF',
      text: '#1A1A2E',
      muted: '#8b8680',
      border: '#1A1A2E',
    },
    fonts: {
      heading: "'Space Grotesk', sans-serif",
      body: "'Noto Sans TC', sans-serif",
      accent: "'Space Grotesk', sans-serif",
    },
    effects: {
      shadow: '4px 4px 0px 0px #1A1A2E',
      borderRadius: '8px',
      borderWidth: '2px',
    },
  },

  nature: {
    name: 'nature',
    colors: {
      primary: '#8B4513', // 褐色
      secondary: '#D2691E', // 橙褐
      accent: '#228B22', // 森林綠
      background: '#FFF8DC', // 米色
      surface: '#FFFFFF',
      text: '#3D2914',
      muted: '#8B7355',
      border: '#D2B48C',
    },
    fonts: {
      heading: "'Ma Shan Zheng', cursive", // 書法
      body: "'Noto Sans TC', sans-serif",
      accent: "'Ma Shan Zheng', cursive",
    },
    effects: {
      shadow: '0 4px 8px rgba(139,69,19,0.15)',
      borderRadius: '4px',
      borderWidth: '1px',
    },
  },

  gemini: {
    name: 'gemini',
    colors: {
      primary: '#4285F4', // Google 藍
      secondary: '#34A853', // Google 綠
      accent: '#FBBC05', // Google 黃
      background: '#FFFFFF',
      surface: '#F8F9FA',
      text: '#202124',
      muted: '#5F6368',
      border: '#DADCE0',
    },
    fonts: {
      heading: "'Google Sans', sans-serif",
      body: "'Noto Sans TC', sans-serif",
      accent: "'Google Sans', sans-serif",
    },
    effects: {
      shadow: '0 1px 3px rgba(0,0,0,0.12)',
      borderRadius: '8px',
      borderWidth: '1px',
    },
  },
}

// ============================================
// 工具函數
// ============================================

export function getTheme(style: TourStyle): TourTheme {
  return themes[style] || themes.original
}

/**
 * 根據 coverStyle 推斷 flightStyle
 * 保持向後相容
 */
export function inferFlightStyle(coverStyle: TourStyle): TourStyle {
  // 大部分情況下航班風格跟隨封面風格
  return coverStyle
}

/**
 * CSS 變數產生器 - 可用於 style prop
 */
export function themeToCSS(theme: TourTheme): Record<string, string> {
  return {
    '--tour-primary': theme.colors.primary,
    '--tour-secondary': theme.colors.secondary,
    '--tour-accent': theme.colors.accent,
    '--tour-bg': theme.colors.background,
    '--tour-surface': theme.colors.surface,
    '--tour-text': theme.colors.text,
    '--tour-muted': theme.colors.muted,
    '--tour-border': theme.colors.border,
    '--tour-shadow': theme.effects.shadow,
    '--tour-radius': theme.effects.borderRadius,
    '--tour-border-width': theme.effects.borderWidth,
    '--tour-font-heading': theme.fonts.heading,
    '--tour-font-body': theme.fonts.body,
    '--tour-font-accent': theme.fonts.accent,
  }
}
