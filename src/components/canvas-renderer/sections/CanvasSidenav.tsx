/**
 * Canvas左側導航 — Sidenav
 *
 * 視覺基準：/Users/william/Downloads/tokyo-sendai-private-2026.html (line 749-779)
 *
 * 結構：
 * - 品牌名（Cormorant Garamond eyebrow）
 * - 標題 + 副標
 * - 三段 nav：序 / 行程 / 附錄
 *   - 「行程」自動從 canvas.sections 找 day section 列出
 *   - 「序」放 overview_timeline、「附錄」放 stays + appendix
 * - 底部業務 / 公司資訊
 */

import * as React from 'react'

import { YONGCHENG_COLORS, YONGCHENG_FONTS } from '../tokens'
import { renderAccentTitle } from '../_utils'
import type { Canvas, CanvasDaySection } from '../types'

interface CanvasSidenavProps {
  canvas: Canvas
}

interface NavItem {
  num: string
  label: string
  href: string
}

/**
 * 為什麼把 nav 分三組：對齊規格書 § 4.2「序 / 行程 / 附錄」三段式
 * 自動從 canvas.sections 推 nav、不要 caller 重覆寫一份
 */
function buildNav(canvas: Canvas): {
  prelude: NavItem[]
  itinerary: NavItem[]
  appendix: NavItem[]
} {
  const prelude: NavItem[] = []
  const itinerary: NavItem[] = []
  const appendix: NavItem[] = []

  let counter = 1
  const pad = (n: number) => String(n).padStart(2, '0')

  canvas.sections.forEach((section) => {
    if (section.type === 'overview_timeline') {
      prelude.push({ num: pad(counter++), label: '六天總覽', href: '#overview' })
    } else if (section.type === 'day') {
      const day = section as CanvasDaySection
      // 從 day_header block 撈標題、撈不到就 fallback「Day N」
      const headerBlock = day.blocks.find((b) => b.type === 'day_header')
      const dayTitle =
        headerBlock && headerBlock.type === 'day_header' ? headerBlock.data.title : `Day ${day.day_index}`
      itinerary.push({
        num: pad(counter++),
        label: `Day ${day.day_index}｜${dayTitle}`,
        href: `#day${day.day_index}`,
      })
    } else if (section.type === 'stays') {
      appendix.push({ num: pad(counter++), label: '住宿一覽', href: '#stays' })
    } else if (section.type === 'appendix') {
      appendix.push({ num: pad(counter++), label: '附錄資訊', href: '#appendix' })
    }
  })

  return { prelude, itinerary, appendix }
}

const renderList = (items: NavItem[]) => (
  <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
    {items.map((item) => (
      <li key={item.href} style={{ marginBottom: 1 }}>
        {/*
          校對：仙台 HTML .sidenav li a 有 transition: all 0.18s + :hover border-left-color: copper（line 122-126）
          inline style 沒法寫 :hover、所以用 className 配對 CanvasLayout 注入的 <style> block
          className 命名「yc-」前綴避免跟既有 ERP 樣式撞名
        */}
        <a
          href={item.href}
          className="yc-nav-item"
          style={{
            display: 'flex',
            alignItems: 'baseline',
            padding: '8px 0 8px 14px',
            fontFamily: YONGCHENG_FONTS.serif,
            fontSize: 14,
            color: YONGCHENG_COLORS.ink,
            textDecoration: 'none',
            borderLeft: '2px solid transparent',
            lineHeight: 1.4,
            transition: 'all 0.18s',
          }}
        >
          <span
            style={{
              fontFamily: YONGCHENG_FONTS.cormorant,
              fontSize: 12,
              color: YONGCHENG_COLORS.copper,
              marginRight: 12,
              fontWeight: 500,
              minWidth: 22,
            }}
          >
            {item.num}
          </span>
          {item.label}
        </a>
      </li>
    ))}
  </ol>
)

const sectionHeadingStyle: React.CSSProperties = {
  fontFamily: YONGCHENG_FONTS.cormorant,
  fontSize: 11,
  letterSpacing: '0.18em',
  color: YONGCHENG_COLORS.copper,
  textTransform: 'uppercase',
  margin: '24px 0 8px 0',
  paddingBottom: 6,
  borderBottom: `1px dashed ${YONGCHENG_COLORS.rule}`,
}

export function CanvasSidenav({ canvas }: CanvasSidenavProps) {
  const { prelude, itinerary, appendix } = buildNav(canvas)
  const brand = canvas.brand
  // 取封面 section 的 destination / departure_date 當副標、否則 brand english_name
  const coverSection = canvas.sections.find((s) => s.type === 'cover')
  const cover = coverSection && coverSection.type === 'cover' ? coverSection.data : null

  return (
    <aside
      style={{
        position: 'sticky',
        top: 0,
        alignSelf: 'start',
        height: '100vh',
        overflowY: 'auto',
        padding: '36px 24px 36px 32px',
        borderRight: `1px solid ${YONGCHENG_COLORS.rule}`,
      }}
    >
      <div
        style={{
          fontFamily: YONGCHENG_FONTS.cormorant,
          fontSize: 12,
          letterSpacing: '0.2em',
          color: YONGCHENG_COLORS.copper,
          marginBottom: 8,
          textTransform: 'uppercase',
          fontWeight: 500,
        }}
      >
        {brand?.english_name ?? 'Private Tour'}
      </div>
      <div
        style={{
          fontFamily: YONGCHENG_FONTS.serif,
          fontSize: 18,
          fontWeight: 600,
          color: YONGCHENG_COLORS.ink,
          marginBottom: 6,
          lineHeight: 1.4,
        }}
      >
        {/*
          5/17 William 抓 bug：以前 Sidenav 直接吐 cover.title 字串、
          標題裡的 [accent]xxx[/accent] 標記沒解析、客人看到原文。
          現在跟 Cover 用同一支 renderAccentTitle、保證所有 caller 一致。
        */}
        {cover?.title ? renderAccentTitle(cover.title) : brand?.name ?? '展示行程'}
      </div>
      {/*
        校對：仙台 HTML .sidenav-subtitle 設 12px / Noto Sans / line-height 1.6（line 98-104）
        本來吃 cover.subtitle、但 subtitle 是 28px hero 用、含 [accent] 標記、塞進 12px 小框會擠
        改吃 destination + departure_date 推副標、若都無才 fallback cover.subtitle
      */}
      {(() => {
        const subParts: string[] = []
        if (cover?.destination) subParts.push(cover.destination)
        if (cover?.departure_date) subParts.push(cover.departure_date)
        const subText = subParts.length > 0 ? subParts.join(' · ') : cover?.subtitle
        if (!subText) return null
        return (
          <div
            style={{
              fontSize: 12,
              color: YONGCHENG_COLORS.muted,
              marginBottom: 32,
              letterSpacing: '0.02em',
              fontFamily: YONGCHENG_FONTS.sans,
              lineHeight: 1.6,
            }}
          >
            {subText}
          </div>
        )
      })()}

      {prelude.length > 0 ? (
        <>
          <div style={sectionHeadingStyle}>序</div>
          {renderList(prelude)}
        </>
      ) : null}

      {itinerary.length > 0 ? (
        <>
          <div style={sectionHeadingStyle}>行程</div>
          {renderList(itinerary)}
        </>
      ) : null}

      {appendix.length > 0 ? (
        <>
          <div style={sectionHeadingStyle}>附錄</div>
          {renderList(appendix)}
        </>
      ) : null}

      <div
        style={{
          marginTop: 40,
          paddingTop: 24,
          borderTop: `1px solid ${YONGCHENG_COLORS.rule}`,
          fontSize: 11,
          lineHeight: 1.7,
          color: YONGCHENG_COLORS.muted,
          letterSpacing: '0.03em',
          fontFamily: YONGCHENG_FONTS.sans,
        }}
      >
        {brand?.name ?? null}
        {brand?.name ? <br /> : null}
        {cover?.eyebrow ?? null}
      </div>
    </aside>
  )
}
