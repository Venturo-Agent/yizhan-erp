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
  CanvasFlightCardBlock,
  CanvasJpNoteBlock,
  CanvasLeaderMeetingSection,
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
  | { kind: 'leader_meeting' }
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

// ============ 改 leader_meeting section ============

/**
 * 更新領隊・集合 section 的 leader / meeting 子物件。
 * patch 是「合併進現有 data」、leader / meeting 各自淺合併（保留沒動到的欄位）。
 * 找不到該 section 回原 canvas（不報錯）。
 */
export function updateLeaderMeetingSection(
  canvas: Canvas,
  patch: {
    leader?: Partial<NonNullable<CanvasLeaderMeetingSection['data']['leader']>>
    meeting?: Partial<NonNullable<CanvasLeaderMeetingSection['data']['meeting']>>
  }
): Canvas {
  return {
    ...canvas,
    sections: canvas.sections.map(s => {
      if (s.type !== 'leader_meeting') return s
      return {
        ...s,
        data: {
          leader: patch.leader ? { ...s.data.leader, ...patch.leader } : s.data.leader,
          meeting: patch.meeting ? { ...s.data.meeting, ...patch.meeting } : s.data.meeting,
        },
      }
    }),
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

// ============ 改 flight_card block ============

export function updateFlightCardBlock(
  canvas: Canvas,
  blockId: string,
  patch: Partial<CanvasFlightCardBlock['data']>
): Canvas {
  return mapBlock(canvas, blockId, b => {
    if (b.type !== 'flight_card') return b
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

// ============ 隱藏 / 顯示開關（工單3 積木開關、可逆、不丟資料） ============

/**
 * 翻轉某個 day block 的 hidden 旗標（顯示 ↔ 隱藏）。
 * hidden=undefined（=顯示）→ true（隱藏）；true → false（顯示）。
 * 不可變更新、找不到 blockId 回原 canvas（不報錯）。
 * 跟 deleteBlock 並存：隱藏是可逆開關、刪除是移除陣列、兩者各有用途。
 */
export function toggleHiddenBlock(canvas: Canvas, blockId: string): Canvas {
  return mapBlock(canvas, blockId, b => ({ ...b, hidden: !b.hidden }))
}

/**
 * 翻轉某個 section 的 hidden 旗標（顯示 ↔ 隱藏）。
 * 用 section 在 canvas.sections 的 index 識別（樹狀清單也用 idx、對齊）。
 * index 越界回原 canvas（不報錯）。
 */
export function toggleHiddenSection(canvas: Canvas, sectionIndex: number): Canvas {
  if (sectionIndex < 0 || sectionIndex >= canvas.sections.length) return canvas
  return {
    ...canvas,
    sections: canvas.sections.map((s, i) => (i === sectionIndex ? { ...s, hidden: !s.hidden } : s)),
  }
}

// ============ 景點升級為亮點 spotlight（工單4） ============

/**
 * 把 route_card 內某個景點「一鍵升級」成同一天的 spotlight 亮點 block。
 *
 * 為什麼這樣設計：
 * - 賣點命脈「亮點不被埋沒」：業務不用手打、把有料景點抬成獨享一頁寬的特色介紹
 * - 接既有 spotlight（不增 SSOT、不碰 focus_cards）：升完還能用 SpotlightEditor 微調
 * - 零幻覺：只搬既有料（name/category/description/image）、不無中生有
 *
 * 帶料映射：
 * - tag    ← 景點 category（eyebrow 眉標）
 * - title  ← 景點 name
 * - lead   ← 景點 description（之後 AI 工單 5 可再潤色）
 * - image  ← 景點 image
 * - image_position 預設 'right'
 *
 * 原景點處理（§六開放問題3 未拍板、此採預設）：
 * - 從 route_card 移除該景點（避免同景點重複顯示）
 * - 若移除後該 route_card attractions 空了 → 連 route_card 一起移除
 * - spotlight 插在原 route_card 之後（同一天、視覺接續）
 *
 * 不可變更新；找不到 block / 景點回原 canvas（不報錯）。
 */
export function promoteAttractionToSpotlight(
  canvas: Canvas,
  routeCardBlockId: string,
  attractionId: string
): Canvas {
  return {
    ...canvas,
    sections: canvas.sections.map(s => {
      if (s.type !== 'day') return s
      const idx = s.blocks.findIndex(b => b.id === routeCardBlockId)
      if (idx === -1) return s
      const target = s.blocks[idx]
      if (target.type !== 'route_card') return s

      const attr = target.data.attractions.find(a => a.id === attractionId)
      if (!attr) return s

      // 1) 從 route_card 移除該景點
      const remaining = target.data.attractions.filter(a => a.id !== attractionId)

      // 2) 組 spotlight block（搬料、不編造）
      const spotlight: CanvasSpotlightBlock = {
        id: crypto.randomUUID(),
        type: 'spotlight',
        data: {
          tag: attr.category || undefined,
          title: attr.name,
          lead: attr.description || undefined,
          image: attr.image,
          image_position: 'right',
        },
      }

      // 3) 重組 blocks：route_card 空了就移除、否則保留更新後的 attractions
      const nextBlocks: CanvasDayBlock[] = []
      for (let i = 0; i < s.blocks.length; i++) {
        if (i === idx) {
          if (remaining.length > 0) {
            nextBlocks.push({ ...target, data: { ...target.data, attractions: remaining } })
          }
          // spotlight 接在原 route_card 位置之後
          nextBlocks.push(spotlight)
        } else {
          nextBlocks.push(s.blocks[i])
        }
      }

      return { ...s, blocks: nextBlocks }
    }),
  }
}

// ============ 餐廳 / 飯店 升級為亮點 spotlight（工單6 三類亮點） ============

/**
 * 把某張餐廳卡「一鍵升級」成同一天的 spotlight 亮點 block。
 *
 * 為什麼跟景點分開寫：餐廳卡的料欄位不同（meal / cuisine / description / image）、
 * 沒有 highlights / category；映射規則自然不同。三類各一個 promote、邏輯清楚不繞。
 *
 * 帶料映射（零幻覺・只搬既有料）：
 * - tag    ← 餐型中文（早餐 / 午餐 / 晚餐）＋ 菜系（cuisine、若有）
 * - title  ← 餐廳 name
 * - lead   ← 餐廳 description（之後 AI 可再潤色）
 * - image  ← 餐廳 image
 *
 * 原餐廳卡處理：升級後該 restaurant_card 從 blocks 移除（避免同一餐重複顯示）、
 * spotlight 接在原位置。不可變更新、找不到 block 回原 canvas。
 */
export function promoteRestaurantToSpotlight(canvas: Canvas, restaurantBlockId: string): Canvas {
  return promoteBlockToSpotlight(canvas, restaurantBlockId, b => {
    if (b.type !== 'restaurant_card') return null
    const mealLabel = MEAL_LABEL[b.data.meal]
    const tagParts = [mealLabel, b.data.cuisine?.trim()].filter(Boolean)
    return {
      tag: tagParts.length ? tagParts.join('・') : undefined,
      title: b.data.name,
      lead: b.data.description || undefined,
      image: b.data.image,
      image_position: 'right',
    }
  })
}

/**
 * 把某張住宿卡「一鍵升級」成同一天的 spotlight 亮點 block。
 *
 * 帶料映射（零幻覺・只搬既有料）：
 * - tag    ← 「精選住宿」固定眉標（hotel_card 無分類欄位、用固定通用詞、不編造）
 * - title  ← 飯店 name
 * - lead   ← 飯店 description（之後 AI 可再潤色；location 併進 lead 前綴若有）
 * - image  ← 飯店 image
 *
 * 原住宿卡處理：升級後該 hotel_card 從 blocks 移除、spotlight 接在原位置。
 */
export function promoteHotelToSpotlight(canvas: Canvas, hotelBlockId: string): Canvas {
  return promoteBlockToSpotlight(canvas, hotelBlockId, b => {
    if (b.type !== 'hotel_card') return null
    const leadParts = [b.data.location?.trim(), b.data.description?.trim()].filter(Boolean)
    return {
      tag: '精選住宿',
      title: b.data.name,
      lead: leadParts.length ? leadParts.join('・') : undefined,
      image: b.data.image,
      image_position: 'right',
    }
  })
}

const MEAL_LABEL: Record<'breakfast' | 'lunch' | 'dinner', string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
}

/**
 * 通用「整塊 block 升級成 spotlight」內部 helper。
 * mapData 回 null = 此 block 不適用（型別不符）、回 spotlight data = 升級。
 * 移除原 block、spotlight 接在原位置、不可變更新。
 */
function promoteBlockToSpotlight(
  canvas: Canvas,
  blockId: string,
  mapData: (b: CanvasDayBlock) => CanvasSpotlightBlock['data'] | null
): Canvas {
  return {
    ...canvas,
    sections: canvas.sections.map(s => {
      if (s.type !== 'day') return s
      const idx = s.blocks.findIndex(b => b.id === blockId)
      if (idx === -1) return s
      const target = s.blocks[idx]
      const data = mapData(target)
      if (!data) return s

      const spotlight: CanvasSpotlightBlock = {
        id: crypto.randomUUID(),
        type: 'spotlight',
        data,
      }
      const nextBlocks = s.blocks.map((b, i) => (i === idx ? spotlight : b))
      return { ...s, blocks: nextBlocks }
    }),
  }
}

// ============ 三類亮點：掃 canvas 找「有料」候選（工單6） ============

/**
 * 三類亮點的「料判斷」底線（賣點命脈：有料才生、沒料不生）。
 *
 * 為什麼這樣定「有料」：spotlight 是獨享一頁寬的特色介紹、撐起版面至少要有
 * 「描述文字」或「圖」其一；景點卡額外吃 highlights（亮點關鍵詞）。
 * 純名稱（只有 name）不算有料——抬成 spotlight 會開天窗、違命脈。
 */
export interface HighlightCandidate {
  /** route_card 景點用 routeCardBlockId + attractionId；餐廳 / 飯店用 blockId */
  kind: 'attraction' | 'restaurant' | 'hotel'
  blockId: string
  /** 景點專用：景點在 route_card.attractions 內的 id */
  attractionId?: string
  dayIndex: number
  name: string
}

/** 景點有料 = 有描述 或 有圖 或 有亮點關鍵詞 */
function attractionHasMaterial(a: CanvasRouteCardBlock['data']['attractions'][number]): boolean {
  return Boolean(a.description?.trim() || a.image?.url || (a.highlights && a.highlights.length > 0))
}

/** 掃出所有「有料」景點候選（給「特色景點」類） */
export function scanAttractionHighlightCandidates(canvas: Canvas): HighlightCandidate[] {
  const out: HighlightCandidate[] = []
  for (const s of canvas.sections) {
    if (s.type !== 'day') continue
    for (const b of s.blocks) {
      if (b.type !== 'route_card') continue
      for (const a of b.data.attractions) {
        if (!attractionHasMaterial(a)) continue
        out.push({
          kind: 'attraction',
          blockId: b.id,
          attractionId: a.id,
          dayIndex: s.day_index,
          name: a.name,
        })
      }
    }
  }
  return out
}

/** 掃出所有「有料」餐廳候選（給「餐廳」類）。有料 = 有描述 或 有圖 */
export function scanRestaurantHighlightCandidates(canvas: Canvas): HighlightCandidate[] {
  const out: HighlightCandidate[] = []
  for (const s of canvas.sections) {
    if (s.type !== 'day') continue
    for (const b of s.blocks) {
      if (b.type !== 'restaurant_card') continue
      if (!(b.data.description?.trim() || b.data.image?.url)) continue
      out.push({ kind: 'restaurant', blockId: b.id, dayIndex: s.day_index, name: b.data.name })
    }
  }
  return out
}

/** 掃出所有「有料」飯店候選（給「入住」類）。有料 = 有描述 或 有圖 */
export function scanHotelHighlightCandidates(canvas: Canvas): HighlightCandidate[] {
  const out: HighlightCandidate[] = []
  for (const s of canvas.sections) {
    if (s.type !== 'day') continue
    for (const b of s.blocks) {
      if (b.type !== 'hotel_card') continue
      if (!(b.data.description?.trim() || b.data.image?.url)) continue
      out.push({ kind: 'hotel', blockId: b.id, dayIndex: s.day_index, name: b.data.name })
    }
  }
  return out
}

/**
 * 把一個亮點候選升級成 spotlight（按 kind 分流到三個 promote）。
 * 統一入口、讓 dialog 批次升級時不用自己判 kind。
 */
export function promoteHighlightCandidate(canvas: Canvas, c: HighlightCandidate): Canvas {
  switch (c.kind) {
    case 'attraction':
      // attractionId 必有（scan 時一定帶）；防呆：沒帶就原樣回
      return c.attractionId
        ? promoteAttractionToSpotlight(canvas, c.blockId, c.attractionId)
        : canvas
    case 'restaurant':
      return promoteRestaurantToSpotlight(canvas, c.blockId)
    case 'hotel':
      return promoteHotelToSpotlight(canvas, c.blockId)
    default: {
      const _exhaustive: never = c.kind
      return _exhaustive
    }
  }
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
  /**
   * 「料源語料」——這次潤色 / 生成「只准用到」的既有文字（給後端零幻覺護欄比對用）。
   * 護欄會檢查 AI 產出有沒有冒出料源裡沒出現過的專有名詞 / 數字。
   * 空白填空類（封面副標 / 費用清單）可不填——那是「無中生有但無害」的通用文案、
   * 不適用專有名詞比對；亮點潤色（spotlight）必填、因為它最容易亂編地名店名。
   */
  source_material?: string
  target:
    | { type: 'cover'; field: 'subtitle' | 'title' }
    | { type: 'day_header'; block_id: string; day_index: number; field: 'summary' | 'title' }
    | { type: 'appendix'; field: 'inclusions' | 'exclusions' | 'notices' }
    | { type: 'spotlight'; block_id: string; field: 'lead' }
}

export interface AiPatch {
  id: string
  label: string
  target: AiSuggestion['target']
  generated: string
  /** 後端零幻覺護欄標記：true = 產出疑似冒出料源沒有的專有名詞 / 數字、需人工複核 */
  warn?: boolean
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
      // 亮點 spotlight：釘選了但 lead（介紹段落）空 / 太短（< 20 字）→ 建議 AI 潤色
      // 為什麼 < 20 字：spotlight 是「獨享一頁寬」的特色介紹、料太薄撐不起版面
      // 護欄關鍵：source_material 只放「既有的料」（tag / title / 既有 lead）
      //          AI 只能改寫這些、不准無中生有地名店名數字（route.ts 後端再驗一次）
      for (const block of section.blocks) {
        if (block.type !== 'spotlight') continue
        const lead = block.data.lead?.trim() ?? ''
        if (lead.length >= 20) continue

        // 既有料：眉標（多為景點分類）+ 標題（景點名）+ 既有薄 lead（若有）
        const tag = block.data.tag?.trim() ?? ''
        const title = block.data.title?.trim() ?? ''
        const materialParts = [
          tag ? `分類：${tag}` : '',
          title ? `名稱：${title}` : '',
          lead ? `既有描述：${lead}` : '',
        ].filter(Boolean)
        const sourceMaterial = materialParts.join('；')

        suggestions.push({
          id: `spotlight_${block.id}_lead`,
          label: `亮點潤色・${title || '特色介紹'}`,
          description: lead ? '把現有描述潤飾得更有溫度' : '為這個亮點寫一段有溫度的介紹',
          // 鐵律塞進 instruction、後端 system prompt 再守一次（雙保險）
          instruction: `把以下「特色亮點」的既有資料潤色成一段 60-100 字、有溫度有畫面感的繁體中文介紹。鐵律：只能改寫我給的料、不准新增任何地名／店名／景點名／數字／單位、不准無中生有。料：${sourceMaterial || title}`,
          source_material: sourceMaterial || title,
          target: { type: 'spotlight', block_id: block.id, field: 'lead' },
        })
      }

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

  if (target.type === 'spotlight') {
    return updateSpotlightBlock(canvas, target.block_id, { [target.field]: generated })
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
