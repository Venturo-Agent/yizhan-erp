/**
 * slide-03-day-section.ts — Playful 每日行程 Section Divider
 */

import type { RenderDaySection } from '../../engine/render-canvas'
import type { PresentationTheme } from './theme'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PptxPres = any

const SHAPES = {
  RECTANGLE: 'rect',
} as const

export function createDaySectionSlide(
  pres: PptxPres,
  theme: PresentationTheme,
  data: RenderDaySection
) {
  const slide = pres.addSlide()
  slide.background = { color: theme.coral }

  // DAY 大數字
  slide.addText(`DAY ${data.dayIndex}`, {
    x: 0.6,
    y: 1.8,
    w: 8.8,
    h: 1.0,
    fontSize: 72,
    fontFace: theme.fontEnglish,
    color: 'ffffff',
    bold: true,
  })

  // 日期 + 標題
  const subtitle = `${data.date} · ${data.title}`
  slide.addText(subtitle, {
    x: 0.6,
    y: 3.0,
    w: 8.8,
    h: 0.6,
    fontSize: 20,
    fontFace: theme.fontChinese,
    color: theme.bg,
  })

  // 強調線
  slide.addShape(SHAPES.RECTANGLE, {
    x: 0.6,
    y: 3.8,
    w: 2.0,
    h: 0.06,
    fill: { color: 'ffffff' },
  })

  // 頁碼
  slide.addText(String(data.dayIndex + 2).padStart(2, '0'), {
    x: 9.3,
    y: 5.1,
    w: 0.5,
    h: 0.3,
    fontSize: 11,
    fontFace: theme.fontEnglish,
    color: 'ffffff',
    align: 'right',
  })
}
