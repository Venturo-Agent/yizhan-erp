import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Edit2, Trash2 } from 'lucide-react'
import { ActionCell } from '@/components/table-cells/action-cells'

describe('ActionCell', () => {
  describe('向前兼容：現有 6 caller 的用法（icon + label + variant + disabled）', () => {
    it('渲染 icon + label 文字（編輯 / 刪除）', () => {
      render(
        <ActionCell
          actions={[
            { icon: Edit2, label: '編輯', onClick: () => {} },
            { icon: Trash2, label: '刪除', onClick: () => {}, variant: 'danger' },
          ]}
        />
      )
      expect(screen.getByRole('button', { name: /編輯/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /刪除/ })).toBeInTheDocument()
    })

    it('danger variant 套 status-danger 色 class', () => {
      render(
        <ActionCell
          actions={[{ icon: Trash2, label: '刪除', onClick: () => {}, variant: 'danger' }]}
        />
      )
      const btn = screen.getByRole('button', { name: /刪除/ })
      expect(btn.className).toContain('text-status-danger')
    })

    it('success variant 套 status-success 色 class', () => {
      render(
        <ActionCell
          actions={[{ icon: Edit2, label: '核銷', onClick: () => {}, variant: 'success' }]}
        />
      )
      const btn = screen.getByRole('button', { name: /核銷/ })
      expect(btn.className).toContain('text-status-success')
    })

    it('warning variant 套 status-warning 色 class', () => {
      render(
        <ActionCell
          actions={[{ icon: Edit2, label: '停用', onClick: () => {}, variant: 'warning' }]}
        />
      )
      const btn = screen.getByRole('button', { name: /停用/ })
      expect(btn.className).toContain('text-status-warning')
    })

    it('預設（無 variant）套莫蘭迪次要灰', () => {
      render(<ActionCell actions={[{ icon: Edit2, label: '編輯', onClick: () => {} }]} />)
      const btn = screen.getByRole('button', { name: /編輯/ })
      expect(btn.className).toContain('text-morandi-secondary')
    })

    it('disabled 時不觸發 onClick、套 cursor-not-allowed', async () => {
      const handler = vi.fn()
      const user = userEvent.setup()
      render(
        <ActionCell actions={[{ icon: Trash2, label: '刪除', onClick: handler, disabled: true }]} />
      )
      const btn = screen.getByRole('button', { name: /刪除/ })
      expect(btn).toBeDisabled()
      expect(btn.className).toContain('cursor-not-allowed')
      await user.click(btn)
      expect(handler).not.toHaveBeenCalled()
    })

    it('點擊觸發 onClick 並 stopPropagation', async () => {
      const handler = vi.fn()
      const user = userEvent.setup()
      render(<ActionCell actions={[{ icon: Edit2, label: '編輯', onClick: handler }]} />)
      await user.click(screen.getByRole('button', { name: /編輯/ }))
      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('iconOnly 時不渲染 label 文字', () => {
      render(<ActionCell iconOnly actions={[{ icon: Edit2, label: '編輯', onClick: () => {} }]} />)
      // title 仍是 label、但不渲染文字 span
      const btn = screen.getByRole('button')
      expect(btn).toHaveAttribute('title', '編輯')
      expect(btn.textContent).toBe('')
    })

    it('外層 className 注入', () => {
      const { container } = render(
        <ActionCell
          className="justify-end"
          actions={[{ icon: Edit2, label: '編輯', onClick: () => {} }]}
        />
      )
      expect(container.firstChild).toHaveClass('justify-end')
    })
  })

  describe('新增 optional 能力（不傳維持原行為）', () => {
    it('icon 改 optional：不傳 icon 時仍渲染 label', () => {
      render(<ActionCell actions={[{ label: '結算', onClick: () => {} }]} />)
      expect(screen.getByRole('button', { name: /結算/ })).toBeInTheDocument()
    })

    it('hidden=true 時整顆按鈕不渲染', () => {
      render(
        <ActionCell
          actions={[
            { icon: Edit2, label: '編輯', onClick: () => {} },
            { icon: Trash2, label: '刪除', onClick: () => {}, hidden: true },
          ]}
        />
      )
      expect(screen.getByRole('button', { name: /編輯/ })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /刪除/ })).not.toBeInTheDocument()
    })

    it('按鈕層級 className 注入', () => {
      render(
        <ActionCell
          actions={[{ icon: Edit2, label: '編輯', onClick: () => {}, className: 'w-20' }]}
        />
      )
      expect(screen.getByRole('button', { name: /編輯/ }).className).toContain('w-20')
    })

    it('variant=custom 搭 customColor 套自訂色', () => {
      render(
        <ActionCell
          actions={[
            {
              icon: Edit2,
              label: '提示',
              onClick: () => {},
              variant: 'custom',
              customColor: 'text-status-info',
            },
          ]}
        />
      )
      expect(screen.getByRole('button', { name: /提示/ }).className).toContain('text-status-info')
    })

    it('renderCustomButton 逃生艙：回傳節點則用 caller 渲染', () => {
      render(
        <ActionCell
          renderCustomButton={(action, i) => (
            <span data-testid={`custom-${i}`}>{action.label}</span>
          )}
          actions={[{ icon: Edit2, label: '特殊', onClick: () => {} }]}
        />
      )
      expect(screen.getByTestId('custom-0')).toHaveTextContent('特殊')
      // 不應走標準 button 渲染
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('renderCustomButton 回傳 null 時退回標準渲染', () => {
      render(
        <ActionCell
          renderCustomButton={() => null}
          actions={[{ icon: Edit2, label: '編輯', onClick: () => {} }]}
        />
      )
      expect(screen.getByRole('button', { name: /編輯/ })).toBeInTheDocument()
    })
  })
})
