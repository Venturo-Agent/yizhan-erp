'use client'

/**
 * Spotlight block 編輯器
 * 欄位：tag（eyebrow）/ title / lead（多行）
 */

import * as React from 'react'
import type {
  YongchengCanvas,
  YongchengSpotlightBlock,
} from '@/components/tour-display-yongcheng/types'
import { updateSpotlightBlock } from '../canvas-utils'
import { DeleteButton, FormSection, TextAreaField, TextField } from './_form-primitives'

interface SpotlightEditorProps {
  block: YongchengSpotlightBlock
  canvas: YongchengCanvas
  onChange: (next: YongchengCanvas) => void
  onRequestDelete: () => void
}

export function SpotlightEditor({
  block,
  canvas,
  onChange,
  onRequestDelete,
}: SpotlightEditorProps) {
  const patch = (p: Partial<YongchengSpotlightBlock['data']>) => {
    onChange(updateSpotlightBlock(canvas, block.id, p))
  }
  return (
    <>
      <FormSection title="特色介紹（Spotlight）">
        <TextField
          label="Tag（眉標）"
          value={block.data.tag ?? ''}
          onChange={(v) => patch({ tag: v })}
          placeholder="例：— LUNCH · 元祖日光ゆば料理"
        />
        <TextField
          label="標題"
          value={block.data.title}
          onChange={(v) => patch({ title: v })}
        />
        <TextAreaField
          label="段落（Lead）"
          value={block.data.lead ?? ''}
          onChange={(v) => patch({ lead: v })}
          rows={6}
          placeholder="多行用 Enter 換行"
        />
      </FormSection>
      <div style={{ padding: 18 }}>
        <DeleteButton onClick={onRequestDelete} />
      </div>
    </>
  )
}
