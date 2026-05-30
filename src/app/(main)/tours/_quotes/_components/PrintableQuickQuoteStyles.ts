/**
 * PrintableQuickQuoteStyles - 快速報價單 iframe 列印用的 CSS 字串
 * 單獨抽出以保持主檔案可讀性
 */
export const PRINTABLE_QUICK_QUOTE_PRINT_STYLES = `
  @page {
    size: A4;
    margin: 10mm;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang TC", "Microsoft JhengHei", sans-serif;
    font-size: 14px;
    line-height: 1.5;
    color: #333;
    background: white;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }

  .header {
    position: relative;
    padding-bottom: 16px;
    margin-bottom: 24px;
    border-bottom: 1px solid #B8A99A;
  }

  .logo {
    position: absolute;
    left: 0;
    top: 0;
    width: 120px;
    height: 40px;
  }

  .logo img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    object-position: left top;
  }

  .title-area {
    text-align: center;
    padding: 8px 0;
  }

  .subtitle {
    font-size: 12px;
    letter-spacing: 3px;
    color: #B8A99A;
    font-weight: 500;
    margin-bottom: 4px;
  }

  .title {
    font-size: 20px;
    font-weight: bold;
    color: var(--morandi-primary);
  }

  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 24px;
    font-size: 13px;
  }

  .info-row {
    display: flex;
  }

  .info-row.full {
    grid-column: span 2;
  }

  .info-label {
    font-weight: 600;
    width: 80px;
    flex-shrink: 0;
  }

  .info-value {
    flex: 1;
    border-bottom: 1px solid #ccc;
    padding-bottom: 2px;
  }

  .section-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--morandi-primary);
    margin-bottom: 8px;
  }

  .items-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    border: 1px solid #E5E7EB;
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 20px;
    font-size: 13px;
  }

  .items-table th {
    background-color: #FAF7F2;
    padding: 10px 12px;
    text-align: left;
    font-weight: 600;
    color: var(--morandi-primary);
    border-bottom: 1px solid #E5E7EB;
  }

  .items-table th:not(:first-child) {
    border-left: 1px solid #E5E7EB;
  }

  .items-table td {
    padding: 8px 12px;
    color: #4B5563;
    border-bottom: 1px solid #E5E7EB;
  }

  .items-table td:not(:first-child) {
    border-left: 1px solid #E5E7EB;
  }

  .items-table tr:last-child td {
    border-bottom: none;
  }

  .text-center { text-align: center; }
  .text-right { text-align: right; }
  .font-bold { font-weight: 600; color: var(--morandi-primary); }

  .summary-box {
    background-color: #FAF7F2;
    border: 1px solid #E5E7EB;
    border-radius: 8px;
    padding: 12px 16px;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 32px;
    margin-bottom: 20px;
  }

  .summary-item {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .summary-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--morandi-primary);
  }

  .summary-value {
    font-size: 18px;
    font-weight: bold;
    color: var(--morandi-primary);
  }

  .summary-value.red { color: #DC2626; }
  .summary-value.green { color: #059669; }

  .divider {
    width: 1px;
    height: 24px;
    background-color: #D1D5DB;
  }

  .payment-section {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    padding-top: 16px;
    border-top: 1px solid #F3F4F6;
    margin-bottom: 16px;
    font-size: 13px;
  }

  .payment-title {
    font-weight: 600;
    color: var(--morandi-primary);
    margin-bottom: 8px;
  }

  .payment-info {
    color: #4B5563;
    line-height: 1.8;
  }

  .payment-info .warning {
    color: #DC2626;
    font-weight: 600;
  }

  .payment-info .note {
    font-size: 11px;
    color: #9CA3AF;
    margin-top: 8px;
  }

  .receipt-section {
    padding-top: 16px;
    border-top: 1px solid #F3F4F6;
    margin-bottom: 24px;
    font-size: 13px;
  }

  .receipt-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-top: 8px;
  }

  .receipt-row {
    display: flex;
  }

  .receipt-label {
    font-weight: 600;
    color: #4B5563;
    width: 130px;
    flex-shrink: 0;
  }

  .receipt-value {
    flex: 1;
    border-bottom: 1px solid #E5E7EB;
  }

  .footer {
    margin-top: 40px;
    padding-top: 16px;
    border-top: 1px solid #F3F4F6;
    text-align: center;
  }

  .footer-slogan {
    font-size: 13px;
    font-style: italic;
    color: #9CA3AF;
    margin-bottom: 8px;
  }

  .footer-copyright {
    font-size: 11px;
    color: #D1D5DB;
  }
`
