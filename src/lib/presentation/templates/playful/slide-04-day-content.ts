/**
 * slide-04-day-content.ts — Playful 每日行程內容頁
 * 包含：景點時間軸 + 餐廳 + 飯店
 */

import type { RenderDaySection } from '../../engine/render-canvas'
import type { PresentationTheme } from './theme'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PptxPres = any

const SHAPES = {
  RECTANGLE: 'rect',
  OVAL: 'ellipse',
  ROUNDED_RECTANGLE: 'roundRect',
} as const

export function createDayContentSlide(
  pres: PptxPres,
  theme: PresentationTheme,
  data: RenderDaySection,
  pageNumber: string
) {
  const slide = pres.addSlide()
  slide.background = { color: theme.bg }

  // Header bar
  slide.addShape(SHAPES.RECTANGLE, {
    x: 0,
    y: 0,
    w: 10,
    h: 0.85,
    fill: { color: theme.accent },
  })
  slide.addText(`DAY ${data.dayIndex}  |  ${data.date}  ${data.title}`, {
    x: 0.5,
    y: 0.18,
    w: 9,
    h: 0.55,
    fontSize: 18,
    fontFace: theme.fontChinese,
    color: 'ffffff',
    bold: true,
    valign: 'middle',
  })

  let currentY = 1.1

  // --- 景點時間軸 ---
  if (data.routeCard) {
    const { attractions } = data.routeCard

    slide.addText('景點', {
      x: 0.5,
      y: currentY,
      w: 2,
      h: 0.35,
      fontSize: 12,
      fontFace: theme.fontChinese,
      color: theme.secondary,
    })
    currentY += 0.4

    attractions
      .filter(a => a.worthShowing)
      .forEach((attr, i) => {
        const y = currentY

        // 時間 badge
        slide.addShape(SHAPES.ROUNDED_RECTANGLE, {
          x: 0.5,
          y,
          w: 1.0,
          h: 0.65,
          fill: { color: theme.coral },
          rectRadius: theme.radius.badge,
        })
        slide.addText(String(i + 1), {
          x: 0.5,
          y,
          w: 1.0,
          h: 0.65,
          fontSize: 14,
          fontFace: theme.fontEnglish,
          color: 'ffffff',
          bold: true,
          align: 'center',
          valign: 'middle',
        })

        // 景點內容卡片
        slide.addShape(SHAPES.ROUNDED_RECTANGLE, {
          x: 1.65,
          y,
          w: 5.85,
          h: 0.65,
          fill: { color: theme.light },
          rectRadius: theme.radius.badge,
        })

        // 景點名稱
        slide.addText(attr.name, {
          x: 1.85,
          y: y + 0.1,
          w: 3.0,
          h: 0.35,
          fontSize: 14,
          fontFace: theme.fontChinese,
          color: theme.primary,
          bold: true,
        })

        // 景點描述
        if (attr.description) {
          slide.addText(attr.description, {
            x: 1.85,
            y: y + 0.38,
            w: 5.5,
            h: 0.25,
            fontSize: 11,
            fontFace: theme.fontChinese,
            color: theme.secondary,
          })
        }

        // 景點圖
        if (attr.image?.url) {
          slide.addImage({
            data: attr.image.url,
            x: 7.6,
            y: y + 0.05,
            w: 1.8,
            h: 0.55,
          })
        }

        currentY += 0.8
      })
  }

  // --- Sequence Steps（時間軸） ---
  if (data.sequenceSteps) {
    const { block } = data.sequenceSteps
    currentY += 0.2

    slide.addText('時間軸', {
      x: 0.5,
      y: currentY,
      w: 2,
      h: 0.35,
      fontSize: 12,
      fontFace: theme.fontChinese,
      color: theme.secondary,
    })
    currentY += 0.4

    block.data.steps.forEach((step, i) => {
      const y = currentY

      // 時間
      slide.addText(step.time || '', {
        x: 0.5,
        y,
        w: 0.8,
        h: 0.5,
        fontSize: 13,
        fontFace: theme.fontEnglish,
        color: theme.accent,
        bold: true,
        align: 'right',
        valign: 'middle',
      })

      // 連接線
      if (i < block.data.steps.length - 1) {
        slide.addShape(SHAPES.RECTANGLE, {
          x: 1.39,
          y: y + 0.5,
          w: 0.03,
          h: 0.5,
          fill: { color: theme.light },
        })
      }

      // 圓點
      slide.addShape(SHAPES.OVAL, {
        x: 1.28,
        y: y + 0.12,
        w: 0.25,
        h: 0.25,
        fill: { color: theme.accent },
      })

      // 內容
      slide.addShape(SHAPES.ROUNDED_RECTANGLE, {
        x: 1.65,
        y,
        w: 7.85,
        h: 0.5,
        fill: { color: theme.light },
        rectRadius: theme.radius.badge,
      })
      slide.addText(step.title, {
        x: 1.85,
        y,
        w: 5.0,
        h: 0.35,
        fontSize: 13,
        fontFace: theme.fontChinese,
        color: theme.primary,
        bold: true,
      })
      if (step.description) {
        slide.addText(step.description, {
          x: 1.85,
          y: y + 0.28,
          w: 7.5,
          h: 0.25,
          fontSize: 11,
          fontFace: theme.fontChinese,
          color: theme.secondary,
        })
      }

      currentY += 0.65
    })
  }

  // --- 餐廳 ---
  if (data.restaurants.length > 0) {
    currentY += 0.2

    slide.addText('用餐', {
      x: 0.5,
      y: currentY,
      w: 2,
      h: 0.35,
      fontSize: 12,
      fontFace: theme.fontChinese,
      color: theme.secondary,
    })
    currentY += 0.4

    data.restaurants
      .filter(r => r.worthShowing)
      .forEach(rest => {
        const { data: restData } = rest.block
        const y = currentY

        slide.addShape(SHAPES.ROUNDED_RECTANGLE, {
          x: 0.5,
          y,
          w: 9,
          h: 0.7,
          fill: { color: theme.light },
          rectRadius: theme.radius.card,
        })

        // 餐廳圖
        if (restData.image?.url) {
          slide.addImage({
            data: restData.image.url,
            x: 0.6,
            y: y + 0.1,
            w: 0.9,
            h: 0.5,
          })
        }

        const textX = restData.image?.url ? 1.65 : 0.7

        // 餐廳名
        slide.addText(restData.name, {
          x: textX,
          y: y + 0.1,
          w: 3.0,
          h: 0.35,
          fontSize: 14,
          fontFace: theme.fontChinese,
          color: theme.primary,
          bold: true,
        })

        // 描述
        if (restData.description) {
          slide.addText(restData.description, {
            x: textX,
            y: y + 0.4,
            w: 7.5,
            h: 0.3,
            fontSize: 11,
            fontFace: theme.fontChinese,
            color: theme.secondary,
          })
        }

        currentY += 0.85
      })
  }

  // --- 飯店 ---
  if (data.hotel) {
    currentY += 0.2

    slide.addText('住宿', {
      x: 0.5,
      y: currentY,
      w: 2,
      h: 0.35,
      fontSize: 12,
      fontFace: theme.fontChinese,
      color: theme.secondary,
    })
    currentY += 0.4

    const { data: hotelData } = data.hotel.block
    const y = currentY

    slide.addShape(SHAPES.ROUNDED_RECTANGLE, {
      x: 0.5,
      y,
      w: 9,
      h: 0.85,
      fill: { color: theme.light },
      rectRadius: theme.radius.card,
    })

    // 飯店圖
    if (hotelData.image?.url) {
      slide.addImage({
        data: hotelData.image.url,
        x: 0.6,
        y: y + 0.1,
        w: 1.2,
        h: 0.65,
      })
    }

    const textX = hotelData.image?.url ? 1.95 : 0.7

    // 飯店名
    slide.addText(hotelData.name, {
      x: textX,
      y: y + 0.1,
      w: 4.0,
      h: 0.35,
      fontSize: 14,
      fontFace: theme.fontChinese,
      color: theme.primary,
      bold: true,
    })

    // 地點
    if (hotelData.location) {
      slide.addText(hotelData.location, {
        x: textX,
        y: y + 0.45,
        w: 4.0,
        h: 0.3,
        fontSize: 11,
        fontFace: theme.fontChinese,
        color: theme.secondary,
      })
    }

    // 星級
    if (hotelData.rating) {
      slide.addText('★'.repeat(hotelData.rating), {
        x: 8.2,
        y: y + 0.1,
        w: 1.2,
        h: 0.35,
        fontSize: 12,
        fontFace: theme.fontEnglish,
        color: theme.accent,
        align: 'right',
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
