/**
 * 永成款住宿卡 — Hotel Card（簡單版）
 *
 * 視覺基準：仙台 HTML 內 ritual-spotlight 風 + tl-card 簡化
 * 結構：橫幅圖 + 星級 + 名稱 + 地點 + 描述
 */

import * as React from 'react'
import Image from 'next/image'

import { YONGCHENG_COLORS, YONGCHENG_FONTS, YONGCHENG_TEXT_STYLE } from '../tokens'
import type { CanvasHotelCardBlock } from '../types'

interface CanvasHotelCardProps {
  block: CanvasHotelCardBlock
}

function renderStars(rating: number) {
  const full = Math.max(0, Math.min(5, Math.round(rating)))
  return '★'.repeat(full) + '☆'.repeat(5 - full)
}

export function CanvasHotelCard({ block }: CanvasHotelCardProps) {
  const { name, rating, location, description, image } = block.data
  return (
    <div
      style={{
        marginTop: 36,
        background: YONGCHENG_COLORS.white,
        border: `1px solid ${YONGCHENG_COLORS.rule}`,
        overflow: 'hidden',
      }}
    >
      {image?.url ? (
        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '21 / 9',
            background: YONGCHENG_COLORS.paper,
          }}
        >
          <Image
            src={image.url}
            alt={image.caption ?? name}
            fill
            sizes="(max-width: 1200px) 100vw, 1000px"
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
      <div style={{ padding: '28px 32px 32px 32px' }}>
        <div
          style={{
            fontFamily: YONGCHENG_FONTS.cormorant,
            fontStyle: 'italic',
            fontSize: 12,
            color: YONGCHENG_COLORS.copper,
            letterSpacing: '0.18em',
            marginBottom: 10,
            textTransform: 'uppercase',
          }}
        >
          — Stay
          {rating !== undefined ? (
            <span
              style={{
                marginLeft: 14,
                fontFamily: YONGCHENG_FONTS.sans,
                letterSpacing: '0.1em',
                color: YONGCHENG_COLORS.copper,
              }}
            >
              {renderStars(rating)}
            </span>
          ) : null}
        </div>
        <h4
          style={{
            ...YONGCHENG_TEXT_STYLE,
            fontFamily: YONGCHENG_FONTS.serif,
            fontWeight: 500,
            fontSize: 24,
            color: YONGCHENG_COLORS.ink,
            marginBottom: 8,
            lineHeight: 1.4,
          }}
        >
          {name}
        </h4>
        {location ? (
          <div
            style={{
              fontFamily: YONGCHENG_FONTS.sans,
              fontSize: 13,
              color: YONGCHENG_COLORS.muted,
              marginBottom: 14,
              letterSpacing: '0.03em',
            }}
          >
            {location}
          </div>
        ) : null}
        {description ? (
          <p
            style={{
              ...YONGCHENG_TEXT_STYLE,
              fontFamily: YONGCHENG_FONTS.serif,
              fontSize: 15,
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
