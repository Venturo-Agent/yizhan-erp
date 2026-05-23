/**
 * Canvas封面 — Cover
 *
 * 視覺基準：/Users/william/Downloads/tokyo-sendai-private-2026.html (line 785-816)
 *
 * 三段式排版（grid-template-rows: auto 1fr auto）：
 * - 上：品牌名（左、Cormorant + 中文）+ meta 日期（右、Cormorant uppercase）
 * - 中：eyebrow（紅銅斜體）+ title（80px、accent 部分變紅銅）+ subtitle
 * - 下：cover-to（包團規格）+ cover-from（業務署名）
 */

import * as React from 'react'

import { YONGCHENG_COLORS, YONGCHENG_FONTS, YONGCHENG_TEXT_STYLE } from '../tokens'
import { renderAccentTitle } from '../_utils'
import type { CanvasBrandInfo, CanvasCoverData } from '../types'

interface CanvasCoverProps {
  data: CanvasCoverData
  /**
   * 為什麼可選：data.brand 不一定有、fallback 用 canvas.brand
   */
  brand?: CanvasBrandInfo
}

// 註：renderAccentTitle 已抽到 ../_utils.tsx、Cover / Sidenav 共用同一支
// 5/17 William 抓到「Sidenav 沒解析 accent 標記」bug、原因就是這個 function
// 之前散在 Cover 裡、其他 caller 不知道有這個邏輯、所以照搬會漏

export function CanvasCover({ data, brand }: CanvasCoverProps) {
  const effectiveBrand = data.brand ?? brand
  const brandName = effectiveBrand?.name
  const brandEnglish = effectiveBrand?.english_name

  return (
    <section
      id="cover"
      style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateRows: 'auto 1fr auto',
        padding: '48px 0 64px',
      }}
    >
      {/* 上方：品牌 + meta */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderBottom: `1px solid ${YONGCHENG_COLORS.ink}`,
          paddingBottom: 20,
        }}
      >
        <div
          style={{
            // 校對：仙台 HTML .cover-brand font-family: 'Cormorant Garamond', 'Noto Serif TC', serif（line 164）
            // 西文字優先 Cormorant、找不到才 fallback 中文 serif
            // 之前用 `${cormorant}, ${serif}` 展開後是 'Cormorant', serif, 'Noto Serif TC', serif — 順序錯
            fontFamily: "'Cormorant Garamond', 'Noto Serif TC', serif",
            fontSize: 22,
            fontWeight: 500,
            letterSpacing: '0.03em',
          }}
        >
          {brandName ? (
            <span style={{ fontFamily: YONGCHENG_FONTS.serif, marginRight: 10, fontWeight: 500 }}>
              {brandName}
            </span>
          ) : null}
          {brandEnglish}
        </div>
        <div
          style={{
            textAlign: 'right',
            fontFamily: YONGCHENG_FONTS.cormorant,
            fontSize: 12,
            color: YONGCHENG_COLORS.muted,
            letterSpacing: '0.08em',
            lineHeight: 1.6,
          }}
        >
          PRIVATE TOUR
          {data.departure_date ? (
            <>
              <br />
              {data.departure_date}
            </>
          ) : null}
          {data.destination ? (
            <>
              <br />
              {data.destination}
            </>
          ) : null}
        </div>
      </div>

      {/* 中間：eyebrow + title + subtitle */}
      <div style={{ alignSelf: 'center', padding: '64px 0' }}>
        {data.eyebrow ? (
          <div
            style={{
              fontFamily: YONGCHENG_FONTS.cormorant,
              fontStyle: 'italic',
              fontSize: 16,
              color: YONGCHENG_COLORS.copper,
              letterSpacing: '0.1em',
              marginBottom: 20,
            }}
          >
            — {data.eyebrow}
          </div>
        ) : null}
        <h1
          style={{
            ...YONGCHENG_TEXT_STYLE,
            fontFamily: YONGCHENG_FONTS.serif,
            fontWeight: 500,
            fontSize: 80,
            lineHeight: 1.2,
            color: YONGCHENG_COLORS.ink,
            letterSpacing: '-0.005em',
            marginBottom: 32,
            maxWidth: '14em',
          }}
        >
          {renderAccentTitle(data.title)}
        </h1>
        {data.subtitle ? (
          <p
            style={{
              ...YONGCHENG_TEXT_STYLE,
              fontFamily: YONGCHENG_FONTS.serif,
              fontWeight: 300,
              fontSize: 28,
              color: YONGCHENG_COLORS.ink,
              lineHeight: 1.6,
              maxWidth: '22em',
            }}
          >
            {renderAccentTitle(data.subtitle)}
          </p>
        ) : null}
      </div>

      {/* 下方：cover-to + cover-from */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          borderTop: `1px solid ${YONGCHENG_COLORS.ink}`,
          paddingTop: 20,
        }}
      >
        <div
          style={{
            fontFamily: YONGCHENG_FONTS.serif,
            fontSize: 14,
            color: YONGCHENG_COLORS.ink,
            lineHeight: 1.7,
          }}
        >
          {/*
            校對：仙台 HTML .cover-to small 是設計語言一部分（line 220-227）、不該依 destination 才顯示
            就算 destination 沒填、「TO」label 還是要在、表達「這份提案是給誰看」的位置佔位
          */}
          <small
            style={{
              display: 'block',
              fontFamily: YONGCHENG_FONTS.cormorant,
              fontSize: 11,
              color: YONGCHENG_COLORS.copper,
              letterSpacing: '0.18em',
              marginBottom: 4,
              textTransform: 'uppercase',
            }}
          >
            {data.destination ? 'Destination' : 'To'}
          </small>
          {data.destination}
        </div>
        <div
          style={{
            textAlign: 'right',
            fontFamily: YONGCHENG_FONTS.cormorant,
            fontStyle: 'italic',
            fontSize: 12,
            color: YONGCHENG_COLORS.muted,
            letterSpacing: '0.1em',
            lineHeight: 1.7,
          }}
        >
          {brandEnglish ?? null}
          {brandEnglish && brandName ? <br /> : null}
          {brandName ?? null}
        </div>
      </div>
    </section>
  )
}
