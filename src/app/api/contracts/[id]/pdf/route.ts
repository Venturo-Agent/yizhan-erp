import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api-client'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'

const PAGE_LABELS = {
  CONTRACT_TITLE: '旅遊定型化契約',
  TOUR_INFO: '行程資訊',
  CUSTOMER_INFO: '旅客資訊',
  CONTRACT_CONTENT: '合約內容',
  SIGNATURES: '簽署',
} as const

/**
 * 把使用者輸入字串 escape 成 HTML-safe 文字、避免合約欄位（旅客姓名 / 合約內容 / 簽名等）
 * 被塞入 <script> 後在列印 HTML / PDF 時觸發 stored XSS。
 */
function escapeHtml(input: unknown): string {
  if (input === null || input === undefined) return ''
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * 簽名 data URL 白名單驗證、防止注入 javascript: 或外部 URL
 */
function safeSignatureSrc(input: unknown): string {
  if (typeof input !== 'string') return ''
  if (!/^data:image\/(png|jpeg|jpg|gif|svg\+xml);base64,/.test(input)) return ''
  return input
}

/**
 * 合約 PDF 下載 API
 * GET /api/contracts/[id]/pdf
 *
 * 回傳合約的 PDF 版本（含簽名）
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireCapability(CAPABILITIES.TOURS_CONTRACT_READ)
  if (!guard.ok) return guard.response
  const { id } = await params

  try {
    const supabase = await createApiClient()

    // 1. 取得合約資料（RLS 自動過濾）
    const { data: contract, error } = await supabase
      .from('contracts')
      .select(
        `
        *,
        tour:tours(code, name, departure_date, return_date),
        order:orders(order_number, customer_name)
      `
      )
      .eq('id', id)
      .single()

    if (error || !contract) {
      return NextResponse.json({ error: '找不到合約' }, { status: 404 })
    }

    // 2. 檢查是否已簽署
    if (contract.status !== 'signed' && contract.status !== 'completed') {
      return NextResponse.json({ error: '合約尚未簽署' }, { status: 400 })
    }

    // 3. 產生 HTML 內容
    const html = generateContractHTML(contract)

    // 4. 暫時回傳 HTML（之後可用 puppeteer 轉 PDF）
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="contract-${contract.code || id}.html"`,
      },
    })
  } catch {
    return NextResponse.json({ error: '產生 PDF 失敗' }, { status: 500 })
  }
}

/**
 * 產生合約 HTML
 */
function generateContractHTML(contract: Record<string, unknown>): string {
  const tour = contract.tour as Record<string, unknown> | null
  const order = contract.order as Record<string, unknown> | null
  const signatures = contract.signatures as Array<{
    name: string
    signature_data: string
    signed_at: string
  }> | null

  return `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <title>旅遊合約 - ${contract.code || ''}</title>
  <style>
    body {
      font-family: 'Noto Sans TC', sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
      color: #333;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #B8860B;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #B8860B;
      margin: 0;
    }
    .section {
      margin-bottom: 30px;
    }
    .section-title {
      font-size: 18px;
      font-weight: bold;
      color: #B8860B;
      margin-bottom: 10px;
      border-bottom: 1px solid #ddd;
      padding-bottom: 5px;
    }
    .info-row {
      display: flex;
      margin-bottom: 8px;
    }
    .info-label {
      width: 120px;
      color: #666;
    }
    .info-value {
      flex: 1;
    }
    .signatures {
      display: flex;
      justify-content: space-around;
      margin-top: 50px;
    }
    .signature-box {
      text-align: center;
      width: 200px;
    }
    .signature-box img {
      max-width: 180px;
      height: 80px;
      object-fit: contain;
    }
    .signature-name {
      border-top: 1px solid #333;
      padding-top: 10px;
      margin-top: 10px;
    }
    .footer {
      margin-top: 50px;
      text-align: center;
      color: #999;
      font-size: 12px;
    }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(PAGE_LABELS.CONTRACT_TITLE)}</h1>
    <p>合約編號：${escapeHtml(contract.code || contract.id)}</p>
  </div>

  <div class="section">
    <div class="section-title">${escapeHtml(PAGE_LABELS.TOUR_INFO)}</div>
    <div class="info-row">
      <span class="info-label">團號：</span>
      <span class="info-value">${escapeHtml(tour?.code || '-')}</span>
    </div>
    <div class="info-row">
      <span class="info-label">行程名稱：</span>
      <span class="info-value">${escapeHtml(tour?.name || '-')}</span>
    </div>
    <div class="info-row">
      <span class="info-label">出發日期：</span>
      <span class="info-value">${escapeHtml(formatDate(tour?.departure_date as string))}</span>
    </div>
    <div class="info-row">
      <span class="info-label">回程日期：</span>
      <span class="info-value">${escapeHtml(formatDate(tour?.return_date as string))}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">${escapeHtml(PAGE_LABELS.CUSTOMER_INFO)}</div>
    <div class="info-row">
      <span class="info-label">訂單編號：</span>
      <span class="info-value">${escapeHtml(order?.order_number || '-')}</span>
    </div>
    <div class="info-row">
      <span class="info-label">旅客姓名：</span>
      <span class="info-value">${escapeHtml(order?.customer_name || '-')}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">${escapeHtml(PAGE_LABELS.CONTRACT_CONTENT)}</div>
    <div style="white-space: pre-wrap; line-height: 1.8;">
${escapeHtml(contract.content || '（無內容）')}
    </div>
  </div>

  ${
    signatures && signatures.length > 0
      ? `
  <div class="section">
    <div class="section-title">${escapeHtml(PAGE_LABELS.SIGNATURES)}</div>
    <div class="signatures">
      ${signatures
        .map(
          sig => `
        <div class="signature-box">
          <img src="${safeSignatureSrc(sig.signature_data)}" alt="簽名" />
          <div class="signature-name">${escapeHtml(sig.name)}</div>
          <div style="font-size: 12px; color: #666;">
            ${escapeHtml(formatDateTime(sig.signed_at))}
          </div>
        </div>
      `
        )
        .join('')}
    </div>
  </div>
  `
      : ''
  }

  <div class="footer">
    <p>本合約由 Venturo ERP 系統產生</p>
    <p>產生時間：${new Date().toLocaleString('zh-TW')}</p>
  </div>

  <div class="no-print" style="margin-top: 30px; text-align: center;">
    <button onclick="window.print()" style="
      padding: 10px 30px;
      background: #B8860B;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 16px;
    ">列印 / 另存 PDF</button>
  </div>
</body>
</html>
  `
}

function formatDate(date: string | null | undefined): string {
  if (!date) return '-'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDateTime(date: string | null | undefined): string {
  if (!date) return '-'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'
  const datePart = formatDate(date)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${datePart} ${hh}:${mm}`
}
