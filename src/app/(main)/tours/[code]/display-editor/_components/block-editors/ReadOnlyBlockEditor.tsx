'use client'

/**
 * 不支援編輯的 block fallback
 *
 * 出現時機：sequence_steps / hotel_card / flight_card / restaurant_card /
 * feature_hero / stall_grid — 這版只開最常用的 5 種 block 編輯（cover / day_header /
 * route_card / spotlight / jp_note）、其他先顯示「暫不支援編輯」+ 刪除按鈕。
 */

import * as React from 'react'
import { DeleteButton } from './_form-primitives'

interface ReadOnlyBlockEditorProps {
  blockType: string
  onRequestDelete: () => void
}

export function ReadOnlyBlockEditor({ blockType, onRequestDelete }: ReadOnlyBlockEditorProps) {
  return (
    <div style={{ padding: 18 }}>
      <div
        style={{
          padding: 12,
          background: 'var(--morandi-container)',
          borderRadius: 4,
          fontSize: 13,
          color: 'var(--morandi-secondary)',
          lineHeight: 1.7,
          marginBottom: 16,
        }}
      >
        此 block 類型（<strong>{blockType}</strong>）暫不支援編輯、僅可刪除。
        <br />
        之後版本會補上對應的編輯欄位。
      </div>
      <DeleteButton onClick={onRequestDelete} />
    </div>
  )
}
