/**
 * render.ts — Playful 模板渲染器
 *
 * 職責：接收 RenderIntent[]，依序渲染各頁 slide
 */

import type { FilteredSpotlight } from '../../engine/filter-blocks'
import type {
  RenderIntent,
  RenderDaySection,
  RenderCover,
  RenderTimeline,
  RenderStays,
  RenderAppendix,
} from '../../engine/render-canvas'
import { playfulTheme, type PresentationTheme } from './theme'

import { createCoverSlide } from './slide-01-cover'
import { createTimelineSlide } from './slide-02-timeline'
import { createDaySectionSlide } from './slide-03-day-section'
import { createDayContentSlide } from './slide-04-day-content'
import { createSpotlightSlide } from './slide-05-spotlight'
import { createStaysSlide } from './slide-06-stays'
import { createAppendixSlide } from './slide-07-appendix'

export interface RenderOptions {
  title?: string
  author?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PptxPres = any

/**
 * 使用 Playful 模板渲染 RenderIntent[] 成 PPTX
 */
export function renderPlayfulTemplate(
  pres: PptxPres,
  intents: RenderIntent[],
  options: RenderOptions = {}
) {
  const theme = playfulTheme

  // 全域設定
  pres.layout = 'LAYOUT_16x9'
  if (options.title) pres.title = options.title
  if (options.author) pres.author = options.author

  // 頁碼計數器
  let pageNumber = 1

  for (const intent of intents) {
    switch (intent.type) {
      case 'cover': {
        createCoverSlide(pres, theme, intent as RenderCover)
        break
      }
      case 'timeline': {
        createTimelineSlide(pres, theme, intent as RenderTimeline)
        pageNumber = 2
        break
      }
      case 'day': {
        const dayIntent = intent as RenderDaySection

        // 每日 Section Divider
        createDaySectionSlide(pres, theme, dayIntent)
        pageNumber++

        // Spotlight
        if (dayIntent.spotlights.length > 0) {
          dayIntent.spotlights.forEach((spotlight: FilteredSpotlight) => {
            const pageNumStr = String(pageNumber).padStart(2, '0')
            createSpotlightSlide(pres, theme, spotlight, pageNumStr)
            pageNumber++
          })
        }

        // 每日內容
        const pageNumStr = String(pageNumber).padStart(2, '0')
        createDayContentSlide(pres, theme, dayIntent, pageNumStr)
        pageNumber++
        break
      }
      case 'stays': {
        const pageNumStr = String(pageNumber).padStart(2, '0')
        createStaysSlide(pres, theme, intent as RenderStays, pageNumStr)
        pageNumber++
        break
      }
      case 'appendix': {
        const pageNumStr = String(pageNumber).padStart(2, '0')
        createAppendixSlide(pres, theme, intent as RenderAppendix, pageNumStr)
        pageNumber++
        break
      }
    }
  }
}

/**
 * 快速產出：傳入 Canvas，直接吐出 ArrayBuffer
 */
export async function generatePlayfulPptx(
  canvasJson: string,
  options: RenderOptions = {}
): Promise<ArrayBuffer> {
  const { parseCanvasToRenderIntents } = await import('../../engine/render-canvas')

  const canvas = JSON.parse(canvasJson)
  const intents = parseCanvasToRenderIntents(canvas)

  // Dynamic import pptxgenjs
  const PptxGenJS = (await import('pptxgenjs')).default
  const pres = new PptxGenJS()

  renderPlayfulTemplate(pres, intents, options)

  // 輸出為 ArrayBuffer
  const arrayBuffer = await pres.write({ outputType: 'arraybuffer' })
  return arrayBuffer as ArrayBuffer
}
