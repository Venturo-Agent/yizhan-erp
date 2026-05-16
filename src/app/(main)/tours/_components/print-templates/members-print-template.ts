import type { Tour } from '@/stores/types'
import type { OrderMember, ExportColumnsConfig } from '@/app/(main)/orders/_types/order-member.types'
import { COLUMN_LABELS } from '../tour-print-constants'

const COMPONENT_LABELS = {
  TH_SEQUENCE: '序',
} as const

interface MembersPrintOptions {
  tour: Tour
  members: OrderMember[]
  columns: ExportColumnsConfig
}

export function generateMembersPrintContent({
  tour,
  members,
  columns,
}: MembersPrintOptions): string {
  const selectedColumns = Object.entries(columns)
    .filter(([, selected]) => selected)
    .map(([key]) => key as keyof ExportColumnsConfig)

  const tableRows = members
    .map((member, index) => {
      const cells = selectedColumns
        .map(col => {
          let value = ''
          switch (col) {
            case 'identity':
              value = member.identity || ''
              break
            case 'chinese_name':
              value = member.chinese_name || ''
              break
            case 'passport_name':
              value = member.passport_name || ''
              break
            case 'birth_date':
              value = member.birth_date || ''
              break
            case 'gender':
              value = member.gender === 'M' ? '男' : member.gender === 'F' ? '女' : ''
              break
            case 'id_number':
              value = member.id_number || ''
              break
            case 'passport_number':
              value = member.passport_number || ''
              break
            case 'passport_expiry':
              value = member.passport_expiry || ''
              break
            case 'special_meal':
              value = member.special_meal || ''
              break
            case 'total_payable':
              value = member.total_payable?.toLocaleString() || ''
              break
            case 'deposit_amount':
              value = member.deposit_amount?.toLocaleString() || ''
              break
            case 'balance':
              value = member.balance_amount?.toLocaleString() || ''
              break
            case 'remarks':
              value = member.remarks || ''
              break
          }
          return `<td style="border: 1px solid #ddd; padding: 8px;">${value}</td>`
        })
        .join('')

      return `<tr><td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${index + 1}</td>${cells}</tr>`
    })
    .join('')

  const headerCells = selectedColumns
    .map(
      col =>
        `<th style="border: 1px solid #ddd; padding: 8px; background: #f5f5f5;">${COLUMN_LABELS[col]}</th>`
    )
    .join('')

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>成員名單 - ${tour.code}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          table { border-collapse: collapse; width: 100%; font-size: 12px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f5f5f5; }
          h1 { font-size: 18px; margin-bottom: 10px; }
          .info { font-size: 12px; color: var(--morandi-secondary); margin-bottom: 15px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>成員名單 - ${tour.code} ${tour.name}</h1>
        <div class="info">
          出發日期：${tour.departure_date || '未設定'} | 總人數：${members.length} 人
        </div>
        <table>
          <thead>
            <tr>
              <th style="border: 1px solid #ddd; padding: 8px; background: #f5f5f5; width: 40px;">${COMPONENT_LABELS.TH_SEQUENCE}</th>
              ${headerCells}
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body>
    </html>
  `
}
