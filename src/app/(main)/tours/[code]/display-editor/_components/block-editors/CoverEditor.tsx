'use client'

/**
 * Cover section 編輯器
 * 欄位：eyebrow / title / subtitle
 */

import * as React from 'react'
import type {
  Canvas,
  CanvasCoverData,
} from '@/components/canvas-renderer/types'
import { updateCoverData } from '../canvas-utils'
import { FormSection, TextAreaField, TextField } from './_form-primitives'

interface CoverEditorProps {
  data: CanvasCoverData
  canvas: Canvas
  onChange: (next: Canvas) => void
}

export function CoverEditor({ data, canvas, onChange }: CoverEditorProps) {
  const patch = (p: Partial<CanvasCoverData>) => {
    onChange(updateCoverData(canvas, p))
  }
  return (
    <FormSection title="封面">
      <TextField
        label="Eyebrow（上標）"
        value={data.eyebrow ?? ''}
        onChange={(v) => patch({ eyebrow: v })}
        placeholder="例：2026 私人包團・東京仙台六日"
      />
      <TextField
        label="主標題"
        value={data.title}
        onChange={(v) => patch({ title: v })}
      />
      <TextAreaField
        label="副標題"
        value={data.subtitle ?? ''}
        onChange={(v) => patch({ subtitle: v })}
        rows={2}
      />
    </FormSection>
  )
}
