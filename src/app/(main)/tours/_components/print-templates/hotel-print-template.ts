import type { Tour } from '@/stores/types'
import type { OrderMember } from '@/app/(main)/orders/_types/order-member.types'
import { getCompanyInfo } from '@/lib/workspace-company-info'

const COMPONENT_LABELS = {
  HOTEL_CONFIRMATION: '住宿確認單',
  TH_HOTEL_NAME: '飯店名稱',
  TH_CHECKIN_DATE: '入住日期',
  TH_CHECKOUT_DATE: '退房日期',
} as const

interface HotelPrintOptions {
  tour: Tour
  members: OrderMember[]
}

export function generateHotelPrintContent({ tour, members }: HotelPrintOptions): string {
  const pages = members
    .map((member, index) => {
      const guestName = member.passport_name?.toUpperCase() || member.chinese_name || '未知'
      const hotels: { name: string; checkin: string; checkout: string }[] = []

      if (member.hotel_1_name) {
        hotels.push({
          name: member.hotel_1_name,
          checkin: member.hotel_1_checkin || '-',
          checkout: member.hotel_1_checkout || '-',
        })
      }
      if (member.hotel_2_name) {
        hotels.push({
          name: member.hotel_2_name,
          checkin: member.hotel_2_checkin || '-',
          checkout: member.hotel_2_checkout || '-',
        })
      }

      const hotelRows =
        hotels
          .map(
            h => `
        <tr>
          <td style="padding: 12px; border: 1px solid #ddd;">${h.name}</td>
          <td style="padding: 12px; border: 1px solid #ddd; text-align: center;">${h.checkin}</td>
          <td style="padding: 12px; border: 1px solid #ddd; text-align: center;">${h.checkout}</td>
        </tr>
      `
          )
          .join('') ||
        '<tr><td colspan="3" style="padding: 20px; text-align: center; color: #999;">尚未設定住宿資訊</td></tr>'

      return `
      <div class="page" style="${index > 0 ? 'page-break-before: always;' : ''}">
        <div class="header">
          <div class="company">${getCompanyInfo().fullName}</div>
          <div class="address">台北市大同區重慶北路一段67號八樓之二</div>
        </div>
        <h2>${COMPONENT_LABELS.HOTEL_CONFIRMATION}</h2>
        <div class="info-row">
          <span>團號: ${tour.code}</span>
          <span>行程: ${tour.name}</span>
        </div>
        <div class="guest-info">
          <strong>旅客姓名:</strong> ${guestName}
        </div>
        <table class="hotel-table">
          <thead>
            <tr>
              <th>${COMPONENT_LABELS.TH_HOTEL_NAME}</th>
              <th style="width: 120px;">${COMPONENT_LABELS.TH_CHECKIN_DATE}</th>
              <th style="width: 120px;">${COMPONENT_LABELS.TH_CHECKOUT_DATE}</th>
            </tr>
          </thead>
          <tbody>${hotelRows}</tbody>
        </table>
        <div class="notice">
          **** 此確認單僅供參考，實際訂房資訊以飯店確認為準 ****
        </div>
      </div>
    `
    })
    .join('')

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>住宿確認單 - ${tour.code}</title>
        <style>
          body { font-family: 'Microsoft JhengHei', Arial, sans-serif; padding: 20px; font-size: 13px; }
          .page { padding: 20px; }
          .header { margin-bottom: 20px; }
          .company { font-size: 18px; font-weight: bold; }
          .address { font-size: 12px; color: var(--morandi-secondary); margin-top: 4px; }
          h2 { text-align: center; margin: 30px 0 20px; font-size: 20px; }
          .info-row { display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 14px; }
          .guest-info { padding: 15px; background: #f9f9f9; margin-bottom: 20px; line-height: 1.8; }
          .hotel-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .hotel-table th { background: #f0f0f0; padding: 12px; text-align: left; border: 1px solid #ddd; }
          .notice { text-align: center; color: #999; font-size: 11px; margin-top: 30px; }
          @media print { body { padding: 0; } .page { padding: 15mm; } }
        </style>
      </head>
      <body>${pages}</body>
    </html>
  `
}
