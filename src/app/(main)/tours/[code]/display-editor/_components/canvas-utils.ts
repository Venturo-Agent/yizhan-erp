/**
 * Canvas 編輯 helper：定位 / 變更 / 刪除 一個 block 或 section。
 *
 * 為什麼集中在這：
 * - Canvas 結構巢狀（sections → day.blocks）、散在多處 mutate 會出 bug
 * - 統一用「unique key」識別任何可選 / 可編節點（cover / day-X / day-X-block-id ...）
 * - 編輯 panel 跟 page state 之間只交換 key + patch、不互看內部結構
 *
 * 紀律：不在這裡 mutate input、永遠回傳新物件（讓 React 認得到變動 re-render）
 */

import type {
  Canvas,
  CanvasCoverData,
  CanvasDayBlock,
  CanvasDayHeaderBlock,
  CanvasDaySection,
  CanvasJpNoteBlock,
  CanvasRouteCardBlock,
  CanvasSection,
  CanvasSpotlightBlock,
} from '@/components/canvas-renderer/types'

// ============ 選取節點 key ============

// 對應「右側 panel 點哪個 → 編哪個」的識別碼
// 'cover' / 'overview' / 'stays' / 'appendix' = top-level singleton sections
// 'day:1' = day_index=1 整個 day section
// 'block:abc-uuid' = day section 內某個 block.id
export type SelectionKey =
  | { kind: 'cover' }
  | { kind: 'overview' }
  | { kind: 'stays' }
  | { kind: 'appendix' }
  | { kind: 'day'; dayIndex: number }
  | { kind: 'block'; blockId: string }

// ============ 拿資料 ============

export function findSection(
  canvas: Canvas,
  predicate: (s: CanvasSection) => boolean
): CanvasSection | null {
  return canvas.sections.find(predicate) ?? null
}

export function findBlock(
  canvas: Canvas,
  blockId: string
): { block: CanvasDayBlock; daySection: CanvasDaySection } | null {
  for (const s of canvas.sections) {
    if (s.type !== 'day') continue
    const b = s.blocks.find(x => x.id === blockId)
    if (b) return { block: b, daySection: s }
  }
  return null
}

// ============ 改 cover ============

export function updateCoverData(canvas: Canvas, patch: Partial<CanvasCoverData>): Canvas {
  return {
    ...canvas,
    sections: canvas.sections.map(s =>
      s.type === 'cover' ? { ...s, data: { ...s.data, ...patch } } : s
    ),
  }
}

// ============ 改 day_header block ============

export function updateDayHeaderBlock(
  canvas: Canvas,
  blockId: string,
  patch: Partial<CanvasDayHeaderBlock['data']>
): Canvas {
  return mapBlock(canvas, blockId, b => {
    if (b.type !== 'day_header') return b
    return { ...b, data: { ...b.data, ...patch } }
  })
}

// ============ 改 spotlight block ============

export function updateSpotlightBlock(
  canvas: Canvas,
  blockId: string,
  patch: Partial<CanvasSpotlightBlock['data']>
): Canvas {
  return mapBlock(canvas, blockId, b => {
    if (b.type !== 'spotlight') return b
    return { ...b, data: { ...b.data, ...patch } }
  })
}

// ============ 改 jp_note block ============

export function updateJpNoteBlock(
  canvas: Canvas,
  blockId: string,
  patch: Partial<CanvasJpNoteBlock['data']>
): Canvas {
  return mapBlock(canvas, blockId, b => {
    if (b.type !== 'jp_note') return b
    return { ...b, data: { ...b.data, ...patch } }
  })
}

// ============ 改 route_card 內某個 attraction ============

export function updateRouteCardAttraction(
  canvas: Canvas,
  blockId: string,
  attractionId: string,
  patch: Partial<CanvasRouteCardBlock['data']['attractions'][number]>
): Canvas {
  return mapBlock(canvas, blockId, b => {
    if (b.type !== 'route_card') return b
    return {
      ...b,
      data: {
        ...b.data,
        attractions: b.data.attractions.map(a => (a.id === attractionId ? { ...a, ...patch } : a)),
      },
    }
  })
}

// ============ 刪除 block ============

export function deleteBlock(canvas: Canvas, blockId: string): Canvas {
  return {
    ...canvas,
    sections: canvas.sections.map(s => {
      if (s.type !== 'day') return s
      const next = s.blocks.filter(b => b.id !== blockId)
      if (next.length === s.blocks.length) return s
      return { ...s, blocks: next }
    }),
  }
}

// ============ AI 助理 helpers ============

export interface AiSuggestion {
  id: string
  label: string
  description: string
  instruction: string
  target:
    | { type: 'cover'; field: 'subtitle' | 'title' }
    | { type: 'day_header'; block_id: string; day_index: number; field: 'summary' | 'title' }
    | { type: 'appendix'; field: 'inclusions' | 'exclusions' | 'notices' }
}

export interface AiPatch {
  id: string
  label: string
  target: AiSuggestion['target']
  generated: string
}

/** 掃 canvas，回傳「目前空白 / 可補強」的建議清單 */
export function analyzeCanvasForAi(canvas: Canvas): AiSuggestion[] {
  const suggestions: AiSuggestion[] = []

  for (const section of canvas.sections) {
    if (section.type === 'cover') {
      if (!section.data.subtitle || section.data.subtitle.length < 8) {
        suggestions.push({
          id: 'cover_subtitle',
          label: '封面副標題',
          description: '生成吸引客人的封面副標題（20-30 字）',
          instruction: `為旅遊行程「${section.data.title}」生成一句 20-30 字的副標題，有旅遊感、有溫度，不要用「體驗」兩字`,
          target: { type: 'cover', field: 'subtitle' },
        })
      }
    }

    if (section.type === 'day') {
      const header = section.blocks.find(b => b.type === 'day_header')
      if (header?.type === 'day_header' && !header.data.summary) {
        const routes = section.blocks.filter(b => b.type === 'route_card')
        const attractions = routes.flatMap(r =>
          r.type === 'route_card' ? r.data.attractions.map(a => a.name) : []
        )
        suggestions.push({
          id: `day_${section.day_index}_summary`,
          label: `Day ${section.day_index} 日程概述`,
          description: header.data.title,
          instruction: `為旅遊行程第 ${section.day_index} 天「${header.data.title}」生成一段日程概述（50-80字）。當天景點：${attractions.join('、') || '待定'}。風格：有畫面感、期待感強`,
          target: {
            type: 'day_header',
            block_id: header.id,
            day_index: section.day_index,
            field: 'summary',
          },
        })
      }
    }

    if (section.type === 'appendix') {
      if (!section.data.inclusions?.length) {
        suggestions.push({
          id: 'appendix_inclusions',
          label: '費用包含清單',
          description: '根據行程生成費用包含項目（5-8 項）',
          instruction:
            '為精品旅遊包團行程生成費用包含清單，條列式，每項 10-20 字，共 5-8 項，包括：機票、住宿、接送、景點門票等常見項目',
          target: { type: 'appendix', field: 'inclusions' },
        })
      }
      if (!section.data.exclusions?.length) {
        suggestions.push({
          id: 'appendix_exclusions',
          label: '費用不含清單',
          description: '根據行程生成費用不含項目（4-6 項）',
          instruction:
            '為精品旅遊包團行程生成費用不含清單，條列式，每項 10-20 字，共 4-6 項，包括：護照費、個人消費、旅遊平安險等',
          target: { type: 'appendix', field: 'exclusions' },
        })
      }
    }
  }

  return suggestions
}

/** 把 canvas 壓縮成純文字摘要，給 AI 讀（省 token） */
export function compressCanvasForAi(canvas: Canvas): string {
  const lines: string[] = []

  for (const section of canvas.sections) {
    if (section.type === 'cover') {
      lines.push(
        `行程名稱：${section.data.title}${section.data.subtitle ? '（' + section.data.subtitle + '）' : ''}`
      )
      if (section.data.departure_date) lines.push(`出發：${section.data.departure_date}`)
    } else if (section.type === 'day') {
      const header = section.blocks.find(b => b.type === 'day_header')
      const routes = section.blocks.filter(b => b.type === 'route_card')
      const hotel = section.blocks.find(b => b.type === 'hotel_card')
      const attractions = routes.flatMap(r =>
        r.type === 'route_card' ? r.data.attractions.map(a => a.name) : []
      )
      const dayTitle =
        header?.type === 'day_header' ? header.data.title : `Day ${section.day_index}`
      let line = `Day ${section.day_index}（${section.date}）${dayTitle}`
      if (attractions.length) line += `：${attractions.join('、')}`
      if (hotel?.type === 'hotel_card') line += `。住：${hotel.data.name}`
      lines.push(line)
    }
  }

  return lines.join('\n')
}

/** 把單一 AI patch 套進 canvas，回傳新 canvas */
export function applyAiPatch(canvas: Canvas, patch: AiPatch): Canvas {
  const { target, generated } = patch

  if (target.type === 'cover') {
    return updateCoverData(canvas, { [target.field]: generated })
  }

  if (target.type === 'day_header') {
    return updateDayHeaderBlock(canvas, target.block_id, { [target.field]: generated })
  }

  if (target.type === 'appendix') {
    // inclusions / exclusions / notices 是 string[]，按行切割
    const arr = generated
      .split('\n')
      .map(s => s.replace(/^[-•·\d.]\s*/, '').trim())
      .filter(Boolean)
    return {
      ...canvas,
      sections: canvas.sections.map(s =>
        s.type === 'appendix' ? { ...s, data: { ...s.data, [target.field]: arr } } : s
      ),
    }
  }

  return canvas
}

// ============ 通用 block map（內部用、避免每個 updater 重複） ============

function mapBlock(
  canvas: Canvas,
  blockId: string,
  fn: (b: CanvasDayBlock) => CanvasDayBlock
): Canvas {
  return {
    ...canvas,
    sections: canvas.sections.map(s => {
      if (s.type !== 'day') return s
      let changed = false
      const nextBlocks = s.blocks.map(b => {
        if (b.id !== blockId) return b
        const updated = fn(b)
        if (updated !== b) changed = true
        return updated
      })
      return changed ? { ...s, blocks: nextBlocks } : s
    }),
  }
}
