'use client'

/**
 * Flight Card block 編輯器（William 2026-05-27 追加）
 *
 * 為什麼做：flight_card 原本走 ReadOnlyBlockEditor（只能看不能改）。
 * 業務要「航班資料可填寫・可修改」、給它一個完整表單。
 *
 * 欄位（對齊 CanvasFlightCardBlock['data']）：
 *   出發：from_city / from_airport / from_time
 *   抵達：to_city / to_airport / to_time
 *   航班：airline / flight_no
 *
 * 注意：目前生成器（canvas-from-tour.ts）不自動產 flight_card、行程資料也沒接航班料
 * → 此卡走「業務手動加 + 手動填」、編輯器把欄位填滿即達 William 最低要求
 */

import * as React from 'react'
import type { Canvas, CanvasFlightCardBlock } from '@/components/canvas-renderer/types'
import { updateFlightCardBlock } from '../canvas-utils'
import { DeleteButton, FormSection, TextField } from './_form-primitives'

interface FlightCardEditorProps {
  block: CanvasFlightCardBlock
  canvas: Canvas
  onChange: (next: Canvas) => void
  onRequestDelete: () => void
}

export function FlightCardEditor({
  block,
  canvas,
  onChange,
  onRequestDelete,
}: FlightCardEditorProps) {
  const patch = (p: Partial<CanvasFlightCardBlock['data']>) => {
    onChange(updateFlightCardBlock(canvas, block.id, p))
  }
  return (
    <>
      <FormSection title="出發">
        <TextField
          label="出發城市"
          value={block.data.from_city}
          onChange={v => patch({ from_city: v })}
          placeholder="例：台北"
        />
        <TextField
          label="出發機場"
          value={block.data.from_airport ?? ''}
          onChange={v => patch({ from_airport: v })}
          placeholder="例：TPE 桃園"
        />
        <TextField
          label="起飛時間"
          value={block.data.from_time ?? ''}
          onChange={v => patch({ from_time: v })}
          placeholder="例：09:25"
        />
      </FormSection>

      <FormSection title="抵達">
        <TextField
          label="抵達城市"
          value={block.data.to_city}
          onChange={v => patch({ to_city: v })}
          placeholder="例：東京"
        />
        <TextField
          label="抵達機場"
          value={block.data.to_airport ?? ''}
          onChange={v => patch({ to_airport: v })}
          placeholder="例：NRT 成田"
        />
        <TextField
          label="抵達時間"
          value={block.data.to_time ?? ''}
          onChange={v => patch({ to_time: v })}
          placeholder="例：13:40"
        />
      </FormSection>

      <FormSection title="航班">
        <TextField
          label="航空公司"
          value={block.data.airline ?? ''}
          onChange={v => patch({ airline: v })}
          placeholder="例：長榮航空"
        />
        <TextField
          label="航班編號"
          value={block.data.flight_no ?? ''}
          onChange={v => patch({ flight_no: v })}
          placeholder="例：BR198"
        />
      </FormSection>

      <div style={{ padding: 18 }}>
        <DeleteButton onClick={onRequestDelete} />
      </div>
    </>
  )
}
