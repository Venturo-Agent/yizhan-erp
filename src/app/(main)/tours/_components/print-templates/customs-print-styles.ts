/**
 * CUSTOMS_PRINT_STYLES - 入境卡 + 海關單列印用 CSS
 *
 * 紙張尺寸：
 * - 入境卡：16.3 × 9.3 cm（橫式 landscape）
 * - 海關單：21 × 9 cm（直式 portrait）
 */

export const CUSTOMS_PRINT_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --primary: #1a1a2e;
    --accent: #16213e;
    --linen: #FAFAFA;
    --text: #111;
    --text-light: #555;
    --text-muted: #999;
    --border: #333;
    --fill: #f5f5f5;
    --fill-light: #e8e8e8;
  }

  body {
    font-family: 'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', sans-serif;
    background: #f0f0f0;
    color: var(--text);
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  /* ============================================================
     入境卡（橫式，16.3 × 9.3 cm）
     ============================================================ */
  @page arrival-card {
    size: 16.3cm 9.3cm landscape;
    margin: 0;
  }

  .arrival-card {
    width: 16.3cm;
    height: 9.3cm;
    background: var(--linen);
    position: relative;
    overflow: hidden;
  }

  .arrival-card .watermark {
    position: absolute;
    bottom: 10px;
    right: 8px;
    opacity: 0.06;
    pointer-events: none;
  }
  .arrival-card .watermark img {
    width: 120px;
    height: auto;
  }

  /* 頂部：姓 / 名 */
  .arrival-card .top-row {
    display: flex;
    border-bottom: 1px solid var(--border);
  }
  .arrival-card .top-row .field {
    flex: 1;
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
  }
  .arrival-card .top-row .field:last-child {
    border-right: none;
  }
  .arrival-card .field-label {
    font-size: 6px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--text-muted);
    padding: 3px 5px 2px;
    border-bottom: 1px solid var(--border);
    background: var(--fill-light);
  }
  .arrival-card .field-value {
    font-size: 10px;
    font-weight: 700;
    color: var(--text);
    padding: 4px 5px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    min-height: 16px;
  }

  /* 第二列：生日 + TAIWAN + TAIPEI */
  .arrival-card .info-row {
    display: flex;
    border-bottom: 1px solid var(--border);
  }
  .arrival-card .info-row .field {
    display: flex;
    flex-direction: column;
  }
  .arrival-card .info-row .field-label {
    font-size: 6px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--text-muted);
    padding: 3px 5px 2px;
    border-bottom: 1px solid var(--border);
    border-right: 1px solid var(--border);
    background: var(--fill-light);
  }
  .arrival-card .info-row .field:last-child .field-label {
    border-right: none;
  }

  /* 生日格子（每個數字一格） */
  .arrival-card .birth-grid {
    display: flex;
    border-right: 1px solid var(--border);
  }
  .arrival-card .birth-digit {
    width: 10px;
    text-align: center;
    font-size: 9px;
    font-weight: 700;
    padding: 4px 0;
    border-right: 1px solid var(--border);
    line-height: 1.4;
  }
  .arrival-card .birth-digit:last-child {
    border-right: none;
  }

  /* 目的地格 */
  .arrival-card .dest-cell {
    font-size: 6px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--text-muted);
    padding: 3px 5px 2px;
    border-bottom: 1px solid var(--border);
    background: var(--fill-light);
    border-right: 1px solid var(--border);
  }
  .arrival-card .dest-cell:last-child {
    border-right: none;
  }

  /* 航班格 */
  .arrival-card .flight-cell {
    font-size: 6px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--text-muted);
    padding: 3px 5px 2px;
    border-bottom: 1px solid var(--border);
    background: var(--fill-light);
    border-right: 1px solid var(--border);
  }
  .arrival-card .flight-cell:last-child {
    border-right: none;
  }

  /* 航班值格 */
  .arrival-card .flight-value {
    font-size: 9px;
    font-weight: 700;
    padding: 4px 5px;
    border-right: 1px solid var(--border);
    letter-spacing: 1px;
  }
  .arrival-card .flight-value:last-child {
    border-right: none;
  }

  /* 第三列：V / V / 航班 */
  .arrival-card .v-row {
    display: flex;
    border-bottom: 1px solid var(--border);
  }
  .arrival-card .v-cell {
    flex: 1;
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--border);
  }
  .arrival-card .v-cell:last-child {
    border-right: none;
  }

  /* 第四列：5 日 */
  .arrival-card .date-row {
    display: flex;
  }
  .arrival-card .date-cell {
    flex: 1;
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--border);
  }
  .arrival-card .date-cell:last-child {
    border-right: none;
  }

  /* 底部：地址 / 電話 */
  .arrival-card .footer-row {
    display: flex;
    border-top: 1px solid var(--border);
  }
  .arrival-card .footer-row .field {
    flex: 1;
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--border);
    font-size: 7px;
    color: var(--text-light);
    padding: 3px 5px;
  }
  .arrival-card .footer-row .field:last-child {
    border-right: none;
  }
  .arrival-card .footer-row .field-label {
    font-size: 5.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--text-muted);
    margin-bottom: 2px;
  }
  .arrival-card .footer-row .field-value {
    font-size: 7px;
    line-height: 1.4;
  }

  /* ============================================================
     海關單（直式，21 × 9 cm）
     ============================================================ */
  @page customs-form {
    size: 21cm 9cm portrait;
    margin: 0;
  }

  .customs-form {
    width: 21cm;
    height: 9cm;
    background: var(--linen);
    position: relative;
    overflow: hidden;
  }

  .customs-form .watermark {
    position: absolute;
    bottom: 8px;
    right: 8px;
    opacity: 0.06;
    pointer-events: none;
  }
  .customs-form .watermark img {
    width: 120px;
    height: auto;
  }

  /* 航班列 */
  .customs-form .flight-row {
    display: flex;
    border-bottom: 1px solid var(--border);
    background: var(--fill);
  }
  .customs-form .flight-row .cell {
    font-size: 7px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--text-muted);
    padding: 4px 6px;
    border-right: 1px solid var(--border);
  }
  .customs-form .flight-row .cell:last-child {
    border-right: none;
  }
  .customs-form .flight-row .cell-value {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 2px;
    color: var(--text);
  }

  /* 日期格（年/月/日） */
  .customs-form .date-row {
    display: flex;
    border-bottom: 1px solid var(--border);
  }
  .customs-form .date-row .field {
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--border);
  }
  .customs-form .date-row .field:last-child {
    border-right: none;
  }
  .customs-form .date-row .field-label {
    font-size: 6px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--text-muted);
    padding: 3px 6px 2px;
    border-bottom: 1px solid var(--border);
    background: var(--fill-light);
  }
  /* 每個數字一格的格線 */
  .customs-form .digit-row {
    display: flex;
  }
  .customs-form .digit {
    width: 8px;
    text-align: center;
    font-size: 9px;
    font-weight: 700;
    padding: 4px 0;
    border-right: 1px solid var(--border);
    line-height: 1.4;
  }
  .customs-form .digit:last-child {
    border-right: none;
  }
  /* 沒有 digit 的年份用大格 */
  .customs-form .digit-row.year .digit {
    width: 10px;
  }

  /* 姓名列 */
  .customs-form .name-row {
    display: flex;
    border-bottom: 1px solid var(--border);
  }
  .customs-form .name-row .label-cell {
    font-size: 6px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--text-muted);
    padding: 3px 6px 2px;
    border-right: 1px solid var(--border);
    background: var(--fill-light);
    width: 2cm;
    flex-shrink: 0;
  }
  .customs-form .name-row .value-cell {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    padding: 4px 6px;
    color: var(--text);
  }

  /* 護照號碼列 */
  .customs-form .passport-row {
    display: flex;
    border-bottom: 1px solid var(--border);
  }
  .customs-form .passport-row .label-cell {
    font-size: 6px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--text-muted);
    padding: 3px 6px 2px;
    border-right: 1px solid var(--border);
    background: var(--fill-light);
    width: 2cm;
    flex-shrink: 0;
  }
  .customs-form .passport-row .value-cell {
    display: flex;
    flex: 1;
  }
  /* 每個護照數字一格 */
  .customs-form .passport-digit {
    width: 14px;
    text-align: center;
    font-size: 11px;
    font-weight: 700;
    padding: 4px 0;
    border-right: 1px solid var(--border);
    letter-spacing: 0;
    line-height: 1.4;
  }
  .customs-form .passport-digit:last-child {
    border-right: none;
  }

  /* 地址列 */
  .customs-form .address-row {
    display: flex;
    border-bottom: 1px solid var(--border);
  }
  .customs-form .address-row .label-cell {
    font-size: 6px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--text-muted);
    padding: 3px 6px 2px;
    border-right: 1px solid var(--border);
    background: var(--fill-light);
    width: 2cm;
    flex-shrink: 0;
  }
  .customs-form .address-row .value-cell {
    font-size: 8px;
    line-height: 1.5;
    color: var(--text-light);
    padding: 3px 6px;
    flex: 1;
  }

  /* 底部：目的地 + 電話 */
  .customs-form .bottom-row {
    display: flex;
  }
  .customs-form .bottom-row .cell {
    flex: 1;
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--border);
    padding: 3px 6px;
  }
  .customs-form .bottom-row .cell:last-child {
    border-right: none;
  }
  .customs-form .bottom-row .cell-label {
    font-size: 5.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--text-muted);
    margin-bottom: 2px;
  }
  .customs-form .bottom-row .cell-value {
    font-size: 7.5px;
    line-height: 1.4;
    color: var(--text-light);
  }

  /* ============================================================
     Print media — 每一張卡單獨一頁
     ============================================================ */
  @media print {
    body { background: white; }

    .arrival-card {
      width: 16.3cm;
      height: 9.3cm;
      box-shadow: none;
      margin: 0;
      page-break-after: always;
      page: arrival-card;
    }
    .arrival-card + .arrival-card { page-break-before: always; }

    .customs-form {
      width: 21cm;
      height: 9cm;
      box-shadow: none;
      margin: 0;
      page-break-after: always;
      page: customs-form;
    }
    .customs-form + .customs-form { page-break-before: always; }
  }
`