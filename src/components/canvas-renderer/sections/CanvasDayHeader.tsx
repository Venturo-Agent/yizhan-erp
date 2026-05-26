/**
 * Canvas天數標題 — Day Header
 *
 * 視覺基準：/Users/william/Downloads/tokyo-sendai-private-2026.html (line 860-895)
 *
 * 結構：
 * - 左 130px：DAY tag（紅銅編號 56px + 月份 + 「抵達日 / 雙點日」標籤）
 * - 右 1fr：日期（紅銅）+ 主標 + 摘要 + meta 線形分隔
 *
 * 注意：types.ts 沒有 month / category（抵達日 / 移動日）欄位。
 * 從 date 字串自動推月份（取「2026.12.02」前面的 12 → JUN/DEC）。
 * category 標籤暫無 — 直接從 day_index 推「Day N」、不亂編。
 */

import * as React from 'react'

import { YONGCHENG_COLORS, YONGCHENG_FONTS, YONGCHENG_TEXT_STYLE } from '../tokens'
import type { CanvasDayHeaderBlock } from '../types'

interface CanvasDayHeaderProps {
  data: CanvasDayHeaderBlock['data']
  /**
   * 為什麼可選：仙台 HTML 的「JUN.」是手寫、不是必填。
   * 不傳時嘗試從 data.date 推、推不出來 fallback 空字串。
   */
  monthLabel?: string
  /**
   * 為什麼可選：「抵達日 / 移動日 / 世遺日」這類標籤是業務手工貼、不是必填。
   */
  categoryLabel?: string
}

/**
 * 從 ISO 或「2026.12.02」格式 date 推三字母月份（JUN. / DEC.）
 * 推不出來回空字串、由 caller 用 monthLabel prop 覆寫
 */
function inferMonth(dateStr: string): string {
  const months = [
    'JAN',
    'FEB',
    'MAR',
    'APR',
    'MAY',
    'JUN',
    'JUL',
    'AUG',
    'SEP',
    'OCT',
    'NOV',
    'DEC',
  ]
  // 試「2026.12.02」/「2026-12-02」格式
  const m = dateStr.match(/^\d{4}[.\-/](\d{1,2})/)
  if (m && m[1]) {
    const idx = parseInt(m[1], 10) - 1
    if (idx >= 0 && idx < 12) {
      return `${months[idx]}.`
    }
  }
  return ''
}

export function CanvasDayHeader({ data, monthLabel, categoryLabel }: CanvasDayHeaderProps) {
  const pad = (n: number) => String(n).padStart(2, '0')
  const month = monthLabel ?? inferMonth(data.date)

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '130px 1fr',
        gap: 48,
        marginBottom: 32,
      }}
    >
      {/* 左：DAY 編號 tag */}
      <div
        style={{
          fontFamily: YONGCHENG_FONTS.cormorant,
          fontSize: 16,
          color: YONGCHENG_COLORS.copper,
          letterSpacing: '0.1em',
          paddingTop: 6,
        }}
      >
        <span
          style={{
            display: 'block',
            fontFamily: YONGCHENG_FONTS.cormorant,
            fontSize: 56,
            lineHeight: 1,
            color: YONGCHENG_COLORS.copper,
            fontWeight: 400,
            marginBottom: 8,
            letterSpacing: '-0.02em',
          }}
        >
          {pad(data.day_index)}
        </span>
        {month}
        {month && categoryLabel ? <br /> : null}
        {categoryLabel}
      </div>

      {/* 右：日期 + 標題 + 摘要 */}
      <div>
        <h3
          style={{
            ...YONGCHENG_TEXT_STYLE,
            fontFamily: YONGCHENG_FONTS.serif,
            fontWeight: 500,
            fontSize: 32,
            color: YONGCHENG_COLORS.ink,
            marginBottom: 16,
            lineHeight: 1.35,
          }}
        >
          {data.title}
        </h3>
        {data.summary ? (
          <p
            style={{
              ...YONGCHENG_TEXT_STYLE,
              fontFamily: YONGCHENG_FONTS.serif,
              fontSize: 17,
              color: YONGCHENG_COLORS.ink,
              lineHeight: 1.85,
              marginBottom: 20,
              maxWidth: '30em',
            }}
          >
            {data.summary}
          </p>
        ) : null}
        <div
          style={{
            display: 'flex',
            gap: 24,
            flexWrap: 'wrap',
            paddingTop: 16,
            borderTop: `1px solid ${YONGCHENG_COLORS.rule}`,
            fontFamily: YONGCHENG_FONTS.cormorant,
            fontSize: 13,
            color: YONGCHENG_COLORS.muted,
            letterSpacing: '0.06em',
          }}
        >
          <span>
            DATE{' '}
            <strong
              style={{
                color: YONGCHENG_COLORS.ink,
                fontFamily: YONGCHENG_FONTS.serif,
                fontWeight: 500,
                fontSize: 14,
                marginLeft: 8,
              }}
            >
              {data.date}
            </strong>
          </span>
        </div>
      </div>
    </div>
  )
}
