import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge } from '@/components/ui/status-badge'

describe('StatusBadge Component', () => {
  describe('Rendering', () => {
    it('should render label text', () => {
      render(<StatusBadge tone="pending" label="待處理" />)
      expect(screen.getByText('待處理')).toBeInTheDocument()
    })

    it('should render as a span element', () => {
      render(<StatusBadge tone="info" label="hello" />)
      const badge = screen.getByText('hello')
      expect(badge.tagName).toBe('SPAN')
    })

    it('should always include base pill classes', () => {
      render(<StatusBadge tone="pending" label="base" />)
      const badge = screen.getByText('base')
      expect(badge).toHaveClass('inline-flex')
      expect(badge).toHaveClass('rounded-full')
      expect(badge).toHaveClass('text-xs')
      expect(badge).toHaveClass('font-medium')
      expect(badge).toHaveClass('whitespace-nowrap')
    })
  })

  describe('Tone variants', () => {
    it('should apply pending tone classes', () => {
      render(<StatusBadge tone="pending" label="x" />)
      const badge = screen.getByText('x')
      expect(badge).toHaveClass('bg-morandi-secondary/15')
      expect(badge).toHaveClass('text-morandi-secondary')
    })

    it('should apply info tone classes', () => {
      render(<StatusBadge tone="info" label="x" />)
      const badge = screen.getByText('x')
      expect(badge).toHaveClass('bg-status-info/15')
      expect(badge).toHaveClass('text-status-info')
    })

    it('should apply success tone classes', () => {
      render(<StatusBadge tone="success" label="x" />)
      const badge = screen.getByText('x')
      expect(badge).toHaveClass('bg-status-success/15')
      expect(badge).toHaveClass('text-status-success')
    })

    it('should apply warning tone classes', () => {
      render(<StatusBadge tone="warning" label="x" />)
      const badge = screen.getByText('x')
      expect(badge).toHaveClass('bg-status-warning/15')
      expect(badge).toHaveClass('text-status-warning')
    })

    it('should apply danger tone classes', () => {
      render(<StatusBadge tone="danger" label="x" />)
      const badge = screen.getByText('x')
      expect(badge).toHaveClass('bg-status-danger/15')
      expect(badge).toHaveClass('text-status-danger')
    })

    it('should apply neutral tone classes', () => {
      render(<StatusBadge tone="neutral" label="x" />)
      const badge = screen.getByText('x')
      expect(badge).toHaveClass('bg-morandi-container')
      expect(badge).toHaveClass('text-morandi-primary')
    })
  })

  describe('Custom className', () => {
    it('should merge custom className with tone classes', () => {
      render(<StatusBadge tone="success" label="x" className="custom-extra" />)
      const badge = screen.getByText('x')
      expect(badge).toHaveClass('custom-extra')
      expect(badge).toHaveClass('bg-status-success/15')
    })
  })

  describe('New API: type + status (lookup STATUS_TONE_MAP / STATUS_LABEL_MAP)', () => {
    it('should resolve order pending → pending tone + 待處理 label', () => {
      render(<StatusBadge type="order" status="pending" />)
      const badge = screen.getByText('待處理')
      expect(badge).toHaveClass('bg-morandi-secondary/15')
    })

    it('should resolve payment_request billed → success tone + 已付款 label (billed 5/15 後歸 paid)', () => {
      render(<StatusBadge type="payment_request" status="billed" />)
      const badge = screen.getByText('已付款')
      expect(badge).toHaveClass('bg-status-success/15')
    })

    it('should resolve disbursement paid → success tone + 已付款 label', () => {
      render(<StatusBadge type="disbursement" status="paid" />)
      const badge = screen.getByText('已付款')
      expect(badge).toHaveClass('bg-status-success/15')
    })

    it('should resolve tour proposal → pending tone + 提案 label (NOT 開團)', () => {
      render(<StatusBadge type="tour" status="proposal" />)
      expect(screen.getByText('提案')).toBeInTheDocument()
    })

    it('should resolve quote proposed → pending tone + 提案 label (NOT 開團)', () => {
      render(<StatusBadge type="quote" status="proposed" />)
      expect(screen.getByText('提案')).toBeInTheDocument()
    })

    it('should resolve receipt 0 (DB string) → pending tone + 待確認 label', () => {
      // 2026-05-21 William 拍板：receipt status 3 套 SSOT 統一為「待確認 / 已確認」、
      // 「待處理」這 label 只給 order / todo / invoice / check 等其他 entity 用
      render(<StatusBadge type="receipt" status="0" />)
      const badge = screen.getByText('待確認')
      expect(badge).toHaveClass('bg-morandi-secondary/15')
    })

    it('should fallback to neutral + raw status string for unknown status', () => {
      render(<StatusBadge type="order" status="weird-status" />)
      const badge = screen.getByText('weird-status')
      expect(badge).toHaveClass('bg-morandi-container')
    })

    it('should allow label override on top of type+status', () => {
      render(<StatusBadge type="voucher" status="reversed" label="已反沖" />)
      expect(screen.getByText('已反沖')).toBeInTheDocument()
    })
  })
})
