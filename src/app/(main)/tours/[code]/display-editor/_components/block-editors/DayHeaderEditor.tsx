'use client'

/**
 * Day Header block 編輯器
 * 欄位：title / summary / date
 */

import * as React from 'react'
import type {
  Canvas,
  CanvasDayHeaderBlock,
} from '@/components/canvas-renderer/types'
import { updateDayHeaderBlock } from '../canvas-utils'
import { DeleteButton, FormSection, TextAreaField, TextField } from './_form-primitives'

interface DayHeaderEditorProps {
  block: CanvasDayHeaderBlock
  canvas: Canvas
  onChange: (next: Canvas) => void
  onRequestDelete: () => void
}

export function DayHeaderEditor({
  block,
  canvas,
  onChange,
  onRequestDelete,
}: DayHeaderEditorProps) {
  const patch = (p: Partial<CanvasDayHeaderBlock['data']>) => {
    onChange(updateDayHeaderBlock(canvas, block.id, p))
  }
  return (
    <>
      <FormSection title={`Day ${block.data.day_index} · 日標`}>
        <TextField
          label="日期顯示"
          value={block.data.date}
          onChange={(v) => patch({ date: v })}
          placeholder="例：2026.12.02（星期三）"
        />
        <TextField
          label="標題"
          value={block.data.title}
          onChange={(v) => patch({ title: v })}
        />
        <TextAreaField
          label="一句摘要"
          value={block.data.summary ?? ''}
          onChange={(v) => patch({ summary: v })}
          rows={2}
        />
      </FormSection>
      <div style={{ padding: 18 }}>
        <DeleteButton onClick={onRequestDelete} />
      </div>
    </>
  )
}
