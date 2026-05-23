/**
 * 永豐豐收款 QPay 加解密測試 — 對齊官方 SampleCode（QPayToolkit.php）
 *
 * 2026-05-23 重寫：舊測試測的是 line-payment-bot 版（SHA256 串接 HashID / sortObjectKeys / 4 參數），
 * 演算法跟永豐官方對不上、已淘汰。本檔測官方重寫版。
 * round-trip 證明加解密自洽；HashID/IV 印出具體值、之後跟永豐線上工具
 * (sandbox.sinopac.com/QPay.ApiClient/Calc/Encrypt) 對拍確認對外一致。
 */
import { describe, it, expect } from 'vitest'
import {
  generateHashID,
  getIV,
  generateSign,
  encryptMessage,
  decryptMessage,
  type ShopHash,
} from '@/lib/payment-providers/sinopac/crypto'

// SampleCode 範例假值（非真實憑證）
const shopHash: ShopHash = {
  A1: '22ADBB533F97436F',
  A2: 'F16022C32580441C',
  B1: '1714AD48E2AC490C',
  B2: '6C32137B97654105',
}

describe('sinopac QPay crypto', () => {
  it('HashID = XOR(A1,A2)+XOR(B1,B2)、32 字元大寫 hex', () => {
    const hashID = generateHashID(shopHash)
    // 手算：XOR(22ADBB533F97436F,F16022C32580441C)=D3CD99901A170773
    //       XOR(1714AD48E2AC490C,6C32137B97654105)=7B26BE3375C90809
    expect(hashID).toBe('D3CD99901A1707737B26BE3375C90809')
    expect(hashID).toHaveLength(32)
  })

  it('IV = SHA256(nonce) 後 16 碼', () => {
    const iv = getIV('ABCDEF0123456789')
    expect(iv).toHaveLength(16)
    expect(iv).toMatch(/^[0-9A-F]{16}$/)
  })

  it('Sign：第一層 scalar 升序 key=value& + nonce + hashID → SHA256 大寫', () => {
    const sign = generateSign(
      { ShopNo: 'NA0638_001', Amount: '50000', PayType: 'A', ATMParam: { ExpireDate: '20260601' } },
      'ABCDEF0123456789',
      generateHashID(shopHash)
    )
    expect(sign).toMatch(/^[0-9A-F]{64}$/) // ATMParam(物件)不進 Sign、只簽 scalar
  })

  it('排序不影響 Sign（key 不同順序輸入、輸出一致）', () => {
    const hashID = generateHashID(shopHash)
    const a = generateSign({ ShopNo: 'X', Amount: '100', PayType: 'A' }, 'ABCDEF0123456789', hashID)
    const b = generateSign({ PayType: 'A', Amount: '100', ShopNo: 'X' }, 'ABCDEF0123456789', hashID)
    expect(a).toBe(b)
  })

  it('加密→解密 round-trip 還原原 payload', () => {
    const hashID = generateHashID(shopHash)
    const iv = getIV('ABCDEF0123456789')
    const payload = {
      ShopNo: 'NA0638_001',
      OrderNo: 'A20260523120000',
      Amount: '50000',
      CurrencyID: 'TWD',
      PayType: 'A',
    }
    const enc = encryptMessage(payload, hashID, iv)
    expect(enc).toMatch(/^[0-9A-F]+$/) // 大寫 hex
    expect(decryptMessage(enc, hashID, iv)).toEqual(payload)
  })

  it('encryptMessage 移除空值（對齊 SampleCode array_filter）', () => {
    const hashID = generateHashID(shopHash)
    const iv = getIV('ABCDEF0123456789')
    const enc = encryptMessage(
      { ShopNo: 'X', Memo: '', Param1: null as unknown as string, Amount: '100' },
      hashID,
      iv
    )
    expect(decryptMessage(enc, hashID, iv)).toEqual({ ShopNo: 'X', Amount: '100' })
  })
})
