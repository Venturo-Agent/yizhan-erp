import { describe, it, expect } from 'vitest'
import { heuristicAnalyze } from '@/lib/cis/heuristic-analyze'

/**
 * heuristicAnalyze 是純 fallback 規則、不依賴外部 IO。
 * 驗證重點：
 *   - lexicon 命中後才會放進 brand_keywords / emotional_keywords / touchpoints
 *   - value_proposition = 第一句、剝掉句末標點
 *   - priority_needs 依 hint 詞分桶、且把 hint 詞剝掉
 *   - 邊界：空字串、僅標點、超長文字
 */

describe('heuristicAnalyze', () => {
  describe('value_proposition (第一句)', () => {
    it('回傳第一句、不含句末標點', () => {
      const r = heuristicAnalyze('我們是親子旅遊專家。提供深度行程。')
      expect(r.value_proposition).toBe('我們是親子旅遊專家')
    })

    it('沒有標點時回完整片段（在 4-80 字範圍內）', () => {
      const r = heuristicAnalyze('一段沒有句號的描述但夠長可被視為一句')
      expect(r.value_proposition).toBe('一段沒有句號的描述但夠長可被視為一句')
    })

    it('過短（< 4 字）回空字串', () => {
      const r = heuristicAnalyze('短。')
      expect(r.value_proposition).toBe('')
    })

    it('空字串回空字串', () => {
      const r = heuristicAnalyze('')
      expect(r.value_proposition).toBe('')
    })

    it('支援英文標點 (!?.) 結尾', () => {
      const r = heuristicAnalyze('We focus on family tours!')
      expect(r.value_proposition).toBe('We focus on family tours')
    })
  })

  describe('brand_keywords (品牌詞 lexicon)', () => {
    it('擷取 lexicon 命中詞、最多 5 個', () => {
      const r = heuristicAnalyze('我們做親子、銀髮、商務、蜜月、畢旅、客製化都行')
      expect(r.brand_keywords).toEqual(['親子', '銀髮', '商務', '蜜月', '畢旅'])
    })

    it('沒命中時回空陣列', () => {
      const r = heuristicAnalyze('completely unrelated text')
      expect(r.brand_keywords).toEqual([])
    })

    it('重複出現只算一次', () => {
      const r = heuristicAnalyze('親子親子親子的旅程')
      expect(r.brand_keywords).toEqual(['親子'])
    })
  })

  describe('emotional_keywords (情感詞 lexicon)', () => {
    it('命中常見情感詞', () => {
      const r = heuristicAnalyze('我們追求溫暖、安心、貼心的體驗')
      expect(r.emotional_keywords).toContain('溫暖')
      expect(r.emotional_keywords).toContain('安心')
      expect(r.emotional_keywords).toContain('貼心')
    })

    it('與 brand_keywords 互不污染', () => {
      const r = heuristicAnalyze('溫暖')
      expect(r.emotional_keywords).toEqual(['溫暖'])
      expect(r.brand_keywords).toEqual([])
    })
  })

  describe('touchpoints (接觸點 lexicon)', () => {
    it('擷取觸點詞', () => {
      const r = heuristicAnalyze('客戶來自官網、IG、LINE 與 Facebook')
      expect(r.touchpoints).toEqual(expect.arrayContaining(['官網', 'IG', 'LINE', 'Facebook']))
    })
  })

  describe('priority_needs (依 hint 詞分桶)', () => {
    it('「必做」歸 must_do、剝掉 hint 詞', () => {
      const r = heuristicAnalyze('必做新 logo、必做新名片')
      expect(r.priority_needs.must_do).toEqual(['新 logo', '新名片'])
      expect(r.priority_needs.suggested).toEqual([])
      expect(r.priority_needs.optional).toEqual([])
    })

    it('「建議」歸 suggested', () => {
      const r = heuristicAnalyze('建議拍宣傳片，建議翻新官網')
      expect(r.priority_needs.suggested).toEqual(['拍宣傳片', '翻新官網'])
    })

    it('「未來」歸 optional', () => {
      const r = heuristicAnalyze('未來做 app，未來做小紅書')
      // touchpoint 「小紅書」會在 touchpoints 出現、但 need 桶仍照分隔字串走
      expect(r.priority_needs.optional).toContain('做 app')
      expect(r.priority_needs.optional).toContain('做小紅書')
    })

    it('沒 hint 詞的片段不進任何桶', () => {
      const r = heuristicAnalyze('我們是親子旅遊專家')
      expect(r.priority_needs.must_do).toEqual([])
      expect(r.priority_needs.suggested).toEqual([])
      expect(r.priority_needs.optional).toEqual([])
    })

    it('每桶最多 5 筆', () => {
      const items = Array.from({ length: 8 }, (_, i) => `必做項目${i}`).join('，')
      const r = heuristicAnalyze(items)
      expect(r.priority_needs.must_do).toHaveLength(5)
    })

    it('剝完 hint 詞為空的項目會被過濾掉', () => {
      const r = heuristicAnalyze('必做')
      // 「必做」剝完 hint 詞後是空字串、不進桶
      expect(r.priority_needs.must_do).toEqual([])
    })
  })

  describe('差異化 / 視覺暗示預設值', () => {
    it('differentiation 預設為空字串', () => {
      const r = heuristicAnalyze('任何輸入')
      expect(r.differentiation).toBe('')
    })

    it('visual_hints 預設為空物件', () => {
      const r = heuristicAnalyze('任何輸入')
      expect(r.visual_hints).toEqual({})
    })
  })

  describe('邊界條件', () => {
    it('空字串：所有陣列為空、字串為空', () => {
      const r = heuristicAnalyze('')
      expect(r.brand_keywords).toEqual([])
      expect(r.emotional_keywords).toEqual([])
      expect(r.touchpoints).toEqual([])
      expect(r.value_proposition).toBe('')
      expect(r.priority_needs).toEqual({ must_do: [], suggested: [], optional: [] })
    })

    it('null / undefined safe（內部 || \'\' 處理）', () => {
      const r = heuristicAnalyze(undefined as unknown as string)
      expect(r.value_proposition).toBe('')
      expect(r.brand_keywords).toEqual([])
    })
  })
})
