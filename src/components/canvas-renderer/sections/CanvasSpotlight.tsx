/**
 * Canvas · Ritual Spotlight — 兩欄式特色介紹
 *
 * 視覺基準：/Users/william/Downloads/tokyo-sendai-private-2026.html
 * - CSS class `.ritual-spotlight`（line 539-587）
 * - 用例：line 945（湯波午餐）、line 961（界 鬼怒川）、line 998（江戶村）、
 *         line 1021、1074、1125、1156、1168、1298、1332 ...（仙台原版用了 11 次）
 *
 * ──────────────────────────────────────────────────
 *  概念 / 為什麼要這個組件
 * ──────────────────────────────────────────────────
 * 旅遊提案到了「重點時刻」、不能再用條列景點卡的格式。
 * 一頓餐、一晚飯店、一個體驗、需要「停下來慢慢介紹」的版型。
 *
 * 視覺氣質：
 * - 兩欄 1:1、左右互換、像電影分鏡
 * - 文字一側用 tag（眉批）+ 36px 大標 + 17px lead（line-height 1.85 慢讀）
 * - 圖一側 4:3 滿版、不裁切、不加邊框
 * - 整段間距 padding 48px 0、左右 gap 48px、給內容呼吸空間
 *
 * 跟 Hotel/Restaurant Card 的差異：
 * - 那兩個是「列表卡」、給 Stays 總覽或 Day 內基本資訊用
 * - Spotlight 是「精選頁」、Day 內某餐 / 某晚有故事可講才用
 * - 業務在編輯器選用法、不是自動產生（手動選擇要把哪個餐廳 / 飯店升級為 spotlight）
 */

import * as React from 'react'
import Image from 'next/image'

import { YONGCHENG_COLORS, YONGCHENG_FONTS, YONGCHENG_TEXT_STYLE } from '../tokens'
import { renderAccentTitle } from '../_utils'
import type { CanvasSpotlightBlock } from '../types'

interface CanvasSpotlightProps {
  block: CanvasSpotlightBlock
}

export function CanvasSpotlight({ block }: CanvasSpotlightProps) {
  const { tag, title, lead, image, image_position } = block.data
  const imageOnLeft = image_position === 'left'

  // ──────────────────────────────────────────────────
  // 文字段
  // ──────────────────────────────────────────────────
  const textPanel = (
    <div>
      {tag ? (
        <div
          style={{
            fontFamily: YONGCHENG_FONTS.cormorant,
            fontStyle: 'italic',
            fontSize: 13,
            color: YONGCHENG_COLORS.copper,
            letterSpacing: '0.18em',
            marginBottom: 12,
            textTransform: 'uppercase',
          }}
        >
          {tag}
        </div>
      ) : null}
      <h3
        style={{
          ...YONGCHENG_TEXT_STYLE,
          fontFamily: YONGCHENG_FONTS.serif,
          fontWeight: 500,
          fontSize: 36,
          color: YONGCHENG_COLORS.ink,
          lineHeight: 1.35,
          marginBottom: 18,
          marginTop: 0,
        }}
      >
        {renderAccentTitle(title)}
      </h3>
      {lead ? (
        <p
          style={{
            ...YONGCHENG_TEXT_STYLE,
            fontFamily: YONGCHENG_FONTS.serif,
            fontWeight: 400,
            fontSize: 17,
            color: YONGCHENG_COLORS.ink,
            lineHeight: 1.85,
            margin: 0,
            whiteSpace: 'pre-line', // 支援 \n 換行（業務寫多行的場景）
          }}
        >
          {lead}
        </p>
      ) : null}
    </div>
  )

  // ──────────────────────────────────────────────────
  // 圖
  // ──────────────────────────────────────────────────
  const imagePanel = image?.url ? (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '4 / 3',
        background: YONGCHENG_COLORS.paper,
      }}
    >
      <Image
        src={image.url}
        alt={image.caption ?? title}
        fill
        sizes="(max-width: 1200px) 100vw, 50vw"
        style={{
          objectFit: 'cover',
          objectPosition:
            image.focal_x !== undefined && image.focal_y !== undefined
              ? `${image.focal_x}% ${image.focal_y}%`
              : 'center',
          filter:
            image.brightness !== undefined || image.contrast !== undefined
              ? `brightness(${100 + (image.brightness ?? 0)}%) contrast(${
                  100 + (image.contrast ?? 0)
                }%)`
              : undefined,
        }}
      />
      {image.caption ? (
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            left: 16,
            fontFamily: YONGCHENG_FONTS.cormorant,
            fontSize: 10,
            color: 'rgba(245,240,232,0.92)',
            letterSpacing: '0.12em',
            textShadow: '0 1px 4px rgba(0,0,0,0.5)',
          }}
        >
          {image.caption}
        </div>
      ) : null}
    </div>
  ) : (
    // 無圖時：放霧米底 + 紅銅虛線、不破壞 1:1 grid
    <div
      style={{
        width: '100%',
        aspectRatio: '4 / 3',
        background: YONGCHENG_COLORS.paper,
        border: `1px dashed ${YONGCHENG_COLORS.rule}`,
      }}
    />
  )

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 48,
        alignItems: 'center',
        // 校對：仙台 HTML .ritual-spotlight 預設 margin-top: 32px（line 544）
        // 部分用例 inline override 48px（line 945、961、1021）— 對應「day 內第一個 spotlight」
        // 我們的 fixture 跟 demo 不知道排第幾、走預設 32px 對齊基線
        marginTop: 32,
        padding: '48px 0',
      }}
    >
      {imageOnLeft ? imagePanel : textPanel}
      {imageOnLeft ? textPanel : imagePanel}
    </div>
  )
}
