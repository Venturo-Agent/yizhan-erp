/**
 * 永成款餐廳卡 — Restaurant Card
 *
 * 視覺：餐標籤（早 / 午 / 晚）+ 名稱 + 料理 + 描述 + 縮圖
 * 仙台 HTML 用 ritual-spotlight 表達餐廳重點、這裡做緊湊版（縮圖 + 文字並排）
 */

import * as React from 'react'
import Image from 'next/image'

import { YONGCHENG_COLORS, YONGCHENG_FONTS, YONGCHENG_TEXT_STYLE } from '../tokens'
import type { YongchengRestaurantCardBlock } from '../types'

interface YongchengRestaurantCardProps {
  block: YongchengRestaurantCardBlock
}

const MEAL_LABEL: Record<'breakfast' | 'lunch' | 'dinner', string> = {
  breakfast: '早餐 · BREAKFAST',
  lunch: '午餐 · LUNCH',
  dinner: '晚餐 · DINNER',
}

export function YongchengRestaurantCard({ block }: YongchengRestaurantCardProps) {
  const { meal, name, cuisine, description, image } = block.data
  return (
    <div
      style={{
        marginTop: 28,
        display: 'grid',
        gridTemplateColumns: image?.url ? '220px 1fr' : '1fr',
        gap: 24,
        padding: '20px 24px',
        background: YONGCHENG_COLORS.white,
        border: `1px solid ${YONGCHENG_COLORS.rule}`,
        alignItems: 'start',
      }}
    >
      {image?.url ? (
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
            alt={image.caption ?? name}
            fill
            sizes="220px"
            style={{
              objectFit: 'cover',
              objectPosition:
                image.focal_x !== undefined && image.focal_y !== undefined
                  ? `${image.focal_x}% ${image.focal_y}%`
                  : 'center',
            }}
          />
        </div>
      ) : null}
      <div>
        <div
          style={{
            fontFamily: YONGCHENG_FONTS.cormorant,
            fontStyle: 'italic',
            fontSize: 12,
            color: YONGCHENG_COLORS.copper,
            letterSpacing: '0.18em',
            marginBottom: 8,
            textTransform: 'uppercase',
          }}
        >
          — {MEAL_LABEL[meal]}
        </div>
        <h5
          style={{
            ...YONGCHENG_TEXT_STYLE,
            fontFamily: YONGCHENG_FONTS.serif,
            fontWeight: 500,
            fontSize: 20,
            color: YONGCHENG_COLORS.ink,
            marginBottom: 6,
            lineHeight: 1.4,
          }}
        >
          {name}
        </h5>
        {cuisine ? (
          <div
            style={{
              fontFamily: YONGCHENG_FONTS.sans,
              fontSize: 13,
              color: YONGCHENG_COLORS.muted,
              marginBottom: 10,
            }}
          >
            {cuisine}
          </div>
        ) : null}
        {description ? (
          <p
            style={{
              ...YONGCHENG_TEXT_STYLE,
              fontFamily: YONGCHENG_FONTS.serif,
              fontSize: 14,
              color: YONGCHENG_COLORS.ink,
              lineHeight: 1.85,
              maxWidth: '32em',
            }}
          >
            {description}
          </p>
        ) : null}
      </div>
    </div>
  )
}
