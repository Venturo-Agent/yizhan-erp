/**
 * FLIGHT_PRINT_STYLES - 航班列印用 CSS 字串
 * （從 flight-print-template.ts 抽離，保持主檔案可讀性）
 */
export const FLIGHT_PRINT_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@200..800&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --primary: #242d51;
    --primary-light: rgba(36, 45, 81, 0.05);
    --primary-border: rgba(36, 45, 81, 0.15);
    --accent: #E3D9C6;
    --accent-light: rgba(227, 217, 198, 0.1);
    --linen: #FCFBF9;
    --text: #131316;
    --text-light: var(--morandi-secondary);
    --text-muted: #999;
    --text-faint: #bbb;
    --border: #e8e4dc;
  }

  @page { size: A4; margin: 0; }

  body {
    font-family: 'Noto Sans TC', 'Manrope', sans-serif;
    background: #f0f0f0;
    color: var(--text);
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  .page {
    width: 210mm;
    min-height: 297mm;
    background: var(--linen);
    margin: 20px auto;
    padding: 48px 56px;
    position: relative;
    overflow: hidden;
    box-shadow: 0 4px 24px rgba(0,0,0,0.12);
    display: flex;
    flex-direction: column;
  }

  /* Watermark */
  .watermark {
    position: absolute;
    right: -195px;
    bottom: 420px;
    pointer-events: none;
    z-index: 0;
    opacity: 0.08;
    transform: rotate(270deg);
    transform-origin: center;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color: var(--primary);
  }
  .watermark img { width: 650px; height: auto; }

  /* Header */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 28px;
    border-bottom: 1.5px solid var(--accent);
    margin-bottom: 28px;
    position: relative;
    z-index: 1;
  }
  .header-left {
    display: flex;
    gap: 20px;
    align-items: center;
  }
  .logo-box {
    width: 64px;
    height: 64px;
    background: #E5A100;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .logo-letter {
    font-family: 'Manrope', sans-serif;
    font-size: 38px;
    font-weight: 800;
    color: white;
    line-height: 1;
  }
  .company-info h1 {
    font-size: 22px;
    font-weight: 700;
    color: var(--primary);
    letter-spacing: -0.5px;
    margin-bottom: 4px;
  }
  .company-info p {
    font-size: 10px;
    color: var(--text-muted);
    line-height: 1.7;
  }

  /* Passenger Info */
  .passenger-row {
    display: flex;
    gap: 16px;
    padding-bottom: 20px;
    border-bottom: 1px solid rgba(227, 217, 198, 0.5);
    margin-bottom: 28px;
    position: relative;
    z-index: 1;
  }
  .info-cell { flex: 1; }
  .info-cell .label {
    font-size: 8px;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 2px;
    margin-bottom: 4px;
  }
  .info-cell .value {
    font-size: 18px;
    font-weight: 700;
    color: var(--primary);
    letter-spacing: 0.5px;
  }
  .info-cell .pnr-value {
    letter-spacing: 3px;
    font-family: 'Manrope', monospace;
  }
  .info-cell .ticket-value {
    font-size: 15px;
    letter-spacing: 1px;
  }

  /* Section Title */
  .section-title {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 20px;
    position: relative;
    z-index: 1;
  }
  .section-title .icon {
    font-size: 18px;
    color: var(--primary);
  }
  .section-title .icon svg {
    width: 18px;
    height: 18px;
    fill: var(--primary);
  }
  .section-title h2 {
    font-size: 13px;
    font-weight: 700;
    color: var(--primary);
    text-transform: uppercase;
    letter-spacing: 3px;
  }

  /* Flight Card */
  .flight-card {
    background: white;
    border: 1px solid var(--accent);
    border-radius: 6px;
    overflow: hidden;
    margin-bottom: 20px;
    position: relative;
    z-index: 1;
  }
  .flight-card-header {
    background: var(--accent-light);
    padding: 10px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--accent);
  }
  .flight-card-header-left {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .segment-badge {
    background: var(--primary);
    color: white;
    font-size: 8px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 3px;
    letter-spacing: 1px;
  }
  .flight-airline {
    font-size: 13px;
    font-weight: 700;
    color: var(--primary);
  }
  .flight-class {
    font-size: 11px;
    color: var(--text-light);
  }
  .flight-card-body {
    padding: 24px 28px;
    display: flex;
    align-items: center;
  }
  .flight-endpoint { width: 140px; }
  .flight-endpoint.departure { text-align: left; }
  .flight-endpoint.arrival { text-align: right; }
  .flight-time {
    font-family: 'Manrope', sans-serif;
    font-size: 36px;
    font-weight: 300;
    color: var(--primary);
    line-height: 1;
    margin-bottom: 6px;
  }
  .flight-city {
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
  }
  .flight-detail {
    font-size: 10px;
    color: var(--text-muted);
    margin-top: 4px;
    line-height: 1.5;
  }
  .flight-middle {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0 16px;
  }
  .duration-label {
    font-size: 9px;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 8px;
  }
  .flight-path {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
  }
  .path-line {
    flex: 1;
    height: 2px;
    background: var(--accent);
    position: relative;
  }
  .path-dot-left::before {
    content: '';
    position: absolute;
    left: -3px;
    top: -3px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent);
  }
  .path-dot-right::after {
    content: '';
    position: absolute;
    right: -3px;
    top: -3px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent);
  }
  .path-icon {
    color: var(--accent);
  }
  .path-icon svg {
    width: 16px;
    height: 16px;
    fill: var(--accent);
    transform: rotate(0deg);
  }
  .flight-type {
    font-size: 9px;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  /* Info Grid */
  .info-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 28px;
    position: relative;
    z-index: 1;
  }
  .info-box {
    padding: 14px 16px;
    background: var(--primary-light);
    border: 1px solid var(--primary-border);
    border-radius: 4px;
  }
  .info-box .label {
    font-size: 7px;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 2px;
    margin-bottom: 6px;
  }
  .info-box .value {
    font-size: 12px;
    font-weight: 700;
    color: var(--primary);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  /* SSR Tags */
  .ssr-section {
    margin-bottom: 28px;
    position: relative;
    z-index: 1;
  }
  .ssr-tag {
    display: inline-block;
    background: var(--accent-light);
    border: 1px solid var(--accent);
    padding: 4px 12px;
    border-radius: 3px;
    font-size: 9px;
    color: var(--text-light);
    margin-right: 8px;
    margin-bottom: 6px;
  }

  /* Notice */
  .notice {
    background: #f8f7f5;
    border: 1px solid #e8e4dc;
    border-radius: 6px;
    padding: 20px 24px;
    margin-bottom: 28px;
    position: relative;
    z-index: 1;
  }
  .notice h4 {
    font-size: 9px;
    font-weight: 700;
    color: var(--primary);
    text-transform: uppercase;
    letter-spacing: 2px;
    margin-bottom: 10px;
  }
  .notice ul {
    list-style: disc;
    padding-left: 16px;
  }
  .notice li {
    font-size: 9px;
    color: var(--text-light);
    line-height: 1.7;
    margin-bottom: 3px;
  }

  /* Footer */
  .footer {
    margin-top: auto;
    padding-top: 24px;
    border-top: 1.5px solid var(--accent);
    text-align: center;
    position: relative;
    z-index: 1;
  }
  .footer-notice {
    font-size: 9px;
    color: var(--text-muted);
    margin-bottom: 8px;
  }
  .footer-contact {
    display: flex;
    justify-content: center;
    gap: 24px;
    font-size: 8px;
    color: var(--text-faint);
  }

  @media print {
    body { background: white; }
    .page {
      box-shadow: none;
      margin: 0;
      width: 100%;
      padding: 40px 50px;
    }
    .page + .page { page-break-before: always; }
  }
`
