import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from '@/components/ui/badge'

describe('Badge Component', () => {
  describe('Rendering', () => {
    it('should render badge with text', () => {
      render(<Badge>New</Badge>)
      expect(screen.getByText('New')).toBeInTheDocument()
    })

    it('should render as a div element', () => {
      render(<Badge>Hello</Badge>)
      const badge = screen.getByText('Hello')
      expect(badge.tagName).toBe('DIV')
    })

    it('should always include base classes', () => {
      render(<Badge>Base</Badge>)
      const badge = screen.getByText('Base')
      expect(badge).toHaveClass('inline-flex')
      expect(badge).toHaveClass('rounded-full')
      expect(badge).toHaveClass('text-xs')
      expect(badge).toHaveClass('font-semibold')
    })
  })

  describe('Variants', () => {
    it('should apply default variant class', () => {
      render(<Badge>Default</Badge>)
      const badge = screen.getByText('Default')
      expect(badge).toHaveClass('bg-morandi-primary')
      expect(badge).toHaveClass('text-white')
    })

    it('should apply secondary variant class', () => {
      render(<Badge variant="secondary">Secondary</Badge>)
      const badge = screen.getByText('Secondary')
      expect(badge).toHaveClass('bg-morandi-container')
      expect(badge).toHaveClass('text-morandi-primary')
    })

    it('should apply destructive variant class', () => {
      render(<Badge variant="destructive">Destructive</Badge>)
      const badge = screen.getByText('Destructive')
      expect(badge).toHaveClass('bg-morandi-red')
      expect(badge).toHaveClass('text-white')
    })

    it('should apply outline variant class', () => {
      render(<Badge variant="outline">Outline</Badge>)
      const badge = screen.getByText('Outline')
      expect(badge).toHaveClass('border-morandi-container')
      expect(badge).toHaveClass('text-morandi-primary')
    })
  })

  describe('Custom Props', () => {
    it('should accept custom className alongside variant classes', () => {
      render(<Badge className="custom-class">Custom</Badge>)
      const badge = screen.getByText('Custom')
      expect(badge).toHaveClass('custom-class')
      // variant default class should still apply
      expect(badge).toHaveClass('bg-morandi-primary')
    })

    it('should pass through HTML attributes', () => {
      render(
        <Badge id="my-badge" aria-label="status badge">
          A
        </Badge>
      )
      const badge = screen.getByText('A')
      expect(badge).toHaveAttribute('id', 'my-badge')
      expect(badge).toHaveAttribute('aria-label', 'status badge')
    })
  })
})
