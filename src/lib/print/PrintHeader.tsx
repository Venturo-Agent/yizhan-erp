'use client'
/**
 * PrintHeader - 列印頁首組件（共用）
 */

import React from 'react'
import { MORANDI_COLORS } from './print-styles'
import { useAuthStore } from '@/stores/auth-store'

const LABELS = {
  公司_Logo_Alt: '公司 Logo',
}

interface PrintHeaderProps {
  logoUrl?: string
  title: string
  subtitle?: string
}

export const PrintHeader: React.FC<PrintHeaderProps> = ({
  logoUrl,
  title,
  subtitle = 'QUOTATION',
}) => {
  const workspaceName = useAuthStore(state => state.user?.workspace_name) || ''

  return (
    <div
      className="relative pb-4 mb-6"
      style={{ borderBottom: `1px solid ${MORANDI_COLORS.gold}` }}
    >
      {/* Logo - 左上角 */}
      {logoUrl ? (
        <div className="absolute left-0 top-0" style={{ width: '120px', height: '40px' }}>
          <img
            src={logoUrl}
            alt={LABELS.公司_Logo_Alt}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              objectPosition: 'left top',
            }}
          />
        </div>
      ) : (
        <div className="absolute left-0 top-0 text-xs" style={{ color: MORANDI_COLORS.lightGray }}>
          {workspaceName}
        </div>
      )}

      {/* 標題 */}
      <div className="relative z-10 text-center py-2">
        <div
          className="text-sm tracking-widest mb-1"
          style={{ color: MORANDI_COLORS.gold, fontWeight: 500 }}
        >
          {subtitle}
        </div>
        <h1 className="text-xl font-bold" style={{ color: MORANDI_COLORS.brown }}>
          {title}
        </h1>
      </div>
    </div>
  )
}
