import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StarRating } from '@/components/ui/star-rating'

describe('StarRating Component', () => {
  describe('Rendering', () => {
    it('should render 5 stars by default', () => {
      render(<StarRating value={3} />)
      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(5)
    })

    it('should render custom number of stars when max is set', () => {
      render(<StarRating value={2} max={10} />)
      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(10)
    })

    it('should render buttons of type="button"', () => {
      render(<StarRating value={0} />)
      const buttons = screen.getAllByRole('button')
      buttons.forEach((b) => expect(b).toHaveAttribute('type', 'button'))
    })
  })

  describe('Filled state', () => {
    it('should fill stars up to value', () => {
      const { container } = render(<StarRating value={3} />)
      const svgs = container.querySelectorAll('svg')
      expect(svgs).toHaveLength(5)
      // first 3 filled (have fill-morandi-gold class), last 2 muted
      expect(svgs[0]).toHaveClass('fill-morandi-gold')
      expect(svgs[1]).toHaveClass('fill-morandi-gold')
      expect(svgs[2]).toHaveClass('fill-morandi-gold')
      expect(svgs[3]).toHaveClass('text-morandi-muted')
      expect(svgs[4]).toHaveClass('text-morandi-muted')
    })

    it('should show no filled stars when value is 0', () => {
      const { container } = render(<StarRating value={0} />)
      const svgs = container.querySelectorAll('svg')
      svgs.forEach((svg) => expect(svg).not.toHaveClass('fill-morandi-gold'))
    })

    it('should fill all stars when value equals max', () => {
      const { container } = render(<StarRating value={5} max={5} />)
      const svgs = container.querySelectorAll('svg')
      svgs.forEach((svg) => expect(svg).toHaveClass('fill-morandi-gold'))
    })
  })

  describe('Sizes', () => {
    it('should apply sm size classes', () => {
      const { container } = render(<StarRating value={1} size="sm" />)
      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('w-3')
      expect(svg).toHaveClass('h-3')
    })

    it('should apply md size classes by default', () => {
      const { container } = render(<StarRating value={1} />)
      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('w-4')
      expect(svg).toHaveClass('h-4')
    })

    it('should apply lg size classes', () => {
      const { container } = render(<StarRating value={1} size="lg" />)
      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('w-5')
      expect(svg).toHaveClass('h-5')
    })
  })

  describe('Interaction', () => {
    it('should call onChange with star value when clicked', async () => {
      const user = userEvent.setup()
      const handleChange = vi.fn()
      render(<StarRating value={0} onChange={handleChange} />)
      const buttons = screen.getAllByRole('button')
      await user.click(buttons[2])
      expect(handleChange).toHaveBeenCalledWith(3)
    })

    it('should call onChange with 1 when first star clicked', async () => {
      const user = userEvent.setup()
      const handleChange = vi.fn()
      render(<StarRating value={0} onChange={handleChange} />)
      const buttons = screen.getAllByRole('button')
      await user.click(buttons[0])
      expect(handleChange).toHaveBeenCalledWith(1)
    })

    it('should not call onChange when readonly', async () => {
      const user = userEvent.setup()
      const handleChange = vi.fn()
      render(<StarRating value={0} onChange={handleChange} readonly />)
      const buttons = screen.getAllByRole('button')
      await user.click(buttons[2])
      expect(handleChange).not.toHaveBeenCalled()
    })

    it('should not call onChange when disabled', async () => {
      const user = userEvent.setup()
      const handleChange = vi.fn()
      render(<StarRating value={0} onChange={handleChange} disabled />)
      const buttons = screen.getAllByRole('button')
      await user.click(buttons[2])
      expect(handleChange).not.toHaveBeenCalled()
    })

    it('should disable buttons when readonly', () => {
      render(<StarRating value={3} readonly />)
      const buttons = screen.getAllByRole('button')
      buttons.forEach((b) => expect(b).toBeDisabled())
    })

    it('should disable buttons when disabled', () => {
      render(<StarRating value={3} disabled />)
      const buttons = screen.getAllByRole('button')
      buttons.forEach((b) => expect(b).toBeDisabled())
    })
  })

  describe('Custom className', () => {
    it('should apply custom className to container', () => {
      const { container } = render(<StarRating value={1} className="custom-wrap" />)
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('custom-wrap')
      expect(wrapper).toHaveClass('flex')
      expect(wrapper).toHaveClass('items-center')
    })
  })
})
