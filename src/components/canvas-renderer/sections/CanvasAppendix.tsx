/**
 * Canvas附錄 — Appendix（footer 區）
 *
 * 視覺基準：/Users/william/Downloads/tokyo-sendai-private-2026.html (line 1408-1427)
 * 規格書 § 4.5：包含 / 不含 / 注意 / 聯絡
 *
 * 結構：
 * - 4 欄 grid（包含 / 不含 / 注意 / 聯絡）
 * - 每欄：紅銅 Cormorant uppercase 小標 + 條列
 * - 底部：業務員資訊 + 客戶 logo
 *
 * 注意：types.ts 沒 client logo（CanvasContactInfo 也沒）、用 contact.company_name 替代。
 * logo 欄位由 brand prop 補。
 */

import * as React from 'react'
import Image from 'next/image'

import { YONGCHENG_COLORS, YONGCHENG_FONTS, YONGCHENG_TEXT_STYLE } from '../tokens'
import type { CanvasAppendixSection as AppendixSectionType, CanvasBrandInfo } from '../types'

interface CanvasAppendixProps {
  section: AppendixSectionType
  /**
   * 為什麼吃 brand：types.ts 的 CanvasAppendixSection.data 沒放 logo / brand name。
   * 由 canvas.brand 補底部公司名 / logo。
   */
  brand?: CanvasBrandInfo
}

function ListCol({ heading, items }: { heading: string; items?: string[] }) {
  if (!items || items.length === 0) return null
  return (
    <div>
      <h5
        style={{
          fontFamily: YONGCHENG_FONTS.cormorant,
          fontSize: 11,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: YONGCHENG_COLORS.copper,
          marginBottom: 12,
          fontWeight: 500,
        }}
      >
        — {heading}
      </h5>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {items.map((item, i) => (
          <li
            key={`${heading}-${i}`}
            style={{
              ...YONGCHENG_TEXT_STYLE,
              fontFamily: YONGCHENG_FONTS.sans,
              fontSize: 13,
              color: YONGCHENG_COLORS.ink,
              lineHeight: 1.85,
              paddingLeft: 12,
              position: 'relative',
              marginBottom: 4,
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
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function CanvasAppendix({ section, brand }: CanvasAppendixProps) {
  const { inclusions, exclusions, notices, contact } = section.data

  const contactItems: string[] = []
  if (contact?.employee_name) contactItems.push(contact.employee_name)
  if (contact?.employee_phone) contactItems.push(contact.employee_phone)
  if (contact?.employee_email) contactItems.push(contact.employee_email)
  if (contact?.company_name) contactItems.push(contact.company_name)
  if (contact?.company_phone) contactItems.push(contact.company_phone)

  return (
    <section
      id="appendix"
      style={{
        padding: '64px 0',
        borderTop: `1px solid ${YONGCHENG_COLORS.ink}`,
        marginTop: 80,
      }}
    >
      <div
        style={{
          // 校對：仙台 HTML .footer grid-template-columns: 2fr 1fr 1fr 1fr（line 713）
          // 「費用包含」通常條目最多 / 文字最長、需要 2 倍寬呼吸
          // 之前 repeat(4, 1fr) 等寬會把包含欄擠到斷行頻繁、視覺缺鬆緊節奏
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 1fr',
          gap: 32,
          alignItems: 'start',
        }}
      >
        <ListCol heading="費用包含" items={inclusions} />
        <ListCol heading="費用不含" items={exclusions} />
        <ListCol heading="注意事項" items={notices} />
        <ListCol heading="聯絡業務" items={contactItems} />
      </div>

      {/* 底部：業務 + 公司 logo */}
      <div
        style={{
          marginTop: 48,
          paddingTop: 32,
          borderTop: `1px solid ${YONGCHENG_COLORS.rule}`,
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: 24,
          alignItems: 'center',
        }}
      >
        <div>
          <div
            style={{
              // 校對：仙台 HTML .footer-brand-name font-family: 'Cormorant Garamond', 'Noto Serif TC', serif（line 733）
              // 西文字優先 Cormorant、找不到才 fallback 中文 serif
              fontFamily: "'Cormorant Garamond', 'Noto Serif TC', serif",
              fontSize: 28,
              fontWeight: 500,
              color: YONGCHENG_COLORS.ink,
              marginBottom: 6,
            }}
          >
            {brand?.name ? (
              <span style={{ fontFamily: YONGCHENG_FONTS.serif, marginRight: 10 }}>
                {brand.name}
              </span>
            ) : null}
            {brand?.english_name ?? null}
          </div>
          {contact?.employee_name ? (
            <p
              style={{
                fontFamily: YONGCHENG_FONTS.sans,
                fontSize: 13,
                color: YONGCHENG_COLORS.muted,
                fontStyle: 'italic',
                letterSpacing: '0.02em',
              }}
            >
              {contact.employee_name}
              {contact.employee_phone ? ` · ${contact.employee_phone}` : null}
            </p>
          ) : null}
        </div>
        {brand?.logo_url ? (
          <div
            style={{
              position: 'relative',
              width: 120,
              height: 60,
            }}
          >
            <Image
              src={brand.logo_url}
              alt={brand.name ?? 'logo'}
              fill
              sizes="120px"
              style={{ objectFit: 'contain', objectPosition: 'right center' }}
            />
          </div>
        ) : null}
      </div>
    </section>
  )
}
