/**
 * index.ts — Presentation 對外 API
 *
 * 使用方式：
 * ```ts
 * import { generatePresentation } from '@/lib/presentation'
 *
 * const buffer = await generatePresentation(canvas, {
 *   template: 'playful',
 *   title: '東京大阪之旅',
 * })
 * ```
 */

import type { Canvas } from '@/components/canvas-renderer/types'

export type TemplateType = 'playful' | 'minimal' | 'business'

export interface GenerateOptions {
  template?: TemplateType
  title?: string
  author?: string
}

/**
 * 對外主要函式：根據 Canvas 產生 PPTX
 */
export async function generatePresentation(
  canvas: Canvas,
  options: GenerateOptions = {}
): Promise<ArrayBuffer> {
  const template = options.template || 'playful'

  if (template === 'minimal') {
    throw new Error('minimal 模板尚在實作中')
  }

  if (template === 'business') {
    throw new Error('business 模板尚在實作中')
  }

  // playful
  const { generatePlayfulPptx } = await import('./templates/playful/render')
  return generatePlayfulPptx(JSON.stringify(canvas), {
    title: options.title,
    author: options.author,
  })
}

// 重新導出 engine 層型別
export type {
  RenderIntent,
  RenderCover,
  RenderTimeline,
  RenderDaySection,
} from './engine/render-canvas'
export type {
  FilteredAttraction,
  FilteredRestaurant,
  FilteredHotel,
  FilteredSpotlight,
} from './engine/filter-blocks'
