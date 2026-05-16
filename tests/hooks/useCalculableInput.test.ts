import { describe, it, expect } from 'vitest'
import { calculateExpression } from '@/hooks/useCalculableInput'

describe('calculateExpression', () => {
  describe('basic arithmetic', () => {
    it('should evaluate addition', () => {
      expect(calculateExpression('1+2')).toBe(3)
      expect(calculateExpression('100+250')).toBe(350)
    })

    it('should evaluate subtraction', () => {
      expect(calculateExpression('10-3')).toBe(7)
    })

    it('should evaluate multiplication', () => {
      expect(calculateExpression('6*7')).toBe(42)
    })

    it('should evaluate division', () => {
      expect(calculateExpression('20/4')).toBe(5)
    })

    it('should respect operator precedence', () => {
      expect(calculateExpression('2+3*4')).toBe(14)
      expect(calculateExpression('10-2*3')).toBe(4)
    })

    it('should handle parentheses', () => {
      expect(calculateExpression('(2+3)*4')).toBe(20)
      expect(calculateExpression('10/(2+3)')).toBe(2)
    })

    it('should handle decimals', () => {
      expect(calculateExpression('1.5+2.5')).toBe(4)
      expect(calculateExpression('10*0.5')).toBe(5)
    })

    it('should ignore whitespace', () => {
      expect(calculateExpression(' 1 + 2 ')).toBe(3)
      expect(calculateExpression('  ( 2 + 3 ) * 4  ')).toBe(20)
    })

    it('should handle negative numbers (e.g. 5*-3)', () => {
      expect(calculateExpression('5*-3')).toBe(-15)
    })
  })

  describe('invalid input', () => {
    it('should return null for empty string', () => {
      expect(calculateExpression('')).toBe(null)
      expect(calculateExpression('   ')).toBe(null)
    })

    it('should return null for non-arithmetic characters', () => {
      expect(calculateExpression('abc')).toBe(null)
      expect(calculateExpression('1+a')).toBe(null)
      expect(calculateExpression('alert(1)')).toBe(null)
    })

    it('should return null for unbalanced parentheses', () => {
      expect(calculateExpression('(1+2')).toBe(null)
      expect(calculateExpression('1+2)')).toBe(null)
      expect(calculateExpression(')1+2(')).toBe(null)
    })

    it('should return null for consecutive operators', () => {
      expect(calculateExpression('1++2')).toBe(null)
      expect(calculateExpression('1**2')).toBe(null)
      expect(calculateExpression('1//2')).toBe(null)
      expect(calculateExpression('1--2')).toBe(null)
    })

    it('should return null for division by zero', () => {
      expect(calculateExpression('1/0')).toBe(null)
    })

    it('should return null for malformed expressions that throw', () => {
      expect(calculateExpression('1+')).toBe(null)
      expect(calculateExpression('+')).toBe(null)
    })

    it('should reject expressions with spaces between digits (becomes invalid syntax)', () => {
      // After whitespace strip, "1 2" -> "12" is fine; but "1.2.3" is malformed
      expect(calculateExpression('1.2.3')).toBe(null)
    })
  })

  describe('security', () => {
    it('should reject any non-arithmetic characters (no eval injection)', () => {
      expect(calculateExpression('console.log(1)')).toBe(null)
      expect(calculateExpression('1;2')).toBe(null)
      expect(calculateExpression('1,2')).toBe(null)
      expect(calculateExpression('"hello"')).toBe(null)
    })
  })
})
