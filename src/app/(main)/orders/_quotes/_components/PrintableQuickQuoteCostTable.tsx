/**
 * PrintableQuickQuoteCostTable - 收費明細表、費用說明、金額統計、公司印章（純 render、無 state）
 */
import React from 'react'
import { Quote, QuickQuoteItem } from '@/types/quote.types'
import { SealImage } from '@/components/seal-image'

interface PrintableQuickQuoteCostTableProps {
  quote: Quote
  items: QuickQuoteItem[]
  totalAmount: number
  balanceAmount: number
  invoiceSealUrl: string | null | undefined
}

export const PrintableQuickQuoteCostTable: React.FC<PrintableQuickQuoteCostTableProps> = ({
  quote,
  items,
  totalAmount,
  balanceAmount,
  invoiceSealUrl,
}) => {
  return (
    <>
      {/* 收費明細表標題 */}
      <div
        className="section-title"
        style={{
          fontSize: '16px',
          fontWeight: 600,
          color: 'var(--morandi-primary)',
          marginBottom: '8px',
        }}
      >
        {'收費明細表 ▽'}
      </div>

      {/* 明細表格 */}
      <table
        className="items-table"
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          borderSpacing: 0,
          border: '1px solid var(--border)',
          marginBottom: '20px',
          fontSize: '13px',
        }}
      >
        <thead>
          <tr style={{ backgroundColor: 'var(--background)' }}>
            <th
              style={{
                padding: '10px 12px',
                textAlign: 'left',
                fontWeight: 600,
                color: 'var(--morandi-primary)',
                borderBottom: '1px solid var(--border)',
                width: '35%',
              }}
            >
              {'摘要'}
            </th>
            <th
              style={{
                padding: '10px 12px',
                textAlign: 'center',
                fontWeight: 600,
                color: 'var(--morandi-primary)',
                borderBottom: '1px solid var(--border)',
                borderLeft: '1px solid var(--border)',
                width: '10%',
              }}
            >
              {'數量'}
            </th>
            <th
              style={{
                padding: '10px 12px',
                textAlign: 'center',
                fontWeight: 600,
                color: 'var(--morandi-primary)',
                borderBottom: '1px solid var(--border)',
                borderLeft: '1px solid var(--border)',
                width: '15%',
              }}
            >
              {'單價'}
            </th>
            <th
              style={{
                padding: '10px 12px',
                textAlign: 'center',
                fontWeight: 600,
                color: 'var(--morandi-primary)',
                borderBottom: '1px solid var(--border)',
                borderLeft: '1px solid var(--border)',
                width: '15%',
              }}
            >
              {'金額'}
            </th>
            <th
              style={{
                padding: '10px 12px',
                textAlign: 'left',
                fontWeight: 600,
                color: 'var(--morandi-primary)',
                borderBottom: '1px solid var(--border)',
                borderLeft: '1px solid var(--border)',
                width: '25%',
              }}
            >
              {'備註'}
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item.id}>
              <td
                style={{
                  padding: '8px 12px',
                  color: 'var(--morandi-primary)',
                  borderBottom: index === items.length - 1 ? 'none' : '1px solid var(--border)',
                }}
              >
                {item.description || ' '}
              </td>
              <td
                style={{
                  padding: '8px 12px',
                  textAlign: 'center',
                  color: 'var(--morandi-primary)',
                  borderBottom: index === items.length - 1 ? 'none' : '1px solid var(--border)',
                  borderLeft: '1px solid var(--border)',
                }}
              >
                {item.quantity && item.quantity !== 0 ? item.quantity : ' '}
              </td>
              <td
                style={{
                  padding: '8px 12px',
                  textAlign: 'right',
                  color: 'var(--morandi-primary)',
                  borderBottom: index === items.length - 1 ? 'none' : '1px solid var(--border)',
                  borderLeft: '1px solid var(--border)',
                }}
              >
                {item.unit_price && item.unit_price !== 0
                  ? (item.unit_price || 0).toLocaleString()
                  : ' '}
              </td>
              <td
                style={{
                  padding: '8px 12px',
                  textAlign: 'right',
                  color: 'var(--morandi-primary)',
                  fontWeight: 600,
                  borderBottom: index === items.length - 1 ? 'none' : '1px solid var(--border)',
                  borderLeft: '1px solid var(--border)',
                }}
              >
                {item.amount && item.amount !== 0 ? (item.amount || 0).toLocaleString() : ' '}
              </td>
              <td
                style={{
                  padding: '8px 12px',
                  color: 'var(--morandi-primary)',
                  borderBottom: index === items.length - 1 ? 'none' : '1px solid var(--border)',
                  borderLeft: '1px solid var(--border)',
                }}
              >
                {item.notes || ' '}
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td
                colSpan={5}
                style={{
                  padding: '32px 12px',
                  textAlign: 'center',
                  color: 'var(--morandi-muted)',
                }}
              >
                {'尚無收費項目'}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* 費用說明 - 只有有資料才顯示 */}
      {quote.expense_description && (
        <div
          style={{
            marginBottom: '20px',
            padding: '12px 16px',
            backgroundColor: 'var(--background)',
            border: '1px solid var(--border)',
          }}
        >
          <div
            style={{
              fontWeight: 600,
              color: 'var(--morandi-primary)',
              marginBottom: '8px',
              fontSize: '14px',
            }}
          >
            {'費用說明'}
          </div>
          <div
            style={{
              color: 'var(--morandi-primary)',
              fontSize: '13px',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
            }}
          >
            {quote.expense_description}
          </div>
        </div>
      )}

      {/* 金額統計 — Excel 風一橫條、不再用 divider 切兩張卡片感 */}
      <div
        className="summary-box"
        style={{
          backgroundColor: 'var(--background)',
          border: '1px solid var(--border)',
          padding: '10px 16px',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '40px',
          marginBottom: '20px',
        }}
      >
        {quote.received_amount && quote.received_amount > 0 ? (
          <>
            <div className="summary-item flex items-center gap-2">
              <span
                className="summary-label"
                style={{ fontSize: '11px', fontWeight: 600, color: 'var(--morandi-primary)' }}
              >
                {'應收金額'}
              </span>
              <span
                className="summary-value"
                style={{
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: 'var(--morandi-primary)',
                }}
              >
                {totalAmount.toLocaleString()}
              </span>
            </div>
            <div className="summary-item flex items-center gap-2">
              <span
                className="summary-label"
                style={{ fontSize: '11px', fontWeight: 600, color: 'var(--morandi-primary)' }}
              >
                {'已收金額'}
              </span>
              <span
                className="summary-value"
                style={{
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: 'var(--morandi-primary)',
                }}
              >
                {(quote.received_amount || 0).toLocaleString()}
              </span>
            </div>
            <div className="summary-item flex items-center gap-2">
              <span
                className="summary-label"
                style={{ fontSize: '11px', fontWeight: 600, color: 'var(--morandi-primary)' }}
              >
                {'應收餘額'}
              </span>
              <span
                className="summary-value"
                style={{
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: balanceAmount > 0 ? '#DC2626' : '#059669',
                }}
              >
                {balanceAmount.toLocaleString()}
              </span>
            </div>
          </>
        ) : (
          <>
            <span
              className="summary-label"
              style={{ fontSize: '11px', fontWeight: 600, color: 'var(--morandi-primary)' }}
            >
              {'應收金額'}
            </span>
            <span
              className="summary-value"
              style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--morandi-primary)' }}
            >
              {totalAmount.toLocaleString()}
            </span>
          </>
        )}
      </div>

      {/* 公司印章 — 金額下方 */}
      {invoiceSealUrl && (
        <div
          className="seal-section"
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: '8px',
            marginBottom: '24px',
            paddingRight: '24px',
          }}
        >
          <SealImage url={invoiceSealUrl} size={110} opacity={0.85} alt="invoice seal" />
        </div>
      )}
    </>
  )
}
