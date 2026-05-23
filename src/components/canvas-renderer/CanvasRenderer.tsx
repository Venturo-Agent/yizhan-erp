/**
 * Canvas整份 Canvas 渲染入口 — CanvasRenderer
 *
 * 視覺基準：仙台 HTML 整份結構
 *
 * 邏輯：
 * - 遍歷 canvas.sections、根據 type 渲染對應組件
 * - day section 內遍歷 blocks、依 block.type 渲染
 * - 整份包進 CanvasLayout（Sidenav + Main）
 *
 * 跨期 / 跨 section 自動標號（eyebrow 用、像 02 / 03 / 04 ...）
 */

import * as React from 'react'

import { YONGCHENG_COLORS, YONGCHENG_FONTS, YONGCHENG_TEXT_STYLE } from './tokens'
import type {
  Canvas,
  CanvasDayBlock,
  CanvasDaySection,
  CanvasSection,
} from './types'
import { CanvasLayout } from './CanvasLayout'
import { CanvasAppendix } from './sections/CanvasAppendix'
import { CanvasCover } from './sections/CanvasCover'
import { CanvasDayHeader } from './sections/CanvasDayHeader'
import { CanvasFlightCard } from './sections/CanvasFlightCard'
import { CanvasHotelCard } from './sections/CanvasHotelCard'
import { CanvasJpNote } from './sections/CanvasJpNote'
import { CanvasOverviewTimeline } from './sections/CanvasOverviewTimeline'
import { CanvasRestaurantCard } from './sections/CanvasRestaurantCard'
import { CanvasRouteCard } from './sections/CanvasRouteCard'
import { CanvasSequenceSteps } from './sections/CanvasSequenceSteps'
import { CanvasSpotlight } from './sections/CanvasSpotlight'
import { CanvasStaysSection } from './sections/CanvasStaysSection'

interface CanvasRendererProps {
  canvas: Canvas
}

// ============ Day section block 分流 ============

function renderDayBlock(block: CanvasDayBlock): React.ReactNode {
  switch (block.type) {
    case 'day_header':
      return <CanvasDayHeader key={block.id} data={block.data} />
    case 'route_card':
      return <CanvasRouteCard key={block.id} block={block} />
    case 'sequence_steps':
      return <CanvasSequenceSteps key={block.id} block={block} />
    case 'hotel_card':
      return <CanvasHotelCard key={block.id} block={block} />
    case 'flight_card':
      return <CanvasFlightCard key={block.id} block={block} />
    case 'restaurant_card':
      return <CanvasRestaurantCard key={block.id} block={block} />
    case 'spotlight':
      // 兩欄式特色介紹（仙台原版的 ritual-spotlight）— 餐廳 / 飯店 / 景點深度版型
      return <CanvasSpotlight key={block.id} block={block} />
    case 'jp_note':
      // 日文用語小注解（湯波、界、懐石 ...）
      return <CanvasJpNote key={block.id} block={block} />
    case 'feature_hero':
      // 視覺：滿版背景圖 + eyebrow + title + subtitle（仙台 HTML 沒這 block、暫時 minimal 渲染）
      return (
        <div
          key={block.id}
          style={{
            marginTop: 36,
            padding: '64px 48px',
            position: 'relative',
            background: block.data.background_image?.url
              ? `url('${block.data.background_image.url}') center / cover no-repeat`
              : YONGCHENG_COLORS.paper,
            color: block.data.background_image?.url ? '#fff' : YONGCHENG_COLORS.ink,
          }}
        >
          {block.data.eyebrow ? (
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
              — {block.data.eyebrow}
            </div>
          ) : null}
          <h3
            style={{
              ...YONGCHENG_TEXT_STYLE,
              fontFamily: YONGCHENG_FONTS.serif,
              fontWeight: 500,
              fontSize: 36,
              lineHeight: 1.35,
              marginBottom: 14,
            }}
          >
            {block.data.title}
          </h3>
          {block.data.subtitle ? (
            <p
              style={{
                ...YONGCHENG_TEXT_STYLE,
                fontFamily: YONGCHENG_FONTS.serif,
                fontSize: 17,
                lineHeight: 1.85,
              }}
            >
              {block.data.subtitle}
            </p>
          ) : null}
        </div>
      )
    case 'stall_grid': {
      const cols = Math.min(Math.max(block.data.items.length, 1), 3)
      return (
        <div
          key={block.id}
          style={{
            marginTop: 32,
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: 20,
          }}
        >
          {block.data.items.map((item) => (
            <div
              key={item.id}
              style={{
                background: YONGCHENG_COLORS.white,
                border: `1px solid ${YONGCHENG_COLORS.rule}`,
                padding: 18,
              }}
            >
              <h6
                style={{
                  ...YONGCHENG_TEXT_STYLE,
                  fontFamily: YONGCHENG_FONTS.serif,
                  fontWeight: 500,
                  fontSize: 15,
                  color: YONGCHENG_COLORS.ink,
                  marginBottom: 6,
                }}
              >
                {item.name}
              </h6>
              {item.description ? (
                <p
                  style={{
                    ...YONGCHENG_TEXT_STYLE,
                    fontFamily: YONGCHENG_FONTS.sans,
                    fontSize: 12,
                    color: YONGCHENG_COLORS.muted,
                    lineHeight: 1.7,
                  }}
                >
                  {item.description}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )
    }
    default: {
      // 為什麼用 satisfies never：強制 union exhaustive、未來 types.ts 加新 block.type、這裡會被 ts 紅線提醒
      const _exhaustive: never = block
      return _exhaustive
    }
  }
}

// ============ Day section 整段 ============

function renderDaySection(section: CanvasDaySection, eyebrowNum: string, isBleed: boolean) {
  // day section 內第一個 block 通常是 day_header、跟 section eyebrow 並列
  return (
    <section
      key={`day-${section.day_index}`}
      id={`day${section.day_index}`}
      style={{
        padding: isBleed ? '96px 64px' : '96px 0',
        margin: isBleed ? '0 -64px' : 0,
        background: isBleed ? YONGCHENG_COLORS.paper : 'transparent',
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
          {eyebrowNum}
        </span>
        DAY {section.day_index} · {section.date}
      </div>
      {section.blocks.map((b) => renderDayBlock(b))}
    </section>
  )
}

// ============ 主 Renderer ============

function renderSection(
  section: CanvasSection,
  eyebrowNum: string,
  isBleed: boolean,
  brand: Canvas['brand']
): React.ReactNode {
  switch (section.type) {
    case 'cover':
      return <CanvasCover key="cover" data={section.data} brand={brand} />
    case 'overview_timeline':
      return (
        <CanvasOverviewTimeline
          key="overview"
          days={section.data.days}
          eyebrow={eyebrowNum}
        />
      )
    case 'day':
      return renderDaySection(section, eyebrowNum, isBleed)
    case 'stays':
      return <CanvasStaysSection key="stays" section={section} eyebrow={eyebrowNum} />
    case 'appendix':
      return <CanvasAppendix key="appendix" section={section} brand={brand} />
    default: {
      const _exhaustive: never = section
      return _exhaustive
    }
  }
}

export function CanvasRenderer({ canvas }: CanvasRendererProps) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    <CanvasLayout canvas={canvas}>
      {canvas.sections.map((section, idx) => {
        // eyebrow 編號：cover 不計、從 overview 開始 01、day1 是 02 ...
        // 為什麼這樣編：對齊仙台 HTML（line 820/861/898...）
        const eyebrowNum = section.type === 'cover' ? '00' : pad(idx)
        // 雙數 day section 用 paper 底色（仙台 HTML day2 / day4 / day6 都 bleed-paper）
        // 為什麼：視覺節奏交錯、避免一路白底太單調
        const isBleed = section.type === 'day' && section.day_index % 2 === 0
        return renderSection(section, eyebrowNum, isBleed, canvas.brand)
      })}
    </CanvasLayout>
  )
}
