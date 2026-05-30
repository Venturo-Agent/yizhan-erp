/**
 * slide-07-appendix.ts — Playful 附錄頁（費用說明 + CTA）
 */

import type { RenderAppendix } from '../../engine/render-canvas'
import type { PresentationTheme } from './theme'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PptxPres = any

export function createAppendixSlide(
  pres: PptxPres,
  theme: PresentationTheme,
  data: RenderAppendix,
  pageNumber: string
) {
  const slide = pres.addSlide()
  slide.background = { color: theme.primary }

  // 標題
  slide.addText('費用說明', {
    x: 0.5,
    y: 0.4,
    w: 9,
    h: 0.7,
    fontSize: 28,
    fontFace: theme.fontChinese,
    color: theme.accent,
    bold: true,
  })

  // 左欄：費用包含
  slide.addText('費用包含', {
    x: 0.5,
    y: 1.2,
    w: 4.2,
    h: 0.4,
    fontSize: 16,
    fontFace: theme.fontChinese,
    color: theme.accent,
    bold: true,
  })

  data.inclusions.forEach((item, i) => {
    slide.addText('✓  ' + item, {
      x: 0.5,
      y: 1.7 + i * 0.5,
      w: 4.2,
      h: 0.4,
      fontSize: 14,
      fontFace: theme.fontChinese,
      color: 'ffffff',
    })
  })

  // 右欄：費用不含
  slide.addText('費用不含', {
    x: 5.2,
    y: 1.2,
    w: 4.3,
    h: 0.4,
    fontSize: 16,
    fontFace: theme.fontChinese,
    color: theme.secondary,
    bold: true,
  })

  data.exclusions.forEach((item, i) => {
    slide.addText('✗  ' + item, {
      x: 5.2,
      y: 1.7 + i * 0.5,
      w: 4.3,
      h: 0.4,
      fontSize: 14,
      fontFace: theme.fontChinese,
      color: theme.light,
    })
  })

  // 注意事項
  if (data.notices.length > 0) {
    slide.addText('注意事項', {
      x: 0.5,
      y: 4.0,
      w: 9,
      h: 0.4,
      fontSize: 14,
      fontFace: theme.fontChinese,
      color: theme.accent,
      bold: true,
    })
    data.notices.slice(0, 2).forEach((notice, i) => {
      slide.addText('•  ' + notice, {
        x: 0.5,
        y: 4.45 + i * 0.4,
        w: 9,
        h: 0.35,
        fontSize: 12,
        fontFace: theme.fontChinese,
        color: theme.light,
      })
    })
  }

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
