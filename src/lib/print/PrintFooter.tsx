'use client'
/**
 * PrintFooter - 列印頁尾組件（共用）
 */

import React from 'react'
import { useCompanyInfo } from '@/hooks/useCompanyInfo'
import { MORANDI_COLORS } from './print-styles'

export const PrintFooter: React.FC = () => {
  const { legalName, subtitle } = useCompanyInfo()

  return (
    <div
      className="border-t"
      style={{
        borderColor: MORANDI_COLORS.borderLight,
        marginTop: '24px',
        paddingTop: '16px',
      }}
    >
      {subtitle && (
        <div className="text-center text-xs mb-1" style={{ color: MORANDI_COLORS.lightGray }}>
          ─ {subtitle} ─
        </div>
      )}
      <div className="text-center text-xs" style={{ color: MORANDI_COLORS.lightGray }}>
        <span>
          {legalName} © {new Date().getFullYear()}
        </span>
      </div>
    </div>
  )
}
