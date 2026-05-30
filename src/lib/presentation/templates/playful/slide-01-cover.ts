/**
 * slide-01-cover.ts — Playful 封面頁
 */

import type { RenderCover } from '../../engine/render-canvas'
import type { PresentationTheme } from './theme'

// Shape names directly as strings (pptxgenjs shapes enum values)
const SHAPES = {
  RECTANGLE: 'rect',
  OVAL: 'ellipse',
  ROUNDED_RECTANGLE: 'roundRect',
} as const

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PptxPres = any

export function createCoverSlide(pres: PptxPres, theme: PresentationTheme, data: RenderCover) {
  const slide = pres.addSlide()

  // 左側淺色面板
  slide.addShape(SHAPES.RECTANGLE, {
    x: 0,
    y: 0,
    w: 5.5,
    h: 5.625,
    fill: { color: theme.light },
  })

  // Eyebrow
  if (data.eyebrow) {
    slide.addText(data.eyebrow, {
      x: 0.6,
      y: 1.2,
      w: 4.5,
      h: 0.4,
      fontSize: 14,
      fontFace: theme.fontChinese,
      color: theme.secondary,
    })
  }

  // 主標題
  slide.addText(data.title, {
    x: 0.6,
    y: 1.6,
    w: 4.5,
    h: 1.2,
    fontSize: 36,
    fontFace: theme.fontChinese,
    color: theme.primary,
    bold: true,
    valign: 'top',
  })

  // 副標 / 目的地
  if (data.subtitle || data.destination) {
    const subText = data.subtitle || data.destination
    slide.addText(subText, {
      x: 0.6,
      y: 2.9,
      w: 4.5,
      h: 0.5,
      fontSize: 18,
      fontFace: theme.fontChinese,
      color: theme.accent,
    })
  }

  // 出發日期
  if (data.departureDate) {
    slide.addText(data.departureDate, {
      x: 0.6,
      y: 3.5,
      w: 4.5,
      h: 0.4,
      fontSize: 14,
      fontFace: theme.fontChinese,
      color: theme.secondary,
    })
  }

  // 強調線
  slide.addShape(SHAPES.RECTANGLE, {
    x: 0.6,
    y: 4.1,
    w: 1.2,
    h: 0.06,
    fill: { color: theme.accent },
  })

  // 品牌名稱
  if (data.brandName) {
    slide.addText(data.brandName, {
      x: 0.6,
      y: 4.35,
      w: 4.5,
      h: 0.4,
      fontSize: 13,
      fontFace: theme.fontChinese,
      color: theme.secondary,
    })
  }

  // 右側：封面圖（如果有）
  if (data.coverImageUrl) {
    slide.addImage({
      data: data.coverImageUrl,
      x: 5.5,
      y: 0,
      w: 4.5,
      h: 5.625,
    })
  } else {
    // 無圖時：顯示目的地名稱 + 天數 badge
    slide.addShape(SHAPES.RECTANGLE, {
      x: 5.5,
      y: 0,
      w: 4.5,
      h: 5.625,
      fill: { color: theme.accent },
    })

    // 大日 badge
    slide.addShape(SHAPES.OVAL, {
      x: 6.8,
      y: 1.5,
      w: 2.0,
      h: 2.0,
      fill: { color: theme.coral },
    })
    slide.addText('N', {
      x: 6.8,
      y: 1.75,
      w: 2.0,
      h: 1.2,
      fontSize: 64,
      fontFace: theme.fontEnglish,
      color: 'ffffff',
      bold: true,
      align: 'center',
    })
    slide.addText('DAYS', {
      x: 6.8,
      y: 2.9,
      w: 2.0,
      h: 0.4,
      fontSize: 14,
      fontFace: theme.fontEnglish,
      color: 'ffffff',
      bold: true,
      align: 'center',
    })
  }
}
