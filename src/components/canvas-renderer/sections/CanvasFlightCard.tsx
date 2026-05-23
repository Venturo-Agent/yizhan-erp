/**
 * Canvas航班卡 — Flight Card（簡單版）
 *
 * 視覺：兩端城市 + 中間飛機線 + 起降時間 + 航空公司
 * 仙台 HTML 沒專門的航班卡 block、用 day-meta 內 Flight 表達。
 * 這裡做獨立卡、跟 day-meta 互補。
 */

import * as React from 'react'

import { YONGCHENG_COLORS, YONGCHENG_FONTS, YONGCHENG_TEXT_STYLE } from '../tokens'
import type { CanvasFlightCardBlock } from '../types'

interface CanvasFlightCardProps {
  block: CanvasFlightCardBlock
}

function CityCol({
  city,
  airport,
  time,
  align,
}: {
  city: string
  airport?: string
  time?: string
  align: 'left' | 'right'
}) {
  return (
    <div style={{ textAlign: align }}>
      {time ? (
        <div
          style={{
            fontFamily: YONGCHENG_FONTS.cormorant,
            fontStyle: 'italic',
            fontSize: 28,
            color: YONGCHENG_COLORS.copper,
            letterSpacing: '0.04em',
            lineHeight: 1,
            marginBottom: 8,
          }}
        >
          {time}
        </div>
      ) : null}
      <div
        style={{
          fontFamily: YONGCHENG_FONTS.serif,
          fontWeight: 500,
          fontSize: 22,
          color: YONGCHENG_COLORS.ink,
          lineHeight: 1.3,
        }}
      >
        {city}
      </div>
      {airport ? (
        <div
          style={{
            fontFamily: YONGCHENG_FONTS.cormorant,
            fontSize: 11,
            color: YONGCHENG_COLORS.muted,
            letterSpacing: '0.18em',
            marginTop: 4,
            textTransform: 'uppercase',
          }}
        >
          {airport}
        </div>
      ) : null}
    </div>
  )
}

export function CanvasFlightCard({ block }: CanvasFlightCardProps) {
  const { from_city, from_airport, from_time, to_city, to_airport, to_time, airline, flight_no } =
    block.data

  return (
    <div
      style={{
        marginTop: 32,
        padding: '28px 36px',
        background: YONGCHENG_COLORS.white,
        border: `1px solid ${YONGCHENG_COLORS.rule}`,
      }}
    >
      <div
        style={{
          fontFamily: YONGCHENG_FONTS.cormorant,
          fontStyle: 'italic',
          fontSize: 12,
          color: YONGCHENG_COLORS.copper,
          letterSpacing: '0.18em',
          marginBottom: 18,
          textTransform: 'uppercase',
          paddingBottom: 14,
          borderBottom: `1px solid ${YONGCHENG_COLORS.rule}`,
        }}
      >
        — Flight
        {airline || flight_no ? (
          <span style={{ marginLeft: 14, color: YONGCHENG_COLORS.ink, fontStyle: 'normal' }}>
            {airline}
            {airline && flight_no ? ' ・ ' : null}
            {flight_no}
          </span>
        ) : null}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          gap: 24,
          alignItems: 'center',
        }}
      >
        <CityCol city={from_city} airport={from_airport} time={from_time} align="left" />
        <div
          style={{
            position: 'relative',
            minWidth: 120,
            height: 1,
            background: YONGCHENG_COLORS.copper,
            opacity: 0.5,
          }}
        >
          <span
            style={{
              ...YONGCHENG_TEXT_STYLE,
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: YONGCHENG_COLORS.white,
              padding: '0 8px',
              fontFamily: YONGCHENG_FONTS.cormorant,
              fontSize: 16,
              color: YONGCHENG_COLORS.copper,
            }}
          >
            ✈
          </span>
        </div>
        <CityCol city={to_city} airport={to_airport} time={to_time} align="right" />
      </div>
    </div>
  )
}
