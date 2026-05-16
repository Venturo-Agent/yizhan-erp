/**
 * PrintableQuickQuotePayment - 付款資訊 + 收據資訊區塊（純 render、無 state）
 */
import React from 'react'

interface WorkspaceBankInfo {
  bank_name?: string | null
  bank_branch?: string | null
  bank_account?: string | null
  bank_account_name?: string | null
}

interface PrintableQuickQuotePaymentProps {
  companyFullName: string
  hasBankInfo: boolean
  ws: WorkspaceBankInfo
}

export const PrintableQuickQuotePayment: React.FC<PrintableQuickQuotePaymentProps> = ({
  companyFullName,
  hasBankInfo,
  ws,
}) => {
  return (
    <>
      {/* 付款資訊 */}
      <div
        className="payment-section"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '24px',
          paddingTop: '16px',
          borderTop: '1px solid #F3F4F6',
          marginBottom: '16px',
          fontSize: '13px',
        }}
      >
        <div>
          <div
            className="payment-title"
            style={{ fontWeight: 600, color: 'var(--morandi-primary)', marginBottom: '8px' }}
          >
            {'匯款資訊'}
          </div>
          <div
            className="payment-info"
            style={{ color: 'var(--morandi-primary)', lineHeight: 1.8 }}
          >
            {hasBankInfo ? (
              <>
                <div>
                  {'戶名：'}
                  {ws.bank_account_name || companyFullName}
                </div>
                {ws.bank_name && (
                  <div>
                    {'銀行：'}
                    {ws.bank_name}
                  </div>
                )}
                {ws.bank_branch && (
                  <div>
                    {'分行：'}
                    {ws.bank_branch}
                  </div>
                )}
                {ws.bank_account && (
                  <div>
                    {'帳號：'}
                    {ws.bank_account}
                  </div>
                )}
              </>
            ) : (
              <div style={{ color: 'var(--morandi-muted)', fontStyle: 'italic' }}>
                {'請至公司設定填寫銀行資訊'}
              </div>
            )}
          </div>
        </div>
        <div>
          <div
            className="payment-title"
            style={{ fontWeight: 600, color: 'var(--morandi-primary)', marginBottom: '8px' }}
          >
            {'支票資訊'}
          </div>
          <div
            className="payment-info"
            style={{ color: 'var(--morandi-primary)', lineHeight: 1.8 }}
          >
            <div>
              {'抬頭：'}
              {companyFullName}
            </div>
            <div className="warning" style={{ color: 'var(--status-danger)', fontWeight: 600 }}>
              {'禁止背書轉讓'}
            </div>
            <div
              className="note"
              style={{ fontSize: '11px', color: 'var(--morandi-muted)', marginTop: '8px' }}
            >
              {'（請於出發日前付清餘額）'}
            </div>
          </div>
        </div>
      </div>

      {/* 收據資訊 */}
      <div
        className="receipt-section"
        style={{
          paddingTop: '16px',
          borderTop: '1px solid #F3F4F6',
          marginBottom: '24px',
          fontSize: '13px',
        }}
      >
        <div
          className="payment-title"
          style={{ fontWeight: 600, color: 'var(--morandi-primary)', marginBottom: '8px' }}
        >
          {'收據資訊'}
        </div>
        <div
          className="receipt-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginTop: '8px',
          }}
        >
          <div className="receipt-row flex">
            <span
              className="receipt-label"
              style={{
                fontWeight: 600,
                color: 'var(--morandi-primary)',
                width: '130px',
                flexShrink: 0,
              }}
            >
              {'開立代收轉付抬頭：'}
            </span>
            <span
              className="receipt-value"
              style={{ flex: 1, borderBottom: '1px solid var(--border)' }}
            >
              {' '}
            </span>
          </div>
          <div className="receipt-row flex">
            <span
              className="receipt-label"
              style={{
                fontWeight: 600,
                color: 'var(--morandi-primary)',
                width: '130px',
                flexShrink: 0,
              }}
            >
              {'開立代收轉付統編：'}
            </span>
            <span
              className="receipt-value"
              style={{ flex: 1, borderBottom: '1px solid var(--border)' }}
            >
              {' '}
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
