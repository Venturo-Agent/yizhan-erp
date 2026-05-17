/**
 * Canvas 編輯 helper：定位 / 變更 / 刪除 一個 block 或 section。
 *
 * 為什麼集中在這：
 * - YongchengCanvas 結構巢狀（sections → day.blocks）、散在多處 mutate 會出 bug
 * - 統一用「unique key」識別任何可選 / 可編節點（cover / day-X / day-X-block-id ...）
 * - 編輯 panel 跟 page state 之間只交換 key + patch、不互看內部結構
 *
 * 紀律：不在這裡 mutate input、永遠回傳新物件（讓 React 認得到變動 re-render）
 */

import type {
  YongchengCanvas,
  YongchengCoverData,
  YongchengDayBlock,
  YongchengDayHeaderBlock,
  YongchengDaySection,
  YongchengJpNoteBlock,
  YongchengRouteCardBlock,
  YongchengSection,
  YongchengSpotlightBlock,
} from '@/components/tour-display-yongcheng/types'

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
  canvas: YongchengCanvas,
  predicate: (s: YongchengSection) => boolean
): YongchengSection | null {
  return canvas.sections.find(predicate) ?? null
}

export function findBlock(
  canvas: YongchengCanvas,
  blockId: string
): { block: YongchengDayBlock; daySection: YongchengDaySection } | null {
  for (const s of canvas.sections) {
    if (s.type !== 'day') continue
    const b = s.blocks.find((x) => x.id === blockId)
    if (b) return { block: b, daySection: s }
  }
  return null
}

// ============ 改 cover ============

export function updateCoverData(
  canvas: YongchengCanvas,
  patch: Partial<YongchengCoverData>
): YongchengCanvas {
  return {
    ...canvas,
    sections: canvas.sections.map((s) =>
      s.type === 'cover' ? { ...s, data: { ...s.data, ...patch } } : s
    ),
  }
}

// ============ 改 day_header block ============

export function updateDayHeaderBlock(
  canvas: YongchengCanvas,
  blockId: string,
  patch: Partial<YongchengDayHeaderBlock['data']>
): YongchengCanvas {
  return mapBlock(canvas, blockId, (b) => {
    if (b.type !== 'day_header') return b
    return { ...b, data: { ...b.data, ...patch } }
  })
}

// ============ 改 spotlight block ============

export function updateSpotlightBlock(
  canvas: YongchengCanvas,
  blockId: string,
  patch: Partial<YongchengSpotlightBlock['data']>
): YongchengCanvas {
  return mapBlock(canvas, blockId, (b) => {
    if (b.type !== 'spotlight') return b
    return { ...b, data: { ...b.data, ...patch } }
  })
}

// ============ 改 jp_note block ============

export function updateJpNoteBlock(
  canvas: YongchengCanvas,
  blockId: string,
  patch: Partial<YongchengJpNoteBlock['data']>
): YongchengCanvas {
  return mapBlock(canvas, blockId, (b) => {
    if (b.type !== 'jp_note') return b
    return { ...b, data: { ...b.data, ...patch } }
  })
}

// ============ 改 route_card 內某個 attraction ============

export function updateRouteCardAttraction(
  canvas: YongchengCanvas,
  blockId: string,
  attractionId: string,
  patch: Partial<YongchengRouteCardBlock['data']['attractions'][number]>
): YongchengCanvas {
  return mapBlock(canvas, blockId, (b) => {
    if (b.type !== 'route_card') return b
    return {
      ...b,
      data: {
        ...b.data,
        attractions: b.data.attractions.map((a) =>
          a.id === attractionId ? { ...a, ...patch } : a
        ),
      },
    }
  })
}

// ============ 刪除 block ============

export function deleteBlock(canvas: YongchengCanvas, blockId: string): YongchengCanvas {
  return {
    ...canvas,
    sections: canvas.sections.map((s) => {
      if (s.type !== 'day') return s
      const next = s.blocks.filter((b) => b.id !== blockId)
      if (next.length === s.blocks.length) return s
      return { ...s, blocks: next }
    }),
  }
}

// ============ 通用 block map（內部用、避免每個 updater 重複） ============

function mapBlock(
  canvas: YongchengCanvas,
  blockId: string,
  fn: (b: YongchengDayBlock) => YongchengDayBlock
): YongchengCanvas {
  return {
    ...canvas,
    sections: canvas.sections.map((s) => {
      if (s.type !== 'day') return s
      let changed = false
      const nextBlocks = s.blocks.map((b) => {
        if (b.id !== blockId) return b
        const updated = fn(b)
        if (updated !== b) changed = true
        return updated
      })
      return changed ? { ...s, blocks: nextBlocks } : s
    }),
  }
}
