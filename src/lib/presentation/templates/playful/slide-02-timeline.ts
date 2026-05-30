/**
 * slide-02-timeline.ts — Playful 行程總覽
 */

import type { RenderTimeline } from '../../engine/render-canvas'
import type { PresentationTheme } from './theme'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PptxPres = any

const SHAPES = {
  RECTANGLE: 'rect',
  OVAL: 'ellipse',
  ROUNDED_RECTANGLE: 'roundRect',
} as const

export function createTimelineSlide(
  pres: PptxPres,
  theme: PresentationTheme,
  data: RenderTimeline
) {
  const slide = pres.addSlide()
  slide.background = { color: theme.bg }

  // 標題
  slide.addText('行程概覽', {
    x: 0.5,
    y: 0.35,
    w: 9,
    h: 0.7,
    fontSize: 32,
    fontFace: theme.fontChinese,
    color: theme.primary,
    bold: true,
  })

  // 天數卡片網格
  const days = data.days
  const cardW = 2.8
  const cardH = 1.5
  const gapX = 0.25
  const gapY = 0.25
  const startX = 0.5
  const startY = 1.3
  const perRow = 3

  days.forEach((day, i) => {
    const col = i % perRow
    const row = Math.floor(i / perRow)
    const x = startX + col * (cardW + gapX)
    const y = startY + row * (cardH + gapY)

    // 卡片背景
    slide.addShape(SHAPES.ROUNDED_RECTANGLE, {
      x,
      y,
      w: cardW,
      h: cardH,
      fill: { color: theme.light },
      rectRadius: theme.radius.card,
    })

    // Day number badge
    slide.addShape(SHAPES.OVAL, {
      x: x + 0.15,
      y: y + 0.15,
      w: 0.55,
      h: 0.55,
      fill: { color: theme.coral },
    })
    slide.addText(String(day.dayIndex), {
      x: x + 0.15,
      y: y + 0.15,
      w: 0.55,
      h: 0.55,
      fontSize: 16,
      fontFace: theme.fontEnglish,
      color: 'ffffff',
      bold: true,
      align: 'center',
      valign: 'middle',
    })

    // 標題
    slide.addText(day.title, {
      x: x + 0.15,
      y: y + 0.9,
      w: cardW - 0.3,
      h: 0.4,
      fontSize: 14,
      fontFace: theme.fontChinese,
      color: theme.primary,
      bold: true,
    })
  })

  // 頁碼
  slide.addText('02', {
    x: 9.3,
    y: 5.1,
    w: 0.5,
    h: 0.3,
    fontSize: 11,
    fontFace: theme.fontEnglish,
    color: theme.accent,
    align: 'right',
  })
}
