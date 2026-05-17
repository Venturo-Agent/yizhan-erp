/**
 * 永成款景點卡 — Route Card
 *
 * 視覺基準：/Users/william/Downloads/tokyo-sendai-private-2026.html
 * - 3-up grid（line 918-942、1209-1249）— route-grid cols-3
 * - 1-up（line 882-893）— ritual-spotlight 2-col image + text
 * - transit — 規格書 § 4.4「無圖移動日」、紅銅虛線
 *
 * 四種 layout：
 * - 1up：全寬、左圖 60% + 右文字 40%（其實仙台 HTML 是 1:1、但需求說 60/40、依需求）
 * - 2up：grid 1:1
 * - 3up：grid 1:1:1
 * - transit：無圖、紅銅虛線 + 文字
 */

import * as React from 'react'
import Image from 'next/image'

import { YONGCHENG_COLORS, YONGCHENG_FONTS, YONGCHENG_TEXT_STYLE } from '../tokens'
import type { YongchengAttraction, YongchengRouteCardBlock } from '../types'

interface YongchengRouteCardProps {
  block: YongchengRouteCardBlock
}

// ============ 共用：景點卡內容 ============

function AttractionCard({
  attraction,
  index,
}: {
  attraction: YongchengAttraction
  index: number
}) {
  const tagText = attraction.category ?? `SPOT ${String(index + 1).padStart(2, '0')}`
  return (
    <div
      style={{
        background: YONGCHENG_COLORS.white,
        border: `1px solid ${YONGCHENG_COLORS.rule}`,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {attraction.image?.url ? (
        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '16 / 10',
            background: YONGCHENG_COLORS.paper,
          }}
        >
          <Image
            src={attraction.image.url}
            alt={attraction.image.caption ?? attraction.name}
            fill
            sizes="(max-width: 1200px) 100vw, 33vw"
            style={{
              objectFit: 'cover',
              objectPosition:
                attraction.image.focal_x !== undefined && attraction.image.focal_y !== undefined
                  ? `${attraction.image.focal_x}% ${attraction.image.focal_y}%`
                  : 'center',
              filter:
                attraction.image.brightness !== undefined || attraction.image.contrast !== undefined
                  ? `brightness(${100 + (attraction.image.brightness ?? 0)}%) contrast(${
                      100 + (attraction.image.contrast ?? 0)
                    }%)`
                  : undefined,
            }}
          />
          {attraction.image.caption ? (
            <div
              style={{
                position: 'absolute',
                bottom: 8,
                right: 12,
                fontFamily: YONGCHENG_FONTS.cormorant,
                fontSize: 10,
                color: 'rgba(255,255,255,0.92)',
                letterSpacing: '0.12em',
                textShadow: '0 1px 4px rgba(0,0,0,0.5)',
              }}
            >
              {attraction.image.caption}
            </div>
          ) : null}
        </div>
      ) : null}
      {/*
        ▸ 卡身為什麼用 flex column + flex: 1：
          3-up grid 同列三張卡、highlights 數量不同 → 內容高度不同 →
          「建議停留」會卡在 highlights 正下方、不會對齊在卡片底部。
          5/17 William 抓 bug：第一張 3 條 highlight、其他 2 條、底部歪掉。
          現在內容用 flex 撐滿、suggested_duration 用 marginTop: auto 推到底。
          整列三張卡的「建議停留」橫切面齊平、卡片視覺穩。
      */}
      <div
        style={{
          padding: '24px 28px 28px 28px',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
        }}
      >
        <div
          style={{
            fontFamily: YONGCHENG_FONTS.cormorant,
            fontStyle: 'italic',
            fontSize: 12,
            color: YONGCHENG_COLORS.copper,
            letterSpacing: '0.15em',
            marginBottom: 8,
            textTransform: 'uppercase',
          }}
        >
          — {tagText}
        </div>
        <h4
          style={{
            ...YONGCHENG_TEXT_STYLE,
            fontFamily: YONGCHENG_FONTS.serif,
            fontWeight: 500,
            fontSize: 22,
            color: YONGCHENG_COLORS.ink,
            marginBottom: 10,
            lineHeight: 1.4,
          }}
        >
          {attraction.name}
        </h4>
        {attraction.subtitle ? (
          <p
            style={{
              ...YONGCHENG_TEXT_STYLE,
              fontFamily: YONGCHENG_FONTS.serif,
              fontWeight: 300,
              fontSize: 14,
              color: YONGCHENG_COLORS.muted,
              marginBottom: 12,
              lineHeight: 1.7,
            }}
          >
            {attraction.subtitle}
          </p>
        ) : null}
        {attraction.description ? (
          <p
            style={{
              ...YONGCHENG_TEXT_STYLE,
              fontFamily: YONGCHENG_FONTS.serif,
              fontWeight: 300,
              fontSize: 14,
              color: YONGCHENG_COLORS.muted,
              marginBottom: 16,
              lineHeight: 1.7,
              paddingBottom: 14,
              borderBottom:
                attraction.highlights && attraction.highlights.length > 0
                  ? `1px dashed ${YONGCHENG_COLORS.rule}`
                  : 'none',
              maxWidth: '22em',
            }}
          >
            {attraction.description}
          </p>
        ) : null}
        {attraction.highlights && attraction.highlights.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {attraction.highlights.map((h, i) => (
              <li
                key={`${attraction.id}-h-${i}`}
                style={{
                  ...YONGCHENG_TEXT_STYLE,
                  fontFamily: YONGCHENG_FONTS.serif,
                  fontSize: 14,
                  color: YONGCHENG_COLORS.ink,
                  lineHeight: 1.85,
                  padding: '3px 0 3px 16px',
                  position: 'relative',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    left: 0,
                    color: YONGCHENG_COLORS.copper,
                    fontSize: 16,
                    lineHeight: 1.5,
                  }}
                >
                  ・
                </span>
                {h}
              </li>
            ))}
          </ul>
        ) : null}
        {/*
          marginTop: auto = 把這塊推到 flex 容器最底部
          無論上方 highlights 有幾條、建議停留永遠貼底、整列三張卡齊平
        */}
        {attraction.suggested_duration ? (
          <div
            style={{
              marginTop: 'auto',
              paddingTop: 14,
              borderTop: `1px solid ${YONGCHENG_COLORS.rule}`,
              display: 'flex',
              gap: 14,
              flexWrap: 'wrap',
              fontFamily: YONGCHENG_FONTS.cormorant,
              fontStyle: 'italic',
              fontSize: 12,
              color: YONGCHENG_COLORS.muted,
              letterSpacing: '0.04em',
            }}
          >
            <span>{attraction.suggested_duration}</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ============ 1up：左圖右文（ritual-spotlight 風）============

function OneUpCard({ attraction }: { attraction: YongchengAttraction }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '60% 40%',
        gap: 48,
        alignItems: 'center',
        marginTop: 32,
        padding: '48px 0',
      }}
    >
      {attraction.image?.url ? (
        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '4 / 3',
            background: YONGCHENG_COLORS.paper,
          }}
        >
          <Image
            src={attraction.image.url}
            alt={attraction.image.caption ?? attraction.name}
            fill
            sizes="(max-width: 1200px) 60vw, 720px"
            style={{
              objectFit: 'cover',
              objectPosition:
                attraction.image.focal_x !== undefined && attraction.image.focal_y !== undefined
                  ? `${attraction.image.focal_x}% ${attraction.image.focal_y}%`
                  : 'center',
              filter:
                attraction.image.brightness !== undefined || attraction.image.contrast !== undefined
                  ? `brightness(${100 + (attraction.image.brightness ?? 0)}%) contrast(${
                      100 + (attraction.image.contrast ?? 0)
                    }%)`
                  : undefined,
            }}
          />
          {attraction.image.caption ? (
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
              {attraction.image.caption}
            </div>
          ) : null}
        </div>
      ) : (
        <div />
      )}
      <div>
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
          — {attraction.category ?? attraction.name}
        </div>
        <h3
          style={{
            ...YONGCHENG_TEXT_STYLE,
            fontFamily: YONGCHENG_FONTS.serif,
            fontWeight: 500,
            fontSize: 36,
            color: YONGCHENG_COLORS.ink,
            lineHeight: 1.35,
            marginBottom: 18,
          }}
        >
          {attraction.name}
        </h3>
        {attraction.description ? (
          <p
            style={{
              ...YONGCHENG_TEXT_STYLE,
              fontFamily: YONGCHENG_FONTS.serif,
              fontWeight: 400,
              fontSize: 17,
              color: YONGCHENG_COLORS.ink,
              lineHeight: 1.85,
            }}
          >
            {attraction.description}
          </p>
        ) : null}
        {attraction.highlights && attraction.highlights.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0, margin: '18px 0 0 0' }}>
            {attraction.highlights.map((h, i) => (
              <li
                key={`oh-${i}`}
                style={{
                  ...YONGCHENG_TEXT_STYLE,
                  fontFamily: YONGCHENG_FONTS.serif,
                  fontSize: 15,
                  color: YONGCHENG_COLORS.ink,
                  lineHeight: 1.85,
                  padding: '3px 0 3px 18px',
                  position: 'relative',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    left: 0,
                    color: YONGCHENG_COLORS.copper,
                  }}
                >
                  ・
                </span>
                {h}
              </li>
            ))}
          </ul>
        ) : null}
        {attraction.suggested_duration ? (
          <div
            style={{
              marginTop: 18,
              fontFamily: YONGCHENG_FONTS.cormorant,
              fontStyle: 'italic',
              fontSize: 12,
              color: YONGCHENG_COLORS.muted,
              letterSpacing: '0.04em',
            }}
          >
            {attraction.suggested_duration}
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ============ Transit：移動日無圖 ============

function TransitCard({ note }: { note: string }) {
  return (
    <div
      style={{
        marginTop: 24,
        padding: '28px 32px',
        border: `1px dashed ${YONGCHENG_COLORS.copper}`,
        background: 'rgba(245,240,232,0.4)',
        fontFamily: YONGCHENG_FONTS.serif,
      }}
    >
      <div
        style={{
          fontFamily: YONGCHENG_FONTS.cormorant,
          fontStyle: 'italic',
          fontSize: 11,
          color: YONGCHENG_COLORS.copper,
          letterSpacing: '0.3em',
          marginBottom: 10,
          textTransform: 'uppercase',
        }}
      >
        — Transit
      </div>
      <p
        style={{
          ...YONGCHENG_TEXT_STYLE,
          fontSize: 15,
          color: YONGCHENG_COLORS.ink,
          lineHeight: 1.85,
        }}
      >
        {note}
      </p>
    </div>
  )
}

// ============ 主組件：根據 layout 分流 ============

export function YongchengRouteCard({ block }: YongchengRouteCardProps) {
  const { layout, data } = block

  if (layout === 'transit') {
    return <TransitCard note={data.transit_note ?? '移動日'} />
  }

  if (layout === '1up') {
    const first = data.attractions[0]
    if (!first) return null
    return <OneUpCard attraction={first} />
  }

  const cols = layout === '3up' ? 3 : 2
  const gap = cols === 3 ? 24 : 28
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap,
        marginTop: 40,
      }}
    >
      {data.attractions.map((a, i) => (
        <AttractionCard key={a.id} attraction={a} index={i} />
      ))}
    </div>
  )
}
