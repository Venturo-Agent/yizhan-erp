import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from '@/components/ui/input'

describe('Input Component', () => {
  describe('Rendering', () => {
    it('should render input element', () => {
      render(<Input placeholder="Enter text" />)
      const input = screen.getByPlaceholderText('Enter text')
      expect(input).toBeInTheDocument()
      expect(input.tagName).toBe('INPUT')
    })

    it('should render with placeholder', () => {
      render(<Input placeholder="Username" />)
      expect(screen.getByPlaceholderText('Username')).toBeInTheDocument()
    })

    it('should accept custom className', () => {
      render(<Input data-testid="i" className="custom-class" />)
      expect(screen.getByTestId('i')).toHaveClass('custom-class')
    })

    it('should respect type prop', () => {
      render(<Input data-testid="i" type="email" />)
      expect(screen.getByTestId('i')).toHaveAttribute('type', 'email')
    })
  })

  describe('Controlled value', () => {
    it('should display controlled value', () => {
      render(<Input data-testid="i" value="hello" onChange={() => {}} />)
      expect((screen.getByTestId('i') as HTMLInputElement).value).toBe('hello')
    })

    it('should call onChange when user types', async () => {
      const handleChange = vi.fn()
      const user = userEvent.setup()
      render(<Input data-testid="i" onChange={handleChange} />)
      await user.type(screen.getByTestId('i'), 'a')
      expect(handleChange).toHaveBeenCalled()
    })
  })

  describe('Disabled / ReadOnly', () => {
    it('should render disabled input', () => {
      render(<Input data-testid="i" disabled />)
      expect(screen.getByTestId('i')).toBeDisabled()
    })

    it('should render readonly input', () => {
      render(<Input data-testid="i" readOnly value="readonly value" onChange={() => {}} />)
      const input = screen.getByTestId('i') as HTMLInputElement
      expect(input).toHaveAttribute('readonly')
      expect(input.value).toBe('readonly value')
    })
  })

  describe('Full-width to half-width conversion', () => {
    it('should convert full-width digits to half-width on change', () => {
      const handleChange = vi.fn()
      render(<Input data-testid="i" onChange={handleChange} />)
      const input = screen.getByTestId('i') as HTMLInputElement
      // 全形數字 １２３ → 123
      fireEvent.change(input, { target: { value: '１２３' } })
      expect(handleChange).toHaveBeenCalled()
      const lastCall = handleChange.mock.calls[handleChange.mock.calls.length - 1][0]
      expect(lastCall.target.value).toBe('123')
    })
  })

  describe('IME composition', () => {
    it('should pass through onChange while composing without conversion', () => {
      const handleChange = vi.fn()
      render(<Input data-testid="i" onChange={handleChange} />)
      const input = screen.getByTestId('i') as HTMLInputElement

      fireEvent.compositionStart(input)
      fireEvent.change(input, { target: { value: 'ㄣ' } })

      expect(handleChange).toHaveBeenCalled()
      // composition 中、原值通過、不轉
      const callArg = handleChange.mock.calls[0][0]
      expect(callArg.target.value).toBe('ㄣ')
    })

    it('should fire onChange with converted value on compositionEnd', () => {
      const handleChange = vi.fn()
      render(<Input data-testid="i" onChange={handleChange} />)
      const input = screen.getByTestId('i') as HTMLInputElement

      fireEvent.compositionStart(input)
      fireEvent.compositionEnd(input, { target: { value: '中文' } })

      // compositionEnd 觸發 onChange
      expect(handleChange).toHaveBeenCalled()
    })

    it('should call external onCompositionStart and onCompositionEnd handlers', () => {
      const onStart = vi.fn()
      const onEnd = vi.fn()
      render(
        <Input
          data-testid="i"
          onCompositionStart={onStart}
          onCompositionEnd={onEnd}
          onChange={() => {}}
        />
      )
      const input = screen.getByTestId('i') as HTMLInputElement
      fireEvent.compositionStart(input)
      fireEvent.compositionEnd(input, { target: { value: 'x' } })
      expect(onStart).toHaveBeenCalledTimes(1)
      expect(onEnd).toHaveBeenCalledTimes(1)
    })

    it('should prevent Enter key during composition', () => {
      const onKeyDown = vi.fn()
      render(<Input data-testid="i" onKeyDown={onKeyDown} onChange={() => {}} />)
      const input = screen.getByTestId('i') as HTMLInputElement

      fireEvent.compositionStart(input)
      fireEvent.keyDown(input, { key: 'Enter' })

      // composition 中按 Enter、外部 onKeyDown 不應被呼叫
      expect(onKeyDown).not.toHaveBeenCalled()
    })

    it('should call external onKeyDown when not composing', () => {
      const onKeyDown = vi.fn()
      render(<Input data-testid="i" onKeyDown={onKeyDown} onChange={() => {}} />)
      const input = screen.getByTestId('i') as HTMLInputElement

      fireEvent.keyDown(input, { key: 'a' })
      expect(onKeyDown).toHaveBeenCalledTimes(1)
    })
  })

  describe('Math calculation on blur', () => {
    it('should calculate math expression on blur for type=text', () => {
      const handleChange = vi.fn()
      render(<Input data-testid="i" type="text" onChange={handleChange} defaultValue="" />)
      const input = screen.getByTestId('i') as HTMLInputElement

      // 直接設值（避開 controlled state、模擬已有值）
      input.value = '1+2*3'
      fireEvent.blur(input)

      // 1+2*3 = 7、handleChange 應被呼叫並傳入計算後值
      const calls = handleChange.mock.calls
      const lastValue = calls[calls.length - 1]?.[0]?.target?.value
      expect(lastValue).toBe('7')
    })

    it('should not calculate when enableMathCalculation is false', () => {
      const handleChange = vi.fn()
      render(
        <Input data-testid="i" type="text" enableMathCalculation={false} onChange={handleChange} />
      )
      const input = screen.getByTestId('i') as HTMLInputElement

      input.value = '1+2'
      fireEvent.blur(input)

      // 不應因計算而觸發 onChange
      expect(handleChange).not.toHaveBeenCalled()
    })

    it('should call external onBlur', () => {
      const handleBlur = vi.fn()
      render(<Input data-testid="i" onBlur={handleBlur} onChange={() => {}} />)
      const input = screen.getByTestId('i') as HTMLInputElement
      fireEvent.blur(input)
      expect(handleBlur).toHaveBeenCalledTimes(1)
    })

    it('should not break blur on plain non-math text', () => {
      const handleChange = vi.fn()
      const handleBlur = vi.fn()
      render(<Input data-testid="i" type="text" onChange={handleChange} onBlur={handleBlur} />)
      const input = screen.getByTestId('i') as HTMLInputElement
      input.value = 'hello world'
      fireEvent.blur(input)
      // 不是數學表達式、onChange 不該被計算邏輯呼叫
      expect(handleChange).not.toHaveBeenCalled()
      expect(handleBlur).toHaveBeenCalledTimes(1)
    })
  })
})
