import * as React from 'react'
import { cn } from '@/lib/utils'

type CISStatus = 'ok' | 'warn' | 'err' | 'info' | 'neutral'

export interface CISItem {
  label: string
  value: string
  status?: CISStatus
}

function statusStyles(status: CISStatus | undefined) {
  switch (status) {
    case 'ok':
      return {
        dot: 'bg-[var(--status-success)]',
        text: 'text-[var(--status-success)]',
        bg: 'bg-[var(--status-success-bg)]',
        border: 'border-[color:color-mix(in_srgb,var(--status-success)_25%,transparent)]',
      }
    case 'warn':
      return {
        dot: 'bg-[var(--status-warning)]',
        text: 'text-[var(--status-warning)]',
        bg: 'bg-[var(--status-warning-bg)]',
        border: 'border-[color:color-mix(in_srgb,var(--status-warning)_25%,transparent)]',
      }
    case 'err':
      return {
        dot: 'bg-[var(--status-danger)]',
        text: 'text-[var(--status-danger)]',
        bg: 'bg-[var(--status-danger-bg)]',
        border: 'border-[color:color-mix(in_srgb,var(--status-danger)_25%,transparent)]',
      }
    case 'info':
      return {
        dot: 'bg-[var(--status-info)]',
        text: 'text-[var(--status-info)]',
        bg: 'bg-[var(--status-info-bg)]',
        border: 'border-[color:color-mix(in_srgb,var(--status-info)_25%,transparent)]',
      }
    default:
      return {
        dot: 'bg-border',
        text: 'text-morandi-secondary',
        bg: 'bg-accent',
        border: 'border-border',
      }
  }
}

export function CISBar({
  title = 'CIS',
  subtitle,
  items,
  className,
}: {
  title?: string
  subtitle?: string
  items: CISItem[]
  className?: string
}) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-border bg-card/70 backdrop-blur-md shadow-md',
        'px-4 py-3 flex items-center gap-3',
        className
      )}
    >
      <div className="shrink-0 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-morandi-container/60 border border-border flex items-center justify-center">
          <span className="font-semibold text-sm tracking-wide text-morandi-primary">{title}</span>
        </div>
        {subtitle && (
          <div className="hidden md:flex flex-col leading-tight">
            <div className="text-sm font-semibold text-morandi-primary">{subtitle}</div>
            <div className="text-xs text-morandi-secondary font-medium">CONTROL · INFORMATION · STATUS</div>
          </div>
        )}
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2 flex-wrap justify-end">
        {items.map(item => {
          const s = statusStyles(item.status)
          return (
            <div
              key={`${item.label}-${item.value}`}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-3 h-9',
                'font-mono text-[0.78rem] tracking-[0.08em] uppercase',
                s.bg,
                s.border
              )}
            >
              <span className={cn('w-2 h-2 rounded-full', s.dot)} />
              <span className="text-morandi-secondary">{item.label}</span>
              <span className={cn('font-semibold', s.text)}>{item.value}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
