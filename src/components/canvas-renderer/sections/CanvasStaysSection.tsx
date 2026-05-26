/**
 * Canvas住宿總覽 — Stays Section
 *
 * 視覺基準：/Users/william/Downloads/tokyo-sendai-private-2026.html (line 1347-1406)
 *
 * 結構：
 * - section eyebrow + title + key-msg
 * - 3-up grid（route-card 樣式）
 * - 每格：圖 + nights_label tag + 名稱 + 描述
 */

import * as React from 'react'
import Image from 'next/image'

import { YONGCHENG_COLORS, YONGCHENG_FONTS, YONGCHENG_TEXT_STYLE } from '../tokens'
import type { CanvasStaysSection as StaysSectionType } from '../types'

interface CanvasStaysSectionProps {
  section: StaysSectionType
  /**
   * 為什麼可選：types.ts 沒放 title / keyMsg、由 caller 傳。
   * 預設用仙台 HTML 的文案當 placeholder。
   */
  title?: string
  keyMsg?: string
  eyebrow?: string
}

export function CanvasStaysSection({
  section,
  title = '五個夜晚、五種不同的日本。',
  keyMsg,
  eyebrow = '08',
}: CanvasStaysSectionProps) {
  const items = section.data.items
  return (
    <section
      id="stays"
      style={{
        padding: '96px 0',
        borderTop: `1px solid ${YONGCHENG_COLORS.rule}`,
        minHeight: '60vh',
      }}
    >
      <div
        style={{
          fontFamily: YONGCHENG_FONTS.cormorant,
          fontSize: 13,
          color: YONGCHENG_COLORS.copper,
          letterSpacing: '0.18em',
          marginBottom: 14,
          textTransform: 'uppercase',
        }}
      >
        <span
          style={{
            fontStyle: 'italic',
            fontSize: 14,
            color: YONGCHENG_COLORS.copper,
            marginRight: 16,
            letterSpacing: '0.12em',
          }}
        >
          {eyebrow}
        </span>
        STAYS · 住宿一覽
      </div>
      <h2
        style={{
          ...YONGCHENG_TEXT_STYLE,
          fontFamily: YONGCHENG_FONTS.serif,
          fontWeight: 500,
          fontSize: 56,
          color: YONGCHENG_COLORS.ink,
          lineHeight: 1.25,
          marginBottom: 32,
          maxWidth: '16em',
          letterSpacing: '-0.005em',
        }}
      >
        {title}
      </h2>
      {keyMsg ? (
        <p
          style={{
            ...YONGCHENG_TEXT_STYLE,
            fontFamily: YONGCHENG_FONTS.serif,
            fontWeight: 300,
            fontSize: 22,
            color: YONGCHENG_COLORS.ink,
            lineHeight: 1.7,
            marginBottom: 56,
            maxWidth: '26em',
          }}
        >
          {keyMsg}
        </p>
      ) : null}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 24,
          marginTop: 40,
        }}
      >
        {items.map(stay => (
          <div
            key={stay.id}
            style={{
              background: YONGCHENG_COLORS.white,
              border: `1px solid ${YONGCHENG_COLORS.rule}`,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {stay.image?.url ? (
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '16 / 10',
                  background: YONGCHENG_COLORS.paper,
                }}
              >
                <Image
                  src={stay.image.url}
                  alt={stay.image.caption ?? stay.name}
                  fill
                  sizes="(max-width: 1200px) 33vw, 380px"
                  style={{
                    objectFit: 'cover',
                    objectPosition:
                      stay.image.focal_x !== undefined && stay.image.focal_y !== undefined
                        ? `${stay.image.focal_x}% ${stay.image.focal_y}%`
                        : 'center',
                  }}
                />
              </div>
            ) : null}
            <div style={{ padding: '24px 28px 28px 28px' }}>
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
                — {stay.nights_label}
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
                {stay.name}
              </h4>
              {stay.description ? (
                <p
                  style={{
                    ...YONGCHENG_TEXT_STYLE,
                    fontFamily: YONGCHENG_FONTS.serif,
                    fontWeight: 300,
                    fontSize: 14,
                    color: YONGCHENG_COLORS.muted,
                    lineHeight: 1.7,
                    maxWidth: '22em',
                  }}
                >
                  {stay.description}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
