/**
 * 簡體 → 台灣繁體（含台灣慣用詞組轉換）
 *
 * 走 opencc-js（OpenCC 官方 JS port、8000+ 字 + 詞組對應）：
 *   - s2tw：簡體 → 台灣繁體（字符對應）
 *   - 之後可換 s2twp（含台灣詞組差異「軟件→軟體 / 信息→訊息 / 視頻→影片」）
 *
 * 設計（William 2026-05-17 拍板「簡體大忌」）：
 *   - dispatcher 內 LLM 回應 ok 後、強制過這層轉繁
 *   - 雙保險：SYSTEM_PROMPT 已要求繁體、這層守 MiniMax 漏網的字
 */

import * as OpenCC from 'opencc-js'

// 預載 converter（cold start 一次、之後重複用）
// s2tw = 簡體 → 台灣繁體（字級對應、不換詞）
// 之後若要詞組對應改 'tw'（含台灣慣用詞）
const converter = OpenCC.Converter({ from: 'cn', to: 'tw' })

/**
 * 把簡體中文字串轉成台灣繁體。
 * 如果輸入已是繁體、會保持不變（OpenCC 鍵都是簡體字）。
 */
export function toTraditional(text: string): string {
  if (!text) return text
  try {
    return converter(text)
  } catch {
    // OpenCC 理論上不會 throw、保險起見 fallback
    return text
  }
}
