import { describe, it, expect } from 'vitest'
import { formatDate } from '@/lib/utils/format-date'

describe('formatDate', () => {
  describe('Valid inputs', () => {
    it('should format Date object correctly', () => {
      const date = new Date('2025-11-19T00:00:00')
      const result = formatDate(date)
      expect(result).toBe('2025-11-19')
    })

    it('should format ISO string correctly', () => {
      const isoString = '2025-11-19T10:30:00Z'
      const result = formatDate(isoString)
      // Result depends on local timezone, so we just check format
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('should format date with single digit month and day', () => {
      const date = new Date('2025-01-05T00:00:00')
      const result = formatDate(date)
      expect(result).toBe('2025-01-05')
    })

    it('should handle end of year date', () => {
      const date = new Date(2025, 11, 31) // Month is 0-indexed
      const result = formatDate(date)
      expect(result).toBe('2025-12-31')
    })

    it('should handle start of year date', () => {
      const date = new Date(2025, 0, 1) // Month is 0-indexed
      const result = formatDate(date)
      expect(result).toBe('2025-01-01')
    })
  })

  describe('Invalid inputs', () => {
    it('should return empty string for null', () => {
      const result = formatDate(null)
      expect(result).toBe('')
    })

    it('should return empty string for undefined', () => {
      const result = formatDate(undefined)
      expect(result).toBe('')
    })

    it('should return empty string for invalid date string', () => {
      const result = formatDate('invalid-date')
      expect(result).toBe('')
    })

    it('should return empty string for empty string', () => {
      const result = formatDate('')
      expect(result).toBe('')
    })

    it('should return empty string for invalid Date object', () => {
      const invalidDate = new Date('not a date')
      const result = formatDate(invalidDate)
      expect(result).toBe('')
    })
  })

  describe('Edge cases', () => {
    it('should handle leap year date', () => {
      const date = new Date(2024, 1, 29) // Feb 29, 2024
      const result = formatDate(date)
      expect(result).toBe('2024-02-29')
    })

    it('should handle dates far in the past', () => {
      const date = new Date(1990, 4, 15) // May 15, 1990
      const result = formatDate(date)
      expect(result).toBe('1990-05-15')
    })

    it('should handle dates far in the future', () => {
      const date = new Date(2099, 11, 31) // Dec 31, 2099
      const result = formatDate(date)
      expect(result).toBe('2099-12-31')
    })
  })
})
