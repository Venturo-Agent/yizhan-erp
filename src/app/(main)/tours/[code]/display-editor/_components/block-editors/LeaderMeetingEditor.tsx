'use client'

/**
 * 領隊・集合資訊 section 編輯器
 * 欄位：領隊（姓名 / 英文暱稱 / 國內電話 / 海外電話）+ 集合（時間 / 地點）
 *
 * 對應 canvas types CanvasLeaderMeetingSection.data（leader / meeting 兩個子物件）。
 * 排印規範：欄位提示文字句末不收句號。
 */

import * as React from 'react'
import type { Canvas, CanvasLeaderMeetingSection } from '@/components/canvas-renderer/types'
import { updateLeaderMeetingSection } from '../canvas-utils'
import { FormSection, TextField } from './_form-primitives'

interface LeaderMeetingEditorProps {
  section: CanvasLeaderMeetingSection
  canvas: Canvas
  onChange: (next: Canvas) => void
}

export function LeaderMeetingEditor({ section, canvas, onChange }: LeaderMeetingEditorProps) {
  const leader = section.data.leader
  const meeting = section.data.meeting

  const patchLeader = (p: Partial<NonNullable<CanvasLeaderMeetingSection['data']['leader']>>) => {
    onChange(updateLeaderMeetingSection(canvas, { leader: p }))
  }
  const patchMeeting = (p: Partial<NonNullable<CanvasLeaderMeetingSection['data']['meeting']>>) => {
    onChange(updateLeaderMeetingSection(canvas, { meeting: p }))
  }

  return (
    <>
      <FormSection title="領隊資訊">
        <TextField
          label="領隊姓名"
          value={leader?.name ?? ''}
          onChange={v => patchLeader({ name: v })}
          placeholder="例：林小姐"
        />
        <TextField
          label="英文暱稱"
          value={leader?.english_name ?? ''}
          onChange={v => patchLeader({ english_name: v })}
          placeholder="例：Lily（選填）"
        />
        <TextField
          label="國內電話"
          value={leader?.domestic_phone ?? ''}
          onChange={v => patchLeader({ domestic_phone: v })}
          placeholder="例：0912-345-678"
        />
        <TextField
          label="海外電話"
          value={leader?.overseas_phone ?? ''}
          onChange={v => patchLeader({ overseas_phone: v })}
          placeholder="例：+81-90-1234-5678"
        />
      </FormSection>
      <FormSection title="集合資訊">
        <TextField
          label="集合時間"
          value={meeting?.time ?? ''}
          onChange={v => patchMeeting({ time: v })}
          placeholder="例：12/02 早上 08:30"
        />
        <TextField
          label="集合地點"
          value={meeting?.location ?? ''}
          onChange={v => patchMeeting({ location: v })}
          placeholder="例：桃園機場第二航廈 5 號報到櫃檯"
        />
      </FormSection>
    </>
  )
}
