import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import * as React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

describe('Card Component', () => {
  describe('Card', () => {
    it('should render with children', () => {
      render(<Card>card body</Card>)
      expect(screen.getByText('card body')).toBeInTheDocument()
    })

    it('should have default base classes', () => {
      render(<Card data-testid="card">x</Card>)
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('rounded-lg')
      expect(card).toHaveClass('bg-card')
      expect(card).toHaveClass('shadow-sm')
    })

    it('should accept custom className', () => {
      render(
        <Card data-testid="card" className="custom-class">
          x
        </Card>
      )
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('custom-class')
      expect(card).toHaveClass('rounded-lg')
    })

    it('should forward ref to div', () => {
      const ref = React.createRef<HTMLDivElement>()
      render(
        <Card ref={ref} data-testid="card">
          x
        </Card>
      )
      expect(ref.current).not.toBeNull()
      expect(ref.current?.tagName).toBe('DIV')
    })

    it('should pass through HTML attributes', () => {
      render(
        <Card data-testid="card" id="my-card" role="region">
          x
        </Card>
      )
      const card = screen.getByTestId('card')
      expect(card).toHaveAttribute('id', 'my-card')
      expect(card).toHaveAttribute('role', 'region')
    })
  })

  describe('CardHeader', () => {
    it('should render with children', () => {
      render(<CardHeader>header</CardHeader>)
      expect(screen.getByText('header')).toBeInTheDocument()
    })

    it('should have default flex layout classes', () => {
      render(<CardHeader data-testid="header">x</CardHeader>)
      const header = screen.getByTestId('header')
      expect(header).toHaveClass('flex')
      expect(header).toHaveClass('flex-col')
      expect(header).toHaveClass('p-6')
    })

    it('should accept custom className', () => {
      render(
        <CardHeader data-testid="header" className="custom-class">
          x
        </CardHeader>
      )
      const header = screen.getByTestId('header')
      expect(header).toHaveClass('custom-class')
      expect(header).toHaveClass('flex')
    })
  })

  describe('CardTitle', () => {
    it('should render with children', () => {
      render(<CardTitle>Title text</CardTitle>)
      expect(screen.getByText('Title text')).toBeInTheDocument()
    })

    it('should have default typography classes', () => {
      render(<CardTitle data-testid="title">x</CardTitle>)
      const title = screen.getByTestId('title')
      expect(title).toHaveClass('text-2xl')
      expect(title).toHaveClass('font-semibold')
      expect(title).toHaveClass('tracking-tight')
    })

    it('should accept custom className', () => {
      render(
        <CardTitle data-testid="title" className="custom-class">
          x
        </CardTitle>
      )
      const title = screen.getByTestId('title')
      expect(title).toHaveClass('custom-class')
      expect(title).toHaveClass('text-2xl')
    })
  })

  describe('CardContent', () => {
    it('should render with children', () => {
      render(<CardContent>content</CardContent>)
      expect(screen.getByText('content')).toBeInTheDocument()
    })

    it('should have default padding classes', () => {
      render(<CardContent data-testid="content">x</CardContent>)
      const content = screen.getByTestId('content')
      expect(content).toHaveClass('p-6')
      expect(content).toHaveClass('pt-0')
    })

    it('should accept custom className', () => {
      render(
        <CardContent data-testid="content" className="custom-class">
          x
        </CardContent>
      )
      const content = screen.getByTestId('content')
      expect(content).toHaveClass('custom-class')
      expect(content).toHaveClass('p-6')
    })
  })

  describe('Composition', () => {
    it('should render full Card composition', () => {
      render(
        <Card data-testid="card">
          <CardHeader>
            <CardTitle>My Title</CardTitle>
          </CardHeader>
          <CardContent>Body content here</CardContent>
        </Card>
      )
      expect(screen.getByTestId('card')).toBeInTheDocument()
      expect(screen.getByText('My Title')).toBeInTheDocument()
      expect(screen.getByText('Body content here')).toBeInTheDocument()
    })
  })
})
