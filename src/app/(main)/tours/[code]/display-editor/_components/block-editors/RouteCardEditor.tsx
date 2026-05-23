'use client'

/**
 * Route Card block 編輯器
 *
 * 每個 attraction 提供：name / description / suggested_duration
 * （type / category / image 之後版本再開）
 */

import * as React from 'react'
import type {
  Canvas,
  CanvasRouteCardBlock,
} from '@/components/canvas-renderer/types'
import { updateRouteCardAttraction } from '../canvas-utils'
import { DeleteButton, FormSection, TextAreaField, TextField } from './_form-primitives'

interface RouteCardEditorProps {
  block: CanvasRouteCardBlock
  canvas: Canvas
  onChange: (next: Canvas) => void
  onRequestDelete: () => void
}

export function RouteCardEditor({
  block,
  canvas,
  onChange,
  onRequestDelete,
}: RouteCardEditorProps) {
  return (
    <>
      <div
        style={{
          padding: '16px 18px',
          fontSize: 11,
          color: 'var(--morandi-secondary)',
          letterSpacing: '0.05em',
          borderBottom: '1px solid var(--morandi-container)',
        }}
      >
        景點卡（{block.layout}） · {block.data.attractions.length} 個景點
      </div>

      {block.data.attractions.length === 0 ? (
        <div style={{ padding: 18, fontSize: 13, color: 'var(--morandi-secondary)' }}>
          此卡目前沒有景點。
        </div>
      ) : (
        block.data.attractions.map((attr, idx) => (
          <FormSection key={attr.id} title={`景點 ${idx + 1}`}>
            <TextField
              label="名稱"
              value={attr.name}
              onChange={(v) =>
                onChange(updateRouteCardAttraction(canvas, block.id, attr.id, { name: v }))
              }
            />
            <TextAreaField
              label="描述"
              value={attr.description ?? ''}
              onChange={(v) =>
                onChange(
                  updateRouteCardAttraction(canvas, block.id, attr.id, { description: v })
                )
              }
              rows={3}
            />
            <TextField
              label="建議停留時間"
              value={attr.suggested_duration ?? ''}
              onChange={(v) =>
                onChange(
                  updateRouteCardAttraction(canvas, block.id, attr.id, {
                    suggested_duration: v,
                  })
                )
              }
              placeholder="例：建議停留 2 小時"
            />
          </FormSection>
        ))
      )}

      <div style={{ padding: 18 }}>
        <DeleteButton onClick={onRequestDelete} />
      </div>
    </>
  )
}
