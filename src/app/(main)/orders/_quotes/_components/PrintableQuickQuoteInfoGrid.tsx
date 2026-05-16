/**
 * PrintableQuickQuoteInfoGrid - 客戶資訊欄位（純 render、無 state）
 */
import React from 'react'
import { getTodayString } from '@/lib/utils/format-date'
import { Quote } from '@/types/quote.types'

interface PrintableQuickQuoteInfoGridProps {
  quote: Quote
}

const infoLabelStyle: React.CSSProperties = {
  fontWeight: 600,
  width: '80px',
  flexShrink: 0,
}

const infoValueStyle: React.CSSProperties = {
  flex: 1,
  borderBottom: '1px solid var(--border)',
  paddingBottom: '2px',
}

export const PrintableQuickQuoteInfoGrid: React.FC<PrintableQuickQuoteInfoGridProps> = ({
  quote,
}) => {
  return (
    <div
      className="info-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        marginBottom: '24px',
        fontSize: '13px',
      }}
    >
      <div className="info-row flex">
        <span className="info-label" style={infoLabelStyle}>
          {'團體名稱：'}
        </span>
        <span className="info-value" style={infoValueStyle}>
          {quote.customer_name}
        </span>
      </div>
      <div className="info-row flex">
        <span className="info-label" style={infoLabelStyle}>
          {'團體編號：'}
        </span>
        <span className="info-value" style={infoValueStyle}>
          {quote.tour_code || ''}
        </span>
      </div>
      <div className="info-row flex">
        <span className="info-label" style={infoLabelStyle}>
          {'聯絡電話：'}
        </span>
        <span className="info-value" style={infoValueStyle}>
          {quote.contact_phone || ''}
        </span>
      </div>
      <div className="info-row flex">
        <span className="info-label" style={infoLabelStyle}>
          {'承辦業務：'}
        </span>
        <span className="info-value" style={infoValueStyle}>
          {quote.handler_name || 'William'}
        </span>
      </div>
      <div className="info-row full flex" style={{ gridColumn: 'span 2' }}>
        <span className="info-label" style={infoLabelStyle}>
          {'通訊地址：'}
        </span>
        <span className="info-value" style={infoValueStyle}>
          {quote.contact_address || ''}
        </span>
      </div>
      <div className="info-row flex">
        <span className="info-label" style={infoLabelStyle}>
          {'開單日期：'}
        </span>
        <span className="info-value" style={infoValueStyle}>
          {quote.issue_date || getTodayString()}
        </span>
      </div>
    </div>
  )
}
