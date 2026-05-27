'use client'
/**
 * PrintFooter
 * 出納單列印預覽 — 底部區塊
 * 包含：總計、付款方式 + 出款帳戶、公司頁尾
 */

import React from 'react'
import { useTranslations } from 'next-intl'

// Morandi 色系
const COLORS = {
  gold: '#B8A99A',
  brown: '#3a3633',
  gray: '#4B5563',
  lightGray: '#9CA3AF',
}

interface PrintFooterProps {
  totalAmount: number
  /** 銀行手續費（跨行轉帳費）2026-05-21 加 */
  bankFee?: number
  paymentMethod?: {
    name: string
  } | null
  bankAccount?: {
    name: string
    bank_name: string | null
    account_number: string | null
  } | null
  subtitle: string | null | undefined
  companyFullName: string
}

export function PrintFooter({
  totalAmount,
  bankFee = 0,
  paymentMethod,
  bankAccount,
  subtitle,
  companyFullName,
}: PrintFooterProps) {
  const t = useTranslations('finance')
  const grandTotal = totalAmount + bankFee
  return (
    <>
      {/* 2026-05-27 William 拍板：手續費分攤在上面各列 / 小計、不另列獨立行；
          總計 = 應付純額 + 手續費、註記「（含 X 手續費）」。 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: `2px solid ${COLORS.brown}`,
          padding: '14px 8px',
          marginBottom: '28px',
        }}
      >
        <span
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: COLORS.brown,
          }}
        >
          {t('printTotal')}
          {bankFee > 0 && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 400,
                color: COLORS.lightGray,
                marginLeft: '8px',
              }}
            >
              （含 {bankFee.toLocaleString()} 手續費）
            </span>
          )}
        </span>
        <span
          style={{
            fontSize: '15px',
            fontWeight: 700,
            color: COLORS.gold,
          }}
        >
          {grandTotal.toLocaleString()}
        </span>
      </div>

      {/* 付款方式 + 出款帳戶（列印頁底部） */}
      {(paymentMethod || bankAccount) && (
        <div
          style={{
            fontSize: '10px',
            color: COLORS.lightGray,
            padding: '6px 8px',
            marginBottom: '20px',
            borderBottom: `1px solid ${COLORS.gold}30`,
          }}
        >
          <div className="flex gap-6 flex-wrap">
            {paymentMethod && (
              <span>
                付款方式：<span style={{ color: COLORS.gray }}>{paymentMethod.name}</span>
              </span>
            )}
            {bankAccount && (
              <span>
                出款帳戶：
                <span style={{ color: COLORS.gray }}>
                  {bankAccount.name}
                  {bankAccount.bank_name ? `・${bankAccount.bank_name}` : ''}
                  {bankAccount.account_number ? `・${bankAccount.account_number}` : ''}
                </span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* 頁尾 */}
      <div
        style={{
          marginTop: '40px',
          textAlign: 'center',
        }}
      >
        {subtitle && (
          <p
            style={{
              fontSize: '11px',
              fontStyle: 'italic',
              color: COLORS.lightGray,
              margin: '0 0 8px 0',
            }}
          >
            {subtitle}
          </p>
        )}
        <p
          style={{
            fontSize: '10px',
            color: COLORS.lightGray,
            margin: 0,
          }}
        >
          {companyFullName} © {new Date().getFullYear()}
        </p>
      </div>
    </>
  )
}
