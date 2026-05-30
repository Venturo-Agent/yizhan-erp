/**
 * slide-06-stays.ts — Playful 住宿總覽頁
 */

import type { RenderStays } from '../../engine/render-canvas'
import type { PresentationTheme } from './theme'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PptxPres = any

const SHAPES = {
  ROUNDED_RECTANGLE: 'roundRect',
} as const

export function createStaysSlide(
  pres: PptxPres,
  theme: PresentationTheme,
  data: RenderStays,
  pageNumber: string
) {
  const slide = pres.addSlide()
  slide.background = { color: theme.bg }

  // 標題
  slide.addText('住宿總覽', {
    x: 0.5,
    y: 0.35,
    w: 9,
    h: 0.7,
    fontSize: 28,
    fontFace: theme.fontChinese,
    color: theme.primary,
    bold: true,
  })

  // 飯店卡片
  data.items.forEach((item, i) => {
    const y = 1.2 + i * 1.1

    // 卡片背景
    slide.addShape(SHAPES.ROUNDED_RECTANGLE, {
      x: 0.5,
      y,
      w: 9,
      h: 0.95,
      fill: { color: theme.light },
      rectRadius: theme.radius.card,
    })

    // 飯店圖
    if (item.imageUrl) {
      slide.addImage({
        data: item.imageUrl,
        x: 0.65,
        y: y + 0.12,
        w: 1.3,
        h: 0.7,
      })
    }

    const textX = item.imageUrl ? 2.1 : 0.7

    // Night label
    slide.addShape(SHAPES.ROUNDED_RECTANGLE, {
      x: textX,
      y: y + 0.15,
      w: 1.2,
      h: 0.35,
      fill: { color: theme.accent },
      rectRadius: theme.radius.badge,
    })
    slide.addText(item.nightsLabel, {
      x: textX,
      y: y + 0.15,
      w: 1.2,
      h: 0.35,
      fontSize: 11,
      fontFace: theme.fontEnglish,
      color: 'ffffff',
      bold: true,
      align: 'center',
      valign: 'middle',
    })

    // 飯店名
    slide.addText(item.name, {
      x: textX + 1.35,
      y: y + 0.15,
      w: 5.0,
      h: 0.35,
      fontSize: 15,
      fontFace: theme.fontChinese,
      color: theme.primary,
      bold: true,
    })

    // 描述
    if (item.description) {
      slide.addText(item.description, {
        x: textX,
        y: y + 0.55,
        w: 7.0,
        h: 0.35,
        fontSize: 12,
        fontFace: theme.fontChinese,
        color: theme.secondary,
      })
    }
  })

  // 頁碼
  slide.addText(pageNumber, {
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
