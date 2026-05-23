/**
 * Canvas時序步驟 — Sequence Steps
 *
 * 視覺基準：/Users/william/Downloads/tokyo-sendai-private-2026.html (line 1086-1185, 1252-1296)
 *
 * 結構：
 * - 白底卡 + rule 細邊
 * - 標題（Cormorant italic uppercase + 底部 rule）
 * - 垂直時間軸：每 step 左 80px time（Cormorant 紅銅 italic）+ 右標題 + 描述
 * - step 之間虛線分隔（最後一格不畫）
 */

import * as React from 'react'

import { YONGCHENG_COLORS, YONGCHENG_FONTS, YONGCHENG_TEXT_STYLE } from '../tokens'
import type { CanvasSequenceStepsBlock } from '../types'

interface CanvasSequenceStepsProps {
  block: CanvasSequenceStepsBlock
}

export function CanvasSequenceSteps({ block }: CanvasSequenceStepsProps) {
  const { title, steps } = block.data
  return (
    <div
      style={{
        marginTop: 24,
        padding: '32px 36px',
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
        — {title ?? '一日順序'}
      </div>
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1
        return (
          <div
            key={step.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '80px 1fr',
              gap: 16,
              padding: isLast ? '14px 0 0 0' : '14px 0',
              borderBottom: isLast ? 'none' : `1px dashed ${YONGCHENG_COLORS.rule}`,
            }}
          >
            <div
              style={{
                fontFamily: YONGCHENG_FONTS.cormorant,
                fontStyle: 'italic',
                fontSize: 18,
                color: YONGCHENG_COLORS.copper,
                lineHeight: 1,
                paddingTop: 4,
                fontWeight: 500,
                letterSpacing: '0.06em',
              }}
            >
              {step.time}
            </div>
            <div>
              <h6
                style={{
                  ...YONGCHENG_TEXT_STYLE,
                  fontFamily: YONGCHENG_FONTS.serif,
                  fontWeight: 500,
                  fontSize: 17,
                  color: YONGCHENG_COLORS.ink,
                  marginBottom: 4,
                }}
              >
                {step.title}
              </h6>
              {step.description ? (
                <p
                  style={{
                    ...YONGCHENG_TEXT_STYLE,
                    fontFamily: YONGCHENG_FONTS.sans,
                    fontSize: 13,
                    color: YONGCHENG_COLORS.muted,
                    lineHeight: 1.75,
                  }}
                >
                  {step.description}
                </p>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}
