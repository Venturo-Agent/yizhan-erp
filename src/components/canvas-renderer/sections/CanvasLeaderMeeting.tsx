/**
 * Canvas領隊・集合資訊 — Leader & Meeting（行前資訊群）
 *
 * 視覺基準：附錄（CanvasAppendix）同款行前資訊質感 — 紅銅 Cormorant uppercase 小標 + 條列
 * 規格書 § 三 工單 2 / § 一 D3：領隊 + 集合獨立 section、收在 stays 之後 appendix 之前
 *
 * 結構：
 * - 2 欄 grid（領隊 / 集合）
 * - 領隊塊：姓名（+ 英文暱稱）+ 國內 / 海外電話、空的欄位不顯示
 * - 集合塊：時間 + 地點
 *
 * 排印規範（規格書 § 五）：分隔符「・」貼緊無空格；句末不收句號。
 * 設計守則：克制的行前資訊感、非賣點 showcase。
 */

import * as React from 'react'

import { YONGCHENG_COLORS, YONGCHENG_FONTS, YONGCHENG_TEXT_STYLE } from '../tokens'
import type { CanvasLeaderMeetingSection } from '../types'

interface CanvasLeaderMeetingProps {
  section: CanvasLeaderMeetingSection
}

// 一個資訊欄（紅銅小標 + 內容行）
function InfoCol({ heading, children }: { heading: string; children: React.ReactNode }) {
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
      {children}
    </div>
  )
}

// 一行「標籤・值」（標籤紅銅、值深栗）；值空白不渲染整行
function InfoLine({ label, value }: { label: string; value?: string }) {
  const v = value?.trim()
  if (!v) return null
  return (
    <p
      style={{
        ...YONGCHENG_TEXT_STYLE,
        fontFamily: YONGCHENG_FONTS.sans,
        fontSize: 13,
        color: YONGCHENG_COLORS.ink,
        lineHeight: 1.85,
        marginBottom: 4,
      }}
    >
      <span style={{ color: YONGCHENG_COLORS.muted }}>{label}・</span>
      {v}
    </p>
  )
}

export function CanvasLeaderMeeting({ section }: CanvasLeaderMeetingProps) {
  const leader = section.data.leader
  const meeting = section.data.meeting

  // 各塊有沒有實質內容（任一欄非空白才渲染該塊）
  const hasLeader = Boolean(
    leader?.name?.trim() ||
    leader?.english_name?.trim() ||
    leader?.domestic_phone?.trim() ||
    leader?.overseas_phone?.trim()
  )
  const hasMeeting = Boolean(meeting?.time?.trim() || meeting?.location?.trim())

  // 兩塊都空白 → 不渲染（優雅降級、不開天窗）
  // 生成器已保證有料才生此 section、這裡是雙保險
  if (!hasLeader && !hasMeeting) return null

  // 領隊姓名（中文 + 英文暱稱合併、英文用括號）
  const leaderName = (() => {
    const cn = leader?.name?.trim()
    const en = leader?.english_name?.trim()
    if (cn && en) return `${cn}（${en}）`
    return cn || en || undefined
  })()

  return (
    <section
      id="leader-meeting"
      style={{
        padding: '64px 0',
        borderTop: `1px solid ${YONGCHENG_COLORS.rule}`,
        marginTop: 64,
      }}
    >
      <div
        style={{
          fontFamily: YONGCHENG_FONTS.cormorant,
          fontStyle: 'italic',
          fontSize: 13,
          color: YONGCHENG_COLORS.copper,
          letterSpacing: '0.18em',
          marginBottom: 28,
          textTransform: 'uppercase',
        }}
      >
        — 行前資訊
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: hasLeader && hasMeeting ? '1fr 1fr' : '1fr',
          gap: 48,
          alignItems: 'start',
        }}
      >
        {hasLeader ? (
          <InfoCol heading="領隊資訊">
            <InfoLine label="領隊" value={leaderName} />
            <InfoLine label="國內電話" value={leader?.domestic_phone} />
            <InfoLine label="海外電話" value={leader?.overseas_phone} />
          </InfoCol>
        ) : null}
        {hasMeeting ? (
          <InfoCol heading="集合資訊">
            <InfoLine label="集合時間" value={meeting?.time} />
            <InfoLine label="集合地點" value={meeting?.location} />
          </InfoCol>
        ) : null}
      </div>
    </section>
  )
}
