/**
 * PrintableQuickQuoteHeader - Logo 與標題區塊（純 render、無 state）
 */
import React from 'react'

interface PrintableQuickQuoteHeaderProps {
  logoUrl: string
  wsName: string | undefined
}

export const PrintableQuickQuoteHeader: React.FC<PrintableQuickQuoteHeaderProps> = ({
  logoUrl,
  wsName,
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
          style={{ position: 'absolute', left: 0, top: 0, width: '120px', height: '40px' }}
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
