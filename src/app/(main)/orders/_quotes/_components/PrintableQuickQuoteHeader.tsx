/**
 * PrintableQuickQuoteHeader - Logo 與標題區塊（純 render、無 state）
 */
import React from 'react'
import { getPrintLogoBoxStyle } from '@/hooks/useWorkspaceSettings'

interface PrintableQuickQuoteHeaderProps {
  logoUrl: string
  wsName: string | undefined
  /** Logo 縮放(0.5-2.0、預設 1.0) */
  logoScale?: number
  /** Logo 水平位移 px、預設 0 */
  logoOffsetX?: number
}

export const PrintableQuickQuoteHeader: React.FC<PrintableQuickQuoteHeaderProps> = ({
  logoUrl,
  wsName,
  logoScale,
  logoOffsetX,
}) => {
  return (
    <div
      className="header"
      style={{
        position: 'relative',
        paddingBottom: '16px',
        marginBottom: '24px',
        borderBottom: '1px solid #B8A99A',
      }}
    >
      {logoUrl ? (
        <div
          className="logo"
          style={getPrintLogoBoxStyle({
            logo_scale: logoScale ?? 1.0,
            logo_offset_x: logoOffsetX ?? 0,
          })}
        >
          <img
            src={logoUrl}
            alt="Company Logo"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              objectPosition: 'left top',
            }}
          />
        </div>
      ) : (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            fontSize: '12px',
            color: 'var(--morandi-muted)',
          }}
        >
          {wsName || ''}
        </div>
      )}
      <div className="title-area" style={{ textAlign: 'center', padding: '8px 0' }}>
        <div
          className="subtitle"
          style={{
            fontSize: '12px',
            letterSpacing: '3px',
            color: '#B8A99A',
            fontWeight: 500,
            marginBottom: '4px',
          }}
        >
          QUOTATION
        </div>
        <h1
          className="title"
          style={{
            fontSize: '20px',
            fontWeight: 'bold',
            color: 'var(--morandi-primary)',
            margin: 0,
          }}
        >
          {'報價請款單'}
        </h1>
      </div>
    </div>
  )
}
