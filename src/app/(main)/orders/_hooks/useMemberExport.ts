'use client'

import { useState } from 'react'
import { alert } from '@/lib/ui/alert-dialog'
import type { OrderMember } from '@/app/(main)/orders/_types/order-member.types'
type ExportColumns = Record<string, boolean>

export const EXPORT_COLUMN_LABELS: Record<string, string> = {
  identity: '身份',
  chinese_name: '中文姓名',
  passport_name: '護照拼音',
  birth_date: '出生年月日',
  gender: '性別',
  id_number: '身分證號',
  passport_number: '護照號碼',
  passport_expiry: '護照效期',
  special_meal: '飲食禁忌',
  remarks: '備註',
  // 金額相關欄位放最後
  total_payable: '應付金額',
  deposit_amount: '訂金',
  balance: '尾款',
}

const DEFAULT_EXPORT_COLUMNS: ExportColumns = {
  identity: false,
  chinese_name: true,
  passport_name: true,
  birth_date: true,
  gender: true,
  id_number: false,
  passport_number: true,
  passport_expiry: true,
  special_meal: true,
  remarks: false,
  // 金額相關欄位預設關閉
  total_payable: false,
  deposit_amount: false,
  balance: false,
}

export function useMemberExport(members: OrderMember[]) {
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [exportColumns, setExportColumns] = useState<ExportColumns>(DEFAULT_EXPORT_COLUMNS)

  const handleExportPrint = () => {
    const selectedCols = Object.entries(exportColumns)
      .filter(([, selected]) => selected)
      .map(([key]) => key)

    if (selectedCols.length === 0) {
      void alert('請至少選擇一個欄位', 'warning')
      return
    }

    // 建立列印內容
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>成員名單</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: "Microsoft JhengHei", "PingFang TC", sans-serif; padding: 20px; }
          h1 { font-size: 18px; margin-bottom: 15px; text-align: center; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #333; padding: 6px 8px; text-align: left; }
          th { background: #f5f5f5; font-weight: 600; }
          tr:nth-child(even) { background: #fafafa; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          @media print {
            body { padding: 10px; }
            h1 { font-size: 16px; }
            table { font-size: 11px; }
            th, td { padding: 4px 6px; }
          }
        </style>
      </head>
      <body>
        <h1>成員名單（共 ${members.length} 人）</h1>
        <table>
          <thead>
            <tr>
              <th class="text-center" style="width: 40px;">序</th>
              ${selectedCols.map(col => `<th>${EXPORT_COLUMN_LABELS[col]}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${members
              .map(
                (member, idx) => `
              <tr>
                <td class="text-center">${idx + 1}</td>
                ${selectedCols
                  .map(col => {
                    let value = ''
                    if (col === 'gender') {
                      value =
                        member.gender === 'M'
                          ? '男'
                          : member.gender === 'F'
                            ? '女'
                            : '-'
                    } else if (col === 'balance') {
                      value = (
                        (member.total_payable || 0) - (member.deposit_amount || 0)
                      ).toLocaleString()
                    } else if (col === 'total_payable' || col === 'deposit_amount') {
                      const num = member[col as keyof OrderMember] as number
                      value = num ? num.toLocaleString() : '-'
                    } else {
                      value = (member[col as keyof OrderMember] as string) || '-'
                    }
                    const align = ['total_payable', 'deposit_amount', 'balance'].includes(col)
                      ? 'text-right'
                      : ''
                    return `<td class="${align}">${value}</td>`
                  })
                  .join('')}
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </body>
      </html>
    `

    // 開啟列印視窗
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.focus()
      // 等待內容載入後列印
      setTimeout(() => {
        printWindow.print()
      }, 250)
    }

    setIsExportDialogOpen(false)
  }

  const toggleAllColumns = () => {
    const allSelected = Object.values(exportColumns).every(v => v)
    const newValue = !allSelected
    setExportColumns(Object.fromEntries(Object.keys(exportColumns).map(k => [k, newValue])))
  }

  const handleExportExcel = async (tourName?: string) => {
    const selectedCols = Object.entries(exportColumns)
      .filter(([, selected]) => selected)
      .map(([key]) => key)

    if (selectedCols.length === 0) {
      void alert('請至少選擇一個欄位', 'warning')
      return
    }

    // 動態載入 xlsx（避免污染首屏 bundle）
    const XLSX = await import('xlsx')

    // 轉換資料
    const data = members.map((member, idx) => {
      const row: Record<string, string | number> = { 序: idx + 1 }
      selectedCols.forEach(col => {
        const label = EXPORT_COLUMN_LABELS[col]
        if (col === 'gender') {
          row[label] =
            member.gender === 'M'
              ? '男'
              : member.gender === 'F'
                ? '女'
                : ''
        } else if (col === 'balance') {
          row[label] = (member.total_payable || 0) - (member.deposit_amount || 0)
        } else if (col === 'total_payable' || col === 'deposit_amount') {
          row[label] = (member[col as keyof OrderMember] as number) || 0
        } else {
          row[label] = (member[col as keyof OrderMember] as string) || ''
        }
      })
      return row
    })

    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '團員名單')

    // 設定欄寬
    const colWidths = [{ wch: 5 }] // 序號欄
    selectedCols.forEach(col => {
      if (['chinese_name', 'passport_name'].includes(col)) {
        colWidths.push({ wch: 20 })
      } else if (['remarks', 'special_meal'].includes(col)) {
        colWidths.push({ wch: 25 })
      } else if (['total_payable', 'deposit_amount', 'balance'].includes(col)) {
        colWidths.push({ wch: 12 })
      } else {
        colWidths.push({ wch: 15 })
      }
    })
    worksheet['!cols'] = colWidths

    const today = new Date().toISOString().split('T')[0].replace(/-/g, '')
    const fileName = tourName ? `${tourName}_團員名單_${today}.xlsx` : `團員名單_${today}.xlsx`
    XLSX.writeFile(workbook, fileName)

    setIsExportDialogOpen(false)
  }

  return {
    isExportDialogOpen,
    setIsExportDialogOpen,
    exportColumns,
    setExportColumns,
    handleExportPrint,
    handleExportExcel,
    toggleAllColumns,
  }
}
