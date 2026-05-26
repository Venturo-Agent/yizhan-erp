'use client'

/**
 * 右側結構化編輯 panel（width 360px、sticky）
 *
 * 為什麼走 panel 不走 inline contenteditable：
 * - inline 改的是 DOM、不會回寫 canvas JSON（雙向綁定要寫一堆 contentEditable + selection 處理）
 * - panel 改的是 state、儲存乾淨、Renderer 拿 state 重畫、複雜度可控
 * - 業務改 5 個段落、跑 5 次 panel 比「框框內塗改」更可預期
 *
 * panel 結構：
 *   ┌─────────────────────┐
 *   │ sections 樹狀清單   │  ← 上半、列 sections + day section 內 blocks
 *   ├─────────────────────┤
 *   │ 選取項目的編輯表單  │  ← 下半、依 selection.kind 切換 block editor
 *   └─────────────────────┘
 */

import * as React from 'react'
import type {
  Canvas,
  CanvasDayBlock,
  CanvasDaySection,
  CanvasSection,
} from '@/components/canvas-renderer/types'
import type { SelectionKey } from './canvas-utils'
import { CoverEditor } from './block-editors/CoverEditor'
import { DayHeaderEditor } from './block-editors/DayHeaderEditor'
import { JpNoteEditor } from './block-editors/JpNoteEditor'
import { ReadOnlyBlockEditor } from './block-editors/ReadOnlyBlockEditor'
import { RouteCardEditor } from './block-editors/RouteCardEditor'
import { SpotlightEditor } from './block-editors/SpotlightEditor'

interface EditorPanelProps {
  canvas: Canvas
  selection: SelectionKey | null
  onSelect: (key: SelectionKey | null) => void
  onChange: (next: Canvas) => void
  onRequestDeleteBlock: (blockId: string) => void
}

// ============ 樹狀清單 ============

function blockLabel(block: CanvasDayBlock): string {
  switch (block.type) {
    case 'day_header':
      return `日標 · ${block.data.title || '（無標題）'}`
    case 'route_card':
      return `景點卡（${block.layout}）· ${block.data.attractions.length} 個景點`
    case 'sequence_steps':
      return `時序步驟 · ${block.data.steps.length} 步`
    case 'hotel_card':
      return `住宿 · ${block.data.name || '（無名稱）'}`
    case 'flight_card':
      return `航班 · ${block.data.from_city || ''} → ${block.data.to_city || ''}`
    case 'restaurant_card':
      return `餐廳 · ${block.data.name || '（無名稱）'}`
    case 'spotlight':
      return `特色介紹 · ${block.data.title || '（無標題）'}`
    case 'jp_note':
      return `日文注解 · ${block.data.term || '（無用語）'}`
    case 'feature_hero':
      return `Hero · ${block.data.title || '（無標題）'}`
    case 'stall_grid':
      return `小卡格 · ${block.data.items.length} 項`
    default: {
      const _exhaustive: never = block
      return _exhaustive
    }
  }
}

function sectionLabel(section: CanvasSection): string {
  switch (section.type) {
    case 'cover':
      return '封面'
    case 'overview_timeline':
      return '行程總覽'
    case 'day':
      return `Day ${section.day_index} · ${section.date}`
    case 'stays':
      return '住宿總覽'
    case 'appendix':
      return '附錄'
    default: {
      const _exhaustive: never = section
      return _exhaustive
    }
  }
}

function isSelected(selection: SelectionKey | null, k: SelectionKey): boolean {
  if (!selection) return false
  if (selection.kind !== k.kind) return false
  if (selection.kind === 'day' && k.kind === 'day') return selection.dayIndex === k.dayIndex
  if (selection.kind === 'block' && k.kind === 'block') return selection.blockId === k.blockId
  return true
}

interface TreeProps {
  canvas: Canvas
  selection: SelectionKey | null
  onSelect: (key: SelectionKey) => void
}

function SectionTree({ canvas, selection, onSelect }: TreeProps) {
  return (
    <div style={{ padding: '12px 16px', fontSize: 13 }}>
      <div
        style={{
          fontSize: 11,
          letterSpacing: '0.1em',
          color: 'var(--morandi-secondary)',
          textTransform: 'uppercase',
          marginBottom: 8,
        }}
      >
        SECTIONS
      </div>
      {canvas.sections.map((section, idx) => {
        const key: SelectionKey =
          section.type === 'day'
            ? { kind: 'day', dayIndex: section.day_index }
            : section.type === 'cover'
              ? { kind: 'cover' }
              : section.type === 'overview_timeline'
                ? { kind: 'overview' }
                : section.type === 'stays'
                  ? { kind: 'stays' }
                  : { kind: 'appendix' }
        const sel = isSelected(selection, key)
        return (
          <div key={`sec-${idx}`} style={{ marginBottom: 6 }}>
            <button
              type="button"
              onClick={() => onSelect(key)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '6px 10px',
                borderRadius: 4,
                border: sel ? '1px solid var(--morandi-gold)' : '1px solid transparent',
                background: sel ? 'var(--morandi-gold-light)' : 'transparent',
                color: 'var(--morandi-primary)',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {sectionLabel(section)}
            </button>
            {section.type === 'day' ? renderDayBlocks(section, selection, onSelect) : null}
          </div>
        )
      })}
    </div>
  )
}

function renderDayBlocks(
  section: CanvasDaySection,
  selection: SelectionKey | null,
  onSelect: (key: SelectionKey) => void
) {
  return (
    <div style={{ paddingLeft: 14, marginTop: 4 }}>
      {section.blocks.map(b => {
        const k: SelectionKey = { kind: 'block', blockId: b.id }
        const sel = isSelected(selection, k)
        return (
          <button
            key={b.id}
            type="button"
            onClick={() => onSelect(k)}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '4px 10px',
              borderRadius: 4,
              border: sel ? '1px solid var(--morandi-gold)' : '1px solid transparent',
              background: sel ? 'var(--morandi-gold-light)' : 'transparent',
              color: 'var(--morandi-secondary)',
              cursor: 'pointer',
              fontSize: 12,
              marginBottom: 2,
            }}
          >
            {blockLabel(b)}
          </button>
        )
      })}
    </div>
  )
}

// ============ Form 區（依 selection 切換） ============

function EditorForm({
  canvas,
  selection,
  onChange,
  onRequestDeleteBlock,
}: {
  canvas: Canvas
  selection: SelectionKey
  onChange: (next: Canvas) => void
  onRequestDeleteBlock: (blockId: string) => void
}) {
  if (selection.kind === 'cover') {
    const cover = canvas.sections.find(s => s.type === 'cover')
    if (!cover || cover.type !== 'cover') {
      return <EmptyHint text="找不到封面 section" />
    }
    return <CoverEditor data={cover.data} canvas={canvas} onChange={onChange} />
  }

  if (selection.kind === 'block') {
    for (const s of canvas.sections) {
      if (s.type !== 'day') continue
      const b = s.blocks.find(x => x.id === selection.blockId)
      if (!b) continue
      switch (b.type) {
        case 'day_header':
          return (
            <DayHeaderEditor
              block={b}
              canvas={canvas}
              onChange={onChange}
              onRequestDelete={() => onRequestDeleteBlock(b.id)}
            />
          )
        case 'route_card':
          return (
            <RouteCardEditor
              block={b}
              canvas={canvas}
              onChange={onChange}
              onRequestDelete={() => onRequestDeleteBlock(b.id)}
            />
          )
        case 'spotlight':
          return (
            <SpotlightEditor
              block={b}
              canvas={canvas}
              onChange={onChange}
              onRequestDelete={() => onRequestDeleteBlock(b.id)}
            />
          )
        case 'jp_note':
          return (
            <JpNoteEditor
              block={b}
              canvas={canvas}
              onChange={onChange}
              onRequestDelete={() => onRequestDeleteBlock(b.id)}
            />
          )
        default:
          return (
            <ReadOnlyBlockEditor
              blockType={b.type}
              onRequestDelete={() => onRequestDeleteBlock(b.id)}
            />
          )
      }
    }
    return <EmptyHint text="找不到該 block（可能已被刪除）" />
  }

  // overview / stays / appendix / day section 本體 — 這版不開編輯
  return (
    <EmptyHint
      text={
        selection.kind === 'day'
          ? `Day ${selection.dayIndex} 的整體設定暫不開放編輯。請點選 Day 內的個別 block。`
          : '此 section 暫不支援編輯（之後版本會補）。'
      }
    />
  )
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div
      style={{
        padding: '24px 16px',
        fontSize: 13,
        color: 'var(--morandi-secondary)',
        lineHeight: 1.7,
      }}
    >
      {text}
    </div>
  )
}

// ============ Panel 本體 ============

export function EditorPanel({
  canvas,
  selection,
  onSelect,
  onChange,
  onRequestDeleteBlock,
}: EditorPanelProps) {
  return (
    <aside
      style={{
        width: 360,
        flexShrink: 0,
        height: 'calc(100vh - 56px)',
        position: 'sticky',
        top: 56,
        background: 'var(--card, #ffffff)',
        borderLeft: '1px solid var(--border, #e8e5e0)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          flexBasis: '40%',
          overflowY: 'auto',
          borderBottom: '1px solid var(--border, #e8e5e0)',
        }}
      >
        <SectionTree canvas={canvas} selection={selection} onSelect={onSelect} />
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {selection ? (
          <EditorForm
            canvas={canvas}
            selection={selection}
            onChange={onChange}
            onRequestDeleteBlock={onRequestDeleteBlock}
          />
        ) : (
          <EmptyHint text="從上方選一個 section / block 開始編輯。" />
        )}
      </div>
    </aside>
  )
}
