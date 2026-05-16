'use client'

import { Input } from '@/components/ui/input'

const CELL = 'border-b border-r border-border'
const CELL_LAST = 'border-b border-border'
const CELL_NO_B = 'border-r border-border'
const CELL_LAST_NO_B = ''

const REMARKS_PLACEHOLDER = '輸入備註...'

// ============================================
// 備註行（PS）
// 只在 day.note !== undefined 時顯示
// ============================================

interface DayRowNoteProps {
  note: string
  idx: number
  isTableBottom: boolean
  updateDaySchedule: (index: number, field: string, value: string | boolean | undefined) => void
}

export function DayRowNote({ note, idx, isTableBottom, updateDaySchedule }: DayRowNoteProps) {
  const leftCls = isTableBottom ? CELL_NO_B : CELL
  const rightCls = isTableBottom ? CELL_LAST_NO_B : CELL_LAST

  return (
    <tr className={idx % 2 === 1 ? 'bg-muted/5' : ''}>
      <td
        className={`px-2 py-0 ${leftCls} align-middle text-[0.588rem] text-morandi-gold font-medium`}
      >
        PS
      </td>
      <td colSpan={5} className={`px-0 py-0 ${rightCls} align-middle`}>
        <Input
          value={note || ''}
          onChange={e => updateDaySchedule(idx, 'note', e.target.value)}
          placeholder={REMARKS_PLACEHOLDER}
          className="h-7 text-sm border-0 shadow-none focus-visible:ring-0 rounded-none px-2 bg-transparent text-muted-foreground placeholder:text-muted-foreground/70"
        />
      </td>
    </tr>
  )
}
