import type { Tour } from '@/stores/types'
import type { OrderMember } from '@/app/(main)/orders/_types/order-member.types'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PNR = any
import { getCompanyInfo, getCompanyFooterLine } from '@/lib/workspace-company-info'
import { FLIGHT_PRINT_STYLES } from './flight-print-styles'
import { buildFlightCard, buildTourFlightCard } from './flight-print-cards'
import { getDisplaySSRTags, getMealSSRTags, escapeHtml } from './flight-print-helpers'
import type { EnhancedSSR } from '@/lib/pnr-parser'

// ─── Types ───

interface FlightPrintOptions {
  tour: Tour
  members: OrderMember[]
  pnrData: PNR[]
  getAirportName: (code: string) => string
  getAirlineName: (code: string) => string
}

// ─── Main Export ───

export function generateFlightPrintContent({
  tour,
  members,
  pnrData,
  getAirportName,
  getAirlineName,
}: FlightPrintOptions): string {
  const pages = members
    .map((member, pageIndex) => {
      const formatPassportName = (name: string) => name.toUpperCase().replace('/', ' / ')
      const companyInfo = getCompanyInfo()
      const companyFooter = getCompanyFooterLine()

      const passengerName = member.passport_name
        ? formatPassportName(member.passport_name)
        : member.chinese_name || ''

      const memberPnr = pnrData.find(p => p.record_locator === member.pnr)
      const segments = memberPnr?.segments || []

      // Ticket number: prefer member field, fallback to PNR ticketNumbers
      const ticketNumber = member.ticket_number || ''

      // Build flight cards
      const flightCards: string[] = []
      if (segments.length > 0) {
        segments.forEach((seg: PNR, idx: number) => {
          flightCards.push(
            buildFlightCard(seg, idx, segments.length, memberPnr, getAirportName, getAirlineName)
          )
        })
      } else if (tour.outbound_flight || tour.return_flight) {
        let idx = 0
        const outbound = Array.isArray(tour.outbound_flight)
          ? tour.outbound_flight[0]
          : tour.outbound_flight
        const returnFlt = Array.isArray(tour.return_flight)
          ? tour.return_flight[0]
          : tour.return_flight
        if (outbound) {
          flightCards.push(
            buildTourFlightCard(outbound, tour.departure_date || '', idx, getAirportName)
          )
          idx++
        }
        if (returnFlt) {
          flightCards.push(
            buildTourFlightCard(returnFlt, tour.return_date || '', idx, getAirportName)
          )
        }
      }

      // SSR tags (non-baggage, non-meal)
      const ssrTags = getDisplaySSRTags(memberPnr)
      const mealTags = getMealSSRTags(memberPnr)
      const allDisplayTags = [...mealTags, ...ssrTags]

      const ssrHtml =
        allDisplayTags.length > 0
          ? `
      <div class="ssr-section">
        <div class="section-title" style="margin-bottom: 10px;">
          <h2 style="font-size: 10px;">特殊需求 Special Requests</h2>
        </div>
        ${allDisplayTags
          .map((ssr: EnhancedSSR) => {
            const label = ssr.description
              ? `${escapeHtml(ssr.code)} ${escapeHtml(ssr.description)}`
              : escapeHtml(ssr.raw)
            return `<span class="ssr-tag">${label}</span>`
          })
          .join('')}
      </div>
    `
          : ''

      // Order code
      const orderCode = member.order_code || ''
      const orderInfoHtml = orderCode
        ? `
      <div class="info-grid" style="grid-template-columns: 1fr;">
        <div class="info-box">
          <div class="label">訂單編號</div>
          <div class="value" style="font-size: 12px; letter-spacing: 0.5px;">${escapeHtml(orderCode)}</div>
        </div>
      </div>
    `
        : ''

      // Passenger info cells
      const pnrCode = member.pnr || ''

      return `
      <div class="page"${pageIndex > 0 ? ' style="page-break-before: always;"' : ''}>
        <div class="watermark">
          <img src="/corner-logo.png" alt="" />
        </div>

        <div class="header">
          <div class="header-left">
            ${
              companyInfo.name
                ? `<div class="logo-box">
              <span class="logo-letter">${companyInfo.name.charAt(0)}</span>
            </div>`
                : ''
            }
            <div class="company-info">
              <h1>${escapeHtml(companyInfo.name)}</h1>
              ${
                companyInfo.address || companyInfo.tel || companyInfo.email
                  ? `<p>
                ${companyInfo.address ? `${escapeHtml(companyInfo.address)}<br/>` : ''}
                ${companyInfo.tel ? `TEL ${escapeHtml(companyInfo.tel)}` : ''}${companyInfo.tel && companyInfo.email ? ' | ' : ''}${companyInfo.email ? escapeHtml(companyInfo.email) : ''}
              </p>`
                  : ''
              }
            </div>
          </div>
        </div>

        <div class="passenger-row">
          <div class="info-cell">
            <div class="label">旅客姓名 Passenger</div>
            <div class="value">${escapeHtml(passengerName)}</div>
          </div>
          ${
            pnrCode
              ? `
          <div class="info-cell">
            <div class="label">訂位代號 PNR</div>
            <div class="value pnr-value">${escapeHtml(pnrCode)}</div>
          </div>
          `
              : ''
          }
          ${
            ticketNumber
              ? `
          <div class="info-cell">
            <div class="label">電子票號 E-Ticket</div>
            <div class="value ticket-value">${escapeHtml(ticketNumber)}</div>
          </div>
          `
              : ''
          }
        </div>

        <div class="section-title">
          <span class="icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg></span>
          <h2>航班資訊 Itinerary Details</h2>
        </div>

        ${flightCards.length > 0 ? flightCards.join('') : ''}

        ${orderInfoHtml}
        ${ssrHtml}

        <div class="notice">
          <h4>注意事項 Important Notice</h4>
          <ul>
            ${[
              '本文件僅供參考，實際資訊以航空公司及相關旅遊供應商為準。',
              '請確認姓名與護照完全一致，開票後更名可能無法辦理或需額外付費。',
              '國際線建議提前 3 小時抵達機場辦理報到手續。',
              '日本入境需事先完成 Visit Japan Web 線上申報。',
              '護照效期需超過預定返國日 6 個月以上。',
            ].map(item => `<li>${escapeHtml(item)}</li>`).join('')}
          </ul>
        </div>

        <div class="footer">
          ${companyFooter ? `<div class="footer-notice">${escapeHtml(companyFooter)}</div>` : ''}
          ${
            companyInfo.address || companyInfo.tel || companyInfo.fax || companyInfo.email
              ? `<div class="footer-contact">
            ${companyInfo.address ? `<span>${escapeHtml(companyInfo.address)}</span>` : ''}
            ${companyInfo.tel ? `<span>TEL ${escapeHtml(companyInfo.tel)}</span>` : ''}
            ${companyInfo.fax ? `<span>FAX ${escapeHtml(companyInfo.fax)}</span>` : ''}
            ${companyInfo.email ? `<span>${escapeHtml(companyInfo.email)}</span>` : ''}
          </div>`
              : ''
          }
        </div>
      </div>
    `
    })
    .join('')

  return `
    <!DOCTYPE html>
    <html lang="zh-TW">
      <head>
        <meta charset="utf-8"/>
        <title>電子機票 - ${tour.code || ''}</title>
        <style>${FLIGHT_PRINT_STYLES}</style>
      </head>
      <body>${pages}</body>
    </html>
  `
}
