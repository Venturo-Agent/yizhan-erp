/**
 * customs-print-template.ts — 入境卡 + 海關單 HTML 產生器
 *
 * 入境卡（Arrival Card）：橫式 16.3 × 9.3 cm
 * 海關單（Customs Form）：直式 21 × 9 cm
 */

import type { Tour } from '@/stores/types'
import type { OrderMember } from '@/app/(main)/orders/_types/order-member.types'
import { CUSTOMS_PRINT_STYLES } from './customs-print-styles'

// ─── Helpers ─────────────────────────────────────────────────

function escapeHtml(str: string | null | undefined): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/** 把護照姓名拆成「姓」和「名」（格式：LAST/FIRST） */
function splitPassportName(name: string | null | undefined): { last: string; first: string } {
  if (!name) return { last: '', first: '' }
  const parts = name.split('/')
  return {
    last: parts[0] || '',
    first: parts[1] || '',
  }
}

/** 把生日 YYYY-MM-DD 拆成數字格 */
function splitBirthDate(dateStr: string | null | undefined): string[] {
  if (!dateStr) return Array(8).fill('')
  // 支援 YYYY-MM-DD 或 YYYYMMDD
  const cleaned = dateStr.replace(/[^0-9]/g, '')
  const padded = cleaned.padStart(8, ' ').slice(0, 8)
  return padded.split('')
}

/** 把護照號碼拆成數字格 */
function splitPassportNumber(pno: string | null | undefined): string[] {
  if (!pno) return Array(9).fill('')
  const cleaned = pno.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  return cleaned.split('').slice(0, 12)
}

/** 格式化航班代號顯示（如 CI-154） */
function formatFlightCode(flight: string | null | undefined): string {
  if (!flight) return ''
  return flight.trim().toUpperCase()
}

// ─── 入境卡 HTML ─────────────────────────────────────────────

function buildArrivalCard(member: OrderMember, tour: Tour): string {
  const { last, first } = splitPassportName(member.passport_name)
  const birthDigits = splitBirthDate(member.birth_date || null)
  const passportDigits = splitPassportNumber(member.passport_number || null)

  // 航班代號：優先用 PNR 中的第一段，否則用 tour 的
  const flightCode = member.pnr
    ? formatFlightCode(member.pnr)
    : formatFlightCode((tour as { outbound_flight?: string }).outbound_flight || null)

  const tourRecord = tour as unknown as Record<string, unknown>
  const destAddress = tourRecord.tour_address ? String(tourRecord.tour_address) : ''

  return `
    <div class="arrival-card">
      <div class="watermark">
        <img src="/corner-logo.png" alt="" />
      </div>

      <!-- 第一列：姓 / 名 -->
      <div class="top-row">
        <div class="field">
          <div class="field-label">Family Name</div>
          <div class="field-value">${escapeHtml(last)}</div>
        </div>
        <div class="field">
          <div class="field-label">Given Names</div>
          <div class="field-value">${escapeHtml(first)}</div>
        </div>
      </div>

      <!-- 第二列：生日 + TAIWAN + TAIPEI -->
      <div class="info-row">
        <div class="field">
          <div class="field-label">Date of Birth</div>
          <div class="birth-grid">
            ${birthDigits.map(d => `<div class="birth-digit">${d}</div>`).join('')}
          </div>
        </div>
        <div class="dest-cell">TAIWAN</div>
        <div class="dest-cell">TAIPEI</div>
      </div>

      <!-- 第三列：V / V / 航班 -->
      <div class="v-row">
        <div class="v-cell">
          <div class="field-label">Nationality</div>
          <div class="flight-value" style="padding: 6px 5px; font-size: 12px;">V</div>
        </div>
        <div class="v-cell">
          <div class="field-label">Sex</div>
          <div class="flight-value">&nbsp;</div>
        </div>
        <div class="v-cell">
          <div class="field-label">Flight No.</div>
          <div class="flight-value">${escapeHtml(flightCode)}</div>
        </div>
      </div>

      <!-- 第四列：5 日（停留天數） -->
      <div class="date-row">
        <div class="date-cell">
          <div class="field-label">Days</div>
          <div class="flight-value">&nbsp;</div>
        </div>
        <div class="date-cell">
          <div class="field-label">Date</div>
          <div class="flight-value">&nbsp;</div>
        </div>
      </div>

      <!-- 底部：地址 / 電話 -->
      <div class="footer-row">
        <div class="field" style="flex: 2;">
          <div class="field-label">Address in Taiwan</div>
          <div class="field-value">${escapeHtml(destAddress)}</div>
        </div>
        <div class="field">
          <div class="field-label">TEL</div>
          <div class="field-value">&nbsp;</div>
        </div>
      </div>
    </div>
  `
}

// ─── 海關單 HTML ─────────────────────────────────────────────

function buildCustomsForm(member: OrderMember, tour: Tour): string {
  const fullName = member.passport_name
    ? member.passport_name.replace('/', ' ').toUpperCase()
    : member.chinese_name || ''

  // 生日拆成年/月/日
  const birthStr = (member.birth_date || '').replace(/[^0-9]/g, '').padStart(8, ' ')
  const birthYear = birthStr.slice(0, 4).split('')
  const birthMonth = birthStr.slice(4, 6).split('')
  const birthDay = birthStr.slice(6, 8).split('')

  // 護照號碼拆成數字格
  const passportCleaned = (member.passport_number || '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
  const passportDigits = passportCleaned.split('').slice(0, 12)
  // 補滿 12 格
  while (passportDigits.length < 12) passportDigits.push('')

  // 航班代號（同入境卡）
  const flightCode = member.pnr
    ? formatFlightCode(member.pnr)
    : formatFlightCode((tour as { outbound_flight?: string }).outbound_flight || null)

  // 目的地地址（待替換）
  const tourRecord2 = tour as unknown as Record<string, unknown>
  const destAddress = tourRecord2.tour_address ? String(tourRecord2.tour_address) : ''

  return `
    <div class="customs-form">
      <div class="watermark">
        <img src="/corner-logo.png" alt="" />
      </div>

      <!-- 航班列：CI-100 / TAIWAN / TAIPEI -->
      <div class="flight-row">
        <div class="cell" style="width: 2.5cm; flex-shrink: 0;">
          <div class="cell-value">${escapeHtml(flightCode)}</div>
        </div>
        <div class="cell" style="width: 1.5cm; flex-shrink: 0;">
          <div class="cell-value">TAIPEI</div>
        </div>
        <div class="cell" style="flex: 1;">
          <div class="cell-value" style="font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted);">STAFF</div>
        </div>
      </div>

      <!-- 日期列：年 / 月 / 日 -->
      <div class="date-row">
        <div class="field">
          <div class="field-label">Year 年</div>
          <div class="digit-row year">
            ${birthYear.map(d => `<div class="digit">${d}</div>`).join('')}
          </div>
        </div>
        <div class="field">
          <div class="field-label">Month 月</div>
          <div class="digit-row">
            ${birthMonth.map(d => `<div class="digit">${d}</div>`).join('')}
          </div>
        </div>
        <div class="field">
          <div class="field-label">Day 日</div>
          <div class="digit-row">
            ${birthDay.map(d => `<div class="digit">${d}</div>`).join('')}
          </div>
        </div>
      </div>

      <!-- 姓名 -->
      <div class="name-row">
        <div class="label-cell">Name 姓名</div>
        <div class="value-cell">${escapeHtml(fullName)}</div>
      </div>

      <!-- 護照號碼 -->
      <div class="passport-row">
        <div class="label-cell">Passport No.<br/>護照號碼</div>
        <div class="value-cell">
          ${passportDigits.map(d => `<div class="passport-digit">${d}</div>`).join('')}
        </div>
      </div>

      <!-- 入住地址 -->
      <div class="address-row">
        <div class="label-cell">Address 住址</div>
        <div class="value-cell">${escapeHtml(destAddress)}</div>
      </div>

      <!-- 底部：目的地 + 電話 -->
      <div class="bottom-row">
        <div class="cell" style="flex: 2;">
          <div class="cell-label">Destination 目的地</div>
          <div class="cell-value">&nbsp;</div>
        </div>
        <div class="cell">
          <div class="cell-label">TEL</div>
          <div class="cell-value">&nbsp;</div>
        </div>
      </div>
    </div>
  `
}

// ─── 主 Export ────────────────────────────────────────────────

interface CustomsPrintOptions {
  tour: Tour
  members: OrderMember[]
  /** 要印哪種卡：'both' | 'arrival' | 'customs' */
  mode?: 'both' | 'arrival' | 'customs'
}

/**
 * 產生入境卡 + 海關單列印 HTML
 * 每人一組（入境卡 + 海關單），中間 page-break
 */
export function generateCustomsPrintContent({
  tour,
  members,
  mode = 'both',
}: CustomsPrintOptions): string {
  const pages: string[] = []

  members.forEach((member, idx) => {
    const isFirst = idx === 0

    if (mode === 'both' || mode === 'arrival') {
      pages.push(
        `<div class="arrival-card"${!isFirst ? ' style="page-break-before: always;"' : ''}>${buildArrivalCard(member, tour).replace(/<\/?div class="arrival-card">/g, '')}</div>`
      )
    }

    if (mode === 'both' || mode === 'customs') {
      pages.push(
        `<div class="customs-form"${mode === 'both' ? ' style="page-break-before: always;"' : ''}>${buildCustomsForm(member, tour).replace(/<\/?div class="customs-form">/g, '')}</div>`
      )
    }
  })

  return `
    <!DOCTYPE html>
    <html lang="zh-TW">
      <head>
        <meta charset="utf-8"/>
        <title>入境卡 / 海關單 - ${escapeHtml(tour.code || '')}</title>
        <style>${CUSTOMS_PRINT_STYLES}</style>
      </head>
      <body>
        ${pages.join('\n')}
      </body>
    </html>
  `
}