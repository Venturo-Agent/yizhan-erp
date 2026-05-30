/**
 * slide-05-spotlight.ts — Playful 亮點介紹頁
 */

import type { FilteredSpotlight } from '../../engine/filter-blocks'
import type { PresentationTheme } from './theme'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PptxPres = any

export function createSpotlightSlide(
  pres: PptxPres,
  theme: PresentationTheme,
  spotlight: FilteredSpotlight,
  pageNumber: string
) {
  const slide = pres.addSlide()
  slide.background = { color: theme.bg }

  const { data } = spotlight.block
  const hasImage = Boolean(data.image?.url)
  const imagePosition = data.image_position || 'right'

  // Tag（眉標）
  if (data.tag) {
    slide.addText(data.tag, {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 0.4,
      fontSize: 12,
      fontFace: theme.fontChinese,
      color: theme.accent,
      italic: true,
    })
  }

  // 主標題
  slide.addText(data.title, {
    x: 0.5,
    y: 1.0,
    w: 9,
    h: 0.7,
    fontSize: 28,
    fontFace: theme.fontChinese,
    color: theme.primary,
    bold: true,
  })

  // 內容區：圖 + 文
  if (hasImage && imagePosition === 'right') {
    // 文在左、圖在右
    if (data.lead) {
      slide.addText(data.lead, {
        x: 0.5,
        y: 1.8,
        w: 4.5,
        h: 2.5,
        fontSize: 15,
        fontFace: theme.fontChinese,
        color: theme.secondary,
        valign: 'top',
      })
    }

    slide.addImage({
      data: data.image!.url,
      x: 5.5,
      y: 1.2,
      w: 4.0,
      h: 3.5,
    })
  } else if (hasImage) {
    // 圖在左、文在右
    slide.addImage({
      data: data.image!.url,
      x: 0.5,
      y: 1.2,
      w: 4.0,
      h: 3.5,
    })

    if (data.lead) {
      slide.addText(data.lead, {
        x: 4.8,
        y: 1.8,
        w: 4.7,
        h: 2.5,
        fontSize: 15,
        fontFace: theme.fontChinese,
        color: theme.secondary,
        valign: 'top',
      })
    }
  } else {
    // 無圖：純文字
    if (data.lead) {
      slide.addText(data.lead, {
        x: 0.5,
        y: 1.8,
        w: 9,
        h: 2.5,
        fontSize: 16,
        fontFace: theme.fontChinese,
        color: theme.secondary,
        valign: 'top',
      })
    }
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
