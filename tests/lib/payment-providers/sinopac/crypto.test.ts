/**
 * 永豐加解密 lib 單元測試
 * 確認 sortObjectKeys 遞迴 / encryptMessage round-trip / Sign / HashID 行為穩定
 */

import { describe, test, expect } from 'vitest'
import {
  generateHashID,
  generateSign,
  encryptMessage,
  decryptMessage,
  sortObjectKeys,
} from '@/lib/payment-providers/sinopac/crypto'

describe('sinopac/crypto', () => {
  describe('generateHashID', () => {
    test('4 組 hash 合成 32 字元 hex', () => {
      const result = generateHashID('aaaa', 'bbbb', 'cccc', 'dddd')
      expect(result).toHaveLength(32)
      expect(result).toMatch(/^[0-9a-f]+$/)
    })

    test('輸入相同、輸出相同', () => {
      const a = generateHashID('1', '2', '3', '4')
      const b = generateHashID('1', '2', '3', '4')
      expect(a).toBe(b)
    })

    test('順序改變、結果改變', () => {
      const a = generateHashID('1', '2', '3', '4')
      const b = generateHashID('4', '3', '2', '1')
      expect(a).not.toBe(b)
    })
  })

  describe('sortObjectKeys', () => {
    test('一層 object key 排序', () => {
      const result = sortObjectKeys({ b: 1, a: 2, c: 3 })
      expect(Object.keys(result as Record<string, number>)).toEqual(['a', 'b', 'c'])
    })

    test('遞迴排序 nested object', () => {
      const result = sortObjectKeys({
        z: { y: 1, x: 2 },
        a: { c: 3, b: 4 },
      }) as Record<string, Record<string, number>>
      expect(Object.keys(result)).toEqual(['a', 'z'])
      expect(Object.keys(result.a)).toEqual(['b', 'c'])
      expect(Object.keys(result.z)).toEqual(['x', 'y'])
    })

    test('array 內 object 各自排序', () => {
      const result = sortObjectKeys([
        { b: 1, a: 2 },
        { d: 3, c: 4 },
      ]) as Array<Record<string, number>>
      expect(Object.keys(result[0])).toEqual(['a', 'b'])
      expect(Object.keys(result[1])).toEqual(['c', 'd'])
    })

    test('null / undefined 直接回傳', () => {
      expect(sortObjectKeys(null)).toBeNull()
      expect(sortObjectKeys(undefined)).toBeUndefined()
    })

    test('primitive 直接回傳', () => {
      expect(sortObjectKeys('abc')).toBe('abc')
      expect(sortObjectKeys(123)).toBe(123)
      expect(sortObjectKeys(true)).toBe(true)
    })
  })

  describe('encryptMessage + decryptMessage round-trip', () => {
    const hashID = '0123456789abcdef0123456789abcdef' // 32 chars
    const nonce = '1234567890123456789012345' // 25 chars (>= 16)

    test('加密 → 解密、得到原 object', () => {
      const payload = { orderNo: 'ORD-001', amount: 15000, productName: '東京 5 日' }
      const encrypted = encryptMessage(payload, hashID, nonce)
      const decrypted = decryptMessage<typeof payload>(encrypted, hashID, nonce)
      expect(decrypted).toEqual(payload)
    })

    test('加密結果為大寫 hex', () => {
      const encrypted = encryptMessage({ a: 1 }, hashID, nonce)
      expect(encrypted).toBe(encrypted.toUpperCase())
      expect(encrypted).toMatch(/^[0-9A-F]+$/)
    })

    test('hashID 長度錯誤 throw', () => {
      expect(() => encryptMessage({ a: 1 }, 'tooshort', nonce)).toThrow(/32 字元/)
    })

    test('nonce 太短 throw', () => {
      expect(() => encryptMessage({ a: 1 }, hashID, 'short')).toThrow(/至少 16 字元/)
    })
  })

  describe('generateSign', () => {
    const hashID = '0123456789abcdef0123456789abcdef'
    const nonce = '1234567890123456789012345'

    test('產出 64 字元大寫 hex', () => {
      const sign = generateSign(JSON.stringify({ a: 1 }), nonce, hashID)
      expect(sign).toHaveLength(64)
      expect(sign).toBe(sign.toUpperCase())
      expect(sign).toMatch(/^[0-9A-F]+$/)
    })

    test('排序不影響 Sign（key 不同順序輸入、輸出一致）', () => {
      const a = generateSign(JSON.stringify({ a: 1, b: 2 }), nonce, hashID)
      const b = generateSign(JSON.stringify({ b: 2, a: 1 }), nonce, hashID)
      expect(a).toBe(b)
    })

    test('值改變、Sign 改變', () => {
      const a = generateSign(JSON.stringify({ a: 1 }), nonce, hashID)
      const b = generateSign(JSON.stringify({ a: 2 }), nonce, hashID)
      expect(a).not.toBe(b)
    })
  })
})
