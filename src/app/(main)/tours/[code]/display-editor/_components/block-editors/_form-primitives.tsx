'use client'

/**
 * 表單原件（panel 內共用）
 *
 * 為什麼自己包：
 * - 全站 Input / Textarea 是 shadcn 變體、size / spacing 跟 panel 不協調
 * - panel 內欄位密集、用窄一點的 spacing、跟全站表單視覺脫鉤
 */

import * as React from 'react'

const LABEL_STYLE: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: '0.05em',
  color: 'var(--morandi-secondary)',
  marginBottom: 4,
  textTransform: 'uppercase',
}

const FIELD_BASE: React.CSSProperties = {
  width: '100%',
  padding: '6px 10px',
  borderRadius: 4,
  border: '1px solid var(--morandi-container)',
  background: 'var(--background, #ffffff)',
  color: 'var(--morandi-primary)',
  fontSize: 13,
  fontFamily: 'inherit',
  lineHeight: 1.5,
}

interface BaseFieldProps {
  label: string
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
}: BaseFieldProps & {
  value: string
  onChange: (next: string) => void
  placeholder?: string
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={LABEL_STYLE}>{label}</label>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        style={FIELD_BASE}
      />
    </div>
  )
}

export function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}: BaseFieldProps & {
  value: string
  onChange: (next: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={LABEL_STYLE}>{label}</label>
      <textarea
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        style={{ ...FIELD_BASE, resize: 'vertical', fontFamily: 'inherit' }}
      />
    </div>
  )
}

export function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--morandi-container)' }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.1em',
          color: 'var(--morandi-primary)',
          marginBottom: 12,
          textTransform: 'uppercase',
        }}
      >
        {title}
      </div>
      {children}
    </div>
  )
}

export function DeleteButton({
  onClick,
  loading = false,
}: {
  onClick: () => void
  loading?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      style={{
        width: '100%',
        padding: '8px 12px',
        borderRadius: 4,
        border: '1px solid var(--morandi-red)',
        background: 'transparent',
        color: 'var(--morandi-red)',
        cursor: loading ? 'not-allowed' : 'pointer',
        fontSize: 13,
        opacity: loading ? 0.5 : 1,
      }}
    >
      {loading ? '處理中⋯' : '刪除此 block'}
    </button>
  )
}
