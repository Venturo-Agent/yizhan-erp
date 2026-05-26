import { describe, it, expect } from 'vitest'
import { stripHtml, truncateText, camelToKebab, kebabToCamel } from '@/lib/utils/string-utils'

describe('string-utils', () => {
  describe('stripHtml', () => {
    it('should return empty string for null', () => {
      expect(stripHtml(null)).toBe('')
    })

    it('should return empty string for undefined', () => {
      expect(stripHtml(undefined)).toBe('')
    })

    it('should return empty string for empty string', () => {
      expect(stripHtml('')).toBe('')
    })

    it('should return plain text unchanged (trimmed)', () => {
      expect(stripHtml('hello world')).toBe('hello world')
    })

    it('should strip simple tags', () => {
      expect(stripHtml('<p>hello</p>')).toBe('hello')
    })

    it('should strip nested tags', () => {
      expect(stripHtml('<p><strong>hello</strong> <em>world</em></p>')).toBe('hello world')
    })

    it('should strip self-closing tags', () => {
      expect(stripHtml('line1<br/>line2')).toBe('line1line2')
    })

    it('should strip tags with attributes', () => {
      expect(stripHtml('<a href="https://example.com" target="_blank">click</a>')).toBe('click')
    })

    it('should trim leading/trailing whitespace', () => {
      expect(stripHtml('   <p>hello</p>   ')).toBe('hello')
    })

    it('should handle HTML with only tags', () => {
      expect(stripHtml('<div><span></span></div>')).toBe('')
    })
  })

  describe('truncateText', () => {
    it('should return empty string for null', () => {
      expect(truncateText(null, 10)).toBe('')
    })

    it('should return empty string for undefined', () => {
      expect(truncateText(undefined, 10)).toBe('')
    })

    it('should return empty string for empty string', () => {
      expect(truncateText('', 10)).toBe('')
    })

    it('should return text unchanged when shorter than max', () => {
      expect(truncateText('hello', 10)).toBe('hello')
    })

    it('should return text unchanged when equal to max', () => {
      expect(truncateText('helloworld', 10)).toBe('helloworld')
    })

    it('should truncate when longer than max and add ellipsis', () => {
      expect(truncateText('hello world from venturo', 11)).toBe('hello world...')
    })

    it('should truncate to maxLength characters', () => {
      const result = truncateText('abcdefghij', 5)
      expect(result).toBe('abcde...')
    })

    it('should handle maxLength of 0', () => {
      expect(truncateText('hello', 0)).toBe('...')
    })

    it('should handle Chinese characters by length', () => {
      // .length counts UTF-16 code units; basic CJK = 1 unit each
      expect(truncateText('客戶資料總管理', 3)).toBe('客戶資...')
    })
  })

  describe('camelToKebab', () => {
    it('should convert simple camelCase', () => {
      expect(camelToKebab('camelCase')).toBe('camel-case')
    })

    it('should convert multi-word camelCase', () => {
      expect(camelToKebab('myVariableName')).toBe('my-variable-name')
    })

    it('should handle PascalCase', () => {
      // First capital has no lowercase before it (no dash), but yV matches → my-variable
      expect(camelToKebab('MyVariable')).toBe('my-variable')
    })

    it('should handle all lowercase', () => {
      expect(camelToKebab('lowercase')).toBe('lowercase')
    })

    it('should handle empty string', () => {
      expect(camelToKebab('')).toBe('')
    })

    it('should handle single character', () => {
      expect(camelToKebab('a')).toBe('a')
    })

    it('should not insert dash between digit and uppercase letter', () => {
      // regex [a-z][A-Z] requires lowercase letter, digits don't match
      expect(camelToKebab('item1Name')).toBe('item1name')
    })
  })

  describe('kebabToCamel', () => {
    it('should convert simple kebab-case', () => {
      expect(kebabToCamel('kebab-case')).toBe('kebabCase')
    })

    it('should convert multi-word kebab-case', () => {
      expect(kebabToCamel('my-variable-name')).toBe('myVariableName')
    })

    it('should handle no dashes', () => {
      expect(kebabToCamel('lowercase')).toBe('lowercase')
    })

    it('should handle empty string', () => {
      expect(kebabToCamel('')).toBe('')
    })

    it('should handle single dash', () => {
      expect(kebabToCamel('a-b')).toBe('aB')
    })

    it('should be inverse of camelToKebab for typical inputs', () => {
      const original = 'myVariableName'
      expect(kebabToCamel(camelToKebab(original))).toBe(original)
    })

    it('should not capitalize numbers', () => {
      expect(kebabToCamel('item-1-name')).toBe('item-1Name')
    })
  })
})
