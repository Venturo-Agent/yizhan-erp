import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Skeleton } from '@/components/ui/skeleton'

describe('Skeleton Component', () => {
  it('should render a div element', () => {
    const { container } = render(<Skeleton data-testid="skeleton" />)
    const el = container.querySelector('[data-testid="skeleton"]')
    expect(el).toBeInTheDocument()
    expect(el?.tagName).toBe('DIV')
  })

  it('should have default animate-pulse and rounded classes', () => {
    const { container } = render(<Skeleton data-testid="skeleton" />)
    const el = container.querySelector('[data-testid="skeleton"]') as HTMLElement
    expect(el).toHaveClass('animate-pulse')
    expect(el).toHaveClass('rounded-md')
  })

  it('should have default morandi-container background class', () => {
    const { container } = render(<Skeleton data-testid="skeleton" />)
    const el = container.querySelector('[data-testid="skeleton"]') as HTMLElement
    expect(el.className).toMatch(/bg-morandi-container/)
  })

  it('should accept custom className', () => {
    const { container } = render(
      <Skeleton data-testid="skeleton" className="h-20 w-full custom-class" />
    )
    const el = container.querySelector('[data-testid="skeleton"]') as HTMLElement
    expect(el).toHaveClass('custom-class')
    expect(el).toHaveClass('h-20')
    expect(el).toHaveClass('w-full')
    // default classes should still be present
    expect(el).toHaveClass('animate-pulse')
  })

  it('should pass through arbitrary HTML attributes', () => {
    const { container } = render(
      <Skeleton data-testid="skeleton" id="my-skeleton" aria-label="Loading" />
    )
    const el = container.querySelector('[data-testid="skeleton"]') as HTMLElement
    expect(el).toHaveAttribute('id', 'my-skeleton')
    expect(el).toHaveAttribute('aria-label', 'Loading')
  })

  it('should render children when provided', () => {
    const { getByText } = render(
      <Skeleton>
        <span>inner</span>
      </Skeleton>
    )
    expect(getByText('inner')).toBeInTheDocument()
  })
})
