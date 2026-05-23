/**
 * 永成款 · JP Note — 日文小注解
 *
 * 視覺基準：/Users/william/Downloads/tokyo-sendai-private-2026.html
 * - CSS class `.jp-note`（line 590-605）
 * - 用例：line 956（湯波解釋）、line 972（界 鬼怒川解釋）、line 1137、1180...
 *
 * ──────────────────────────────────────────────────
 *  概念 / 為什麼要這個組件
 * ──────────────────────────────────────────────────
 * 日本旅遊提案常常出現專有名詞：湯波、界、懐石、御宿、ゆば、ご飯...
 * 客人不一定懂、但又不能把行程文案寫得「太教學」。
 *
 * 所以用「腳註」風格：
 * - 不打斷主文閱讀節奏
 * - 但需要知道的人能停下來看
 * - 視覺像書本側邊註解、低調但有重量
 *
 * 視覺氣質：
 * - 霧米底（rgba(232,185,125,0.08)、跟金色 #E8B97D 同色降透明）
 * - 金色左豎線 3px（不是紅銅、避免跟 accent 撞色）
 * - term 用 14px Noto Serif TC 紅銅粗體（一句帶過）
 * - description 用 13px Noto Sans TC 黑字（line-height 1.75）
 */

import * as React from 'react'

import { YONGCHENG_COLORS, YONGCHENG_FONTS } from '../tokens'
import type { CanvasJpNoteBlock } from '../types'

interface CanvasJpNoteProps {
  block: CanvasJpNoteBlock
}

export function CanvasJpNote({ block }: CanvasJpNoteProps) {
  const { term, description } = block.data

  return (
    <div
      style={{
        background: 'rgba(232,185,125,0.08)',
        borderLeft: `3px solid ${YONGCHENG_COLORS.gold}`,
        padding: '16px 20px',
        margin: '20px 0',
        fontFamily: YONGCHENG_FONTS.sans,
        fontSize: 13,
        color: YONGCHENG_COLORS.ink,
        lineHeight: 1.75,
      }}
    >
      <strong
        style={{
          fontFamily: YONGCHENG_FONTS.serif,
          fontWeight: 500,
          fontSize: 14,
          color: YONGCHENG_COLORS.copper,
          display: 'block',
          marginBottom: 4,
        }}
      >
        {term}
      </strong>
      {description}
    </div>
  )
}
