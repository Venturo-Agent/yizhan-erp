/**
 * Canvas行程總覽時間軸 — Overview Timeline
 *
 * 視覺基準：/Users/william/Downloads/tokyo-sendai-private-2026.html (line 819-857)
 *
 * 結構：
 * - bleed-paper section（霧米背景滿版）
 * - eyebrow + title + key-msg
 * - 水平 grid N 格（每格上緣紅銅 2px 橫線）
 * - 每格：DAY 編號（Cormorant uppercase）+ 標題 + 摘要
 */

import * as React from 'react'

import { YONGCHENG_COLORS, YONGCHENG_FONTS, YONGCHENG_TEXT_STYLE } from '../tokens'
import type { CanvasTimelineDay } from '../types'

interface CanvasOverviewTimelineProps {
  days: CanvasTimelineDay[]
  eyebrow?: string
  title?: string
  /**
   * 為什麼可選：規格書沒 keyMsg、但仙台版 HTML 有「四晚不同主題的頂級旅館」key-msg、保留 prop
   */
  keyMsg?: string
}

export function CanvasOverviewTimeline({
  days,
  eyebrow = '01',
  title = '六天行程一覽。',
  keyMsg,
}: CanvasOverviewTimelineProps) {
  const cols = Math.max(days.length, 1)
  return (
    <section
      id="overview"
      style={{
        padding: '96px 64px',
        margin: '0 -64px',
        background: YONGCHENG_COLORS.paper,
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
        SIX DAYS · OVERVIEW
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
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 18,
          marginTop: 32,
        }}
      >
        {days.map((day) => (
          <div
            key={day.day_index}
            style={{
              borderTop: `2px solid ${YONGCHENG_COLORS.copper}`,
              padding: '16px 0 0 0',
            }}
          >
            <div
              style={{
                fontFamily: YONGCHENG_FONTS.cormorant,
                fontSize: 12,
                color: YONGCHENG_COLORS.copper,
                letterSpacing: '0.2em',
                marginBottom: 8,
              }}
            >
              DAY {day.day_index}
            </div>
            <h5
              style={{
                ...YONGCHENG_TEXT_STYLE,
                fontFamily: YONGCHENG_FONTS.serif,
                fontWeight: 500,
                fontSize: 16,
                color: YONGCHENG_COLORS.ink,
                marginBottom: 10,
                lineHeight: 1.4,
              }}
            >
              {day.title}
            </h5>
            <p
              style={{
                ...YONGCHENG_TEXT_STYLE,
                fontFamily: YONGCHENG_FONTS.sans,
                fontSize: 12,
                color: YONGCHENG_COLORS.muted,
                lineHeight: 1.7,
              }}
            >
              {day.summary}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
