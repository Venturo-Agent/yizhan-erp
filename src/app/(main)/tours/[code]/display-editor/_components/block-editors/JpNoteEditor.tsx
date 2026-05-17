'use client'

/**
 * JP Note block 編輯器
 * 欄位：term / description
 */

import * as React from 'react'
import type {
  YongchengCanvas,
  YongchengJpNoteBlock,
} from '@/components/tour-display-yongcheng/types'
import { updateJpNoteBlock } from '../canvas-utils'
import { DeleteButton, FormSection, TextAreaField, TextField } from './_form-primitives'

interface JpNoteEditorProps {
  block: YongchengJpNoteBlock
  canvas: YongchengCanvas
  onChange: (next: YongchengCanvas) => void
  onRequestDelete: () => void
}

export function JpNoteEditor({
  block,
  canvas,
  onChange,
  onRequestDelete,
}: JpNoteEditorProps) {
  const patch = (p: Partial<YongchengJpNoteBlock['data']>) => {
    onChange(updateJpNoteBlock(canvas, block.id, p))
  }
  return (
    <>
      <FormSection title="日文注解（JP Note）">
        <TextField
          label="用語（term）"
          value={block.data.term}
          onChange={(v) => patch({ term: v })}
          placeholder="例：湯波（ゆば）"
        />
        <TextAreaField
          label="說明"
          value={block.data.description}
          onChange={(v) => patch({ description: v })}
          rows={4}
        />
      </FormSection>
      <div style={{ padding: 18 }}>
        <DeleteButton onClick={onRequestDelete} />
      </div>
    </>
  )
}
