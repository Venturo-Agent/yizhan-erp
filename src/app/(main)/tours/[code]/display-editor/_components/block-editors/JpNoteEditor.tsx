'use client'

/**
 * JP Note block 編輯器
 * 欄位：term / description
 */

import * as React from 'react'
import type { Canvas, CanvasJpNoteBlock } from '@/components/canvas-renderer/types'
import { updateJpNoteBlock } from '../canvas-utils'
import { DeleteButton, FormSection, TextAreaField, TextField } from './_form-primitives'

interface JpNoteEditorProps {
  block: CanvasJpNoteBlock
  canvas: Canvas
  onChange: (next: Canvas) => void
  onRequestDelete: () => void
}

export function JpNoteEditor({ block, canvas, onChange, onRequestDelete }: JpNoteEditorProps) {
  const patch = (p: Partial<CanvasJpNoteBlock['data']>) => {
    onChange(updateJpNoteBlock(canvas, block.id, p))
  }
  return (
    <>
      <FormSection title="日文注解（JP Note）">
        <TextField
          label="用語（term）"
          value={block.data.term}
          onChange={v => patch({ term: v })}
          placeholder="例：湯波（ゆば）"
        />
        <TextAreaField
          label="說明"
          value={block.data.description}
          onChange={v => patch({ description: v })}
          rows={4}
        />
      </FormSection>
      <div style={{ padding: 18 }}>
        <DeleteButton onClick={onRequestDelete} />
      </div>
    </>
  )
}
