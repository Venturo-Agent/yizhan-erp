'use client'

/**
 * 編輯器頂部工具列（sticky）
 *
 * 視覺：
 * - 深栗底 #2D1F18、白字、高度 56px
 * - 左：返回 + tour code + 標題
 * - 中：儲存狀態指示
 * - 右：預覽 / 切換發布狀態 / 發布
 *
 * 為什麼用 inline style 而不是 Tailwind：
 * - #2D1F18 / #C85A38 是Canvas主題色、不在 morandi-* token 內
 * - 業務語意上「這條 toolbar 屬於Canvas編輯器」、跟整個 morandi 主題不掛勾
 * - 跟 CanvasRenderer 視覺呼應、業務一眼看出「我正在編Canvas」
 */

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Eye, Sparkles } from 'lucide-react'
import type { SaveStatus } from '../_hooks/useCanvasEditor'

// Canvas主題色（不放 morandi token、屬於 canvas 主題範圍）
const TOOLBAR_BG = '#2D1F18'
const PUBLISH_BG = '#C85A38'

interface EditorToolbarProps {
  code: string
  saveStatus: SaveStatus
  published: boolean
  // 發布 / 取消發布 / 預覽 各自的 loading（防連點）
  publishLoading: boolean
  unpublishLoading: boolean
  onPublish: () => void
  onUnpublish: () => void
  onAiAssist: () => void
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  const map: Record<SaveStatus, { text: string; color: string; dot: string }> = {
    saved: { text: '已儲存 ✓', color: '#A8D5A2', dot: '#A8D5A2' },
    pending: { text: '未儲存 ●', color: '#E8C57A', dot: '#E8C57A' },
    saving: { text: '儲存中⋯', color: '#E8C57A', dot: '#E8C57A' },
    error: { text: '儲存失敗 ●', color: '#E89A8C', dot: '#E89A8C' },
  }
  const cur = map[status]
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 13,
        color: cur.color,
        letterSpacing: '0.05em',
      }}
    >
      <span
        style={{
          display: 'inline-block',
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: cur.dot,
        }}
      />
      {cur.text}
    </div>
  )
}

export function EditorToolbar({
  code,
  saveStatus,
  published,
  publishLoading,
  unpublishLoading,
  onPublish,
  onUnpublish,
  onAiAssist,
}: EditorToolbarProps) {
  const router = useRouter()

  const handleBack = () => {
    router.push(`/tours/${encodeURIComponent(code)}?tab=display-itinerary`)
  }

  const handlePreview = () => {
    window.open(`/p/tour/${encodeURIComponent(code)}/canvas`, '_blank')
  }

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        height: 56,
        background: TOOLBAR_BG,
        color: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 20,
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      }}
    >
      {/* 左：返回 + 標題 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
        <button
          type="button"
          onClick={handleBack}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.25)',
            color: '#FFFFFF',
            padding: '6px 12px',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          <ArrowLeft size={14} />
          返回
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
          <span style={{ fontSize: 11, opacity: 0.6, letterSpacing: '0.1em' }}>
            {code}
          </span>
          <span style={{ fontSize: 14, fontWeight: 500 }}>展示行程編輯器</span>
        </div>
      </div>

      {/* 中：儲存狀態 */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <SaveIndicator status={saveStatus} />
      </div>

      {/* 右：動作按鈕 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          type="button"
          onClick={onAiAssist}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(200,90,56,0.15)',
            border: `1px solid ${PUBLISH_BG}`,
            color: PUBLISH_BG,
            padding: '7px 14px',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          <Sparkles size={14} />
          AI 助理
        </button>

        <button
          type="button"
          onClick={handlePreview}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.25)',
            color: '#FFFFFF',
            padding: '7px 14px',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          <Eye size={14} />
          預覽
        </button>

        {published ? (
          <button
            type="button"
            onClick={onUnpublish}
            disabled={unpublishLoading}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.4)',
              color: '#FFFFFF',
              padding: '7px 14px',
              borderRadius: 6,
              cursor: unpublishLoading ? 'not-allowed' : 'pointer',
              fontSize: 13,
              opacity: unpublishLoading ? 0.5 : 1,
            }}
          >
            {unpublishLoading ? '處理中⋯' : '取消發布'}
          </button>
        ) : null}

        <button
          type="button"
          onClick={onPublish}
          disabled={publishLoading}
          style={{
            background: PUBLISH_BG,
            border: '1px solid transparent',
            color: '#FFFFFF',
            padding: '7px 16px',
            borderRadius: 6,
            cursor: publishLoading ? 'not-allowed' : 'pointer',
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: '0.05em',
            opacity: publishLoading ? 0.6 : 1,
          }}
        >
          {publishLoading ? '發布中⋯' : published ? '重新發布' : '發布'}
        </button>
      </div>
    </div>
  )
}
