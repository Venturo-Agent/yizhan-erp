'use client'

/**
 * Route Card block 編輯器
 *
 * 每個 attraction 提供：name / description / suggested_duration
 * （type / category / image 之後版本再開）
 */

import * as React from 'react'
import { Star } from 'lucide-react'
import type { Canvas, CanvasRouteCardBlock } from '@/components/canvas-renderer/types'
import { promoteAttractionToSpotlight, updateRouteCardAttraction } from '../canvas-utils'
import { DeleteButton, FormSection, TextAreaField, TextField } from './_form-primitives'

// 「升級為亮點」按鈕（走 morandi-gold、不用 Tailwind 預設色）
function PromoteButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="把這個景點升級成獨享一頁寬的特色亮點（spotlight）"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        width: '100%',
        justifyContent: 'center',
        padding: '7px 12px',
        marginTop: 4,
        borderRadius: 4,
        border: '1px solid var(--morandi-gold)',
        background: 'var(--morandi-gold-light)',
        color: 'var(--morandi-gold-hover)',
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: '0.03em',
      }}
    >
      <Star size={13} />
      升級為亮點
    </button>
  )
}

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
              onChange={v =>
                onChange(updateRouteCardAttraction(canvas, block.id, attr.id, { name: v }))
              }
            />
            <TextAreaField
              label="描述"
              value={attr.description ?? ''}
              onChange={v =>
                onChange(updateRouteCardAttraction(canvas, block.id, attr.id, { description: v }))
              }
              rows={3}
            />
            <TextField
              label="建議停留時間"
              value={attr.suggested_duration ?? ''}
              onChange={v =>
                onChange(
                  updateRouteCardAttraction(canvas, block.id, attr.id, {
                    suggested_duration: v,
                  })
                )
              }
              placeholder="例：建議停留 2 小時"
            />
            <PromoteButton
              onClick={() => onChange(promoteAttractionToSpotlight(canvas, block.id, attr.id))}
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
