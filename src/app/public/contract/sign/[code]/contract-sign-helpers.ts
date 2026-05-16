/**
 * contract-sign-helpers.ts
 * 合約簽署頁面的純邏輯 helper（無 JSX / 無 hooks）。
 * 從 ContractSignPage 抽出，讓主檔只保留 state + hooks + render。
 */

import { printHtml, MORANDI_COLORS } from '@/lib/print'
import { formatDate } from '@/lib/utils/format-date'
import DOMPurify from 'dompurify'

const CONTRACT_PRINT_STYLES = `
  <style>
    @media print {
      @page {
        size: A4;
        margin: 15mm 10mm;
      }
      body {
        font-size: 12pt !important;
        line-height: 1.5 !important;
      }
      table {
        page-break-inside: auto;
      }
      tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }
      thead {
        display: table-header-group;
      }
      tfoot {
        display: table-footer-group;
      }
      h1, h2, h3, h4, h5, h6 {
        page-break-after: avoid;
      }
      p {
        orphans: 3;
        widows: 3;
      }
      .page-break {
        page-break-before: always;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
`

const DOMPUR_ALLOWED_TAGS = [
  'html', 'head', 'body', 'style', 'title',
  'div', 'span', 'p', 'br', 'hr',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'ul', 'ol', 'li',
  'strong', 'em', 'b', 'i', 'u',
  'a', 'img',
  'header', 'footer', 'section', 'article',
]

const DOMPUR_ALLOWED_ATTR = [
  'class', 'id', 'style',
  'src', 'alt', 'href', 'target',
  'colspan', 'rowspan', 'width', 'height',
]

interface LoadContractTemplateParams {
  templateFile: string
  contractData: Record<string, unknown>
  signerType: string
  signerName: string
  companyName?: string
  memberIds: string[]
}

/**
 * 抓取合約 HTML 範本、替換變數、插入簽約人資訊佔位符、注入列印樣式、DOMPurify 清洗。
 * 回傳清洗後的 HTML string，或在失敗時 throw Error。
 */
export async function loadContractTemplate({
  templateFile,
  contractData,
  signerType,
  signerName,
  companyName,
  memberIds,
}: LoadContractTemplateParams): Promise<string> {
  const response = await fetch(`/contract-templates/${templateFile}`)
  if (!response.ok) {
    throw new Error('無法載入合約範本')
  }

  let template = await response.text()

  // 替換變數
  const data = contractData || {}
  Object.entries(data).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g')
    const safeValue = String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
    template = template.replace(regex, safeValue)
  })

  // 在「訂約人」區塊的「甲方：」後面插入簽約人名字
  const signerBaseName =
    signerType === 'company' ? companyName || signerName : signerName
  const signerDisplay =
    memberIds?.length > 1
      ? `${signerBaseName} 等 ${memberIds.length} 人`
      : signerBaseName
  if (signerDisplay) {
    // 在最後一個「甲方：」後面插入名字 + 簽名佔位符
    const lastIndex = template.lastIndexOf('甲方：')
    if (lastIndex !== -1) {
      const afterParty = template.indexOf('</span>', lastIndex)
      if (afterParty !== -1) {
        const insertPos = afterParty + '</span>'.length
        template =
          template.slice(0, insertPos) +
          `<span style="font-size:8pt;font-family:'PingFang TC Light',sans-serif;color:black">${signerDisplay}</span>` +
          `<span id="contract-signature-placeholder"></span>` +
          template.slice(insertPos)
      }
    }
  }

  // 在甲方的「住（居）所地址：」「身分證字號（統一編號）：」「電話或傳真：」後面插入 placeholder
  const fieldMap = [
    { label: '住（居）所地址：', placeholder: '<!--SIGNER_ADDRESS-->' },
    { label: '身分證字號（統一編號）：', placeholder: '<!--SIGNER_ID-->' },
    { label: '電話或傳真：', placeholder: '<!--SIGNER_PHONE-->' },
  ]
  // 只替換訂約人區塊中的（從最後一個「甲方：」開始到「乙方：」之間）
  const partyStart = template.lastIndexOf('甲方：')
  const partyEnd = template.indexOf('乙方：', partyStart)
  if (partyStart !== -1 && partyEnd !== -1) {
    let partySection = template.slice(partyStart, partyEnd)
    for (const { label, placeholder } of fieldMap) {
      const labelIdx = partySection.indexOf(label)
      if (labelIdx !== -1) {
        const afterLabel = partySection.indexOf('</span>', labelIdx + label.length)
        if (afterLabel !== -1) {
          const pos = afterLabel + '</span>'.length
          partySection = partySection.slice(0, pos) + placeholder + partySection.slice(pos)
        }
      }
    }
    template = template.slice(0, partyStart) + partySection + template.slice(partyEnd)
  }

  // 加入列印樣式（A4 排版 + 跨頁設定）
  template = CONTRACT_PRINT_STYLES + template

  // 清理 HTML
  return DOMPurify.sanitize(template, {
    ALLOWED_TAGS: DOMPUR_ALLOWED_TAGS,
    ALLOWED_ATTR: DOMPUR_ALLOWED_ATTR,
  })
}

interface ContractMember {
  id: string
  chinese_name: string | null
  id_number: string | null
  birth_date: string | null
}

interface DayData {
  date?: string
  dayLabel?: string
  title: string
  note?: string
  meals: { breakfast?: string; lunch?: string; dinner?: string }
  accommodation?: string
}

interface PrintContractParams {
  contractHtml: string
  tourName: string
  contractCode: string
  signerAddress: string
  signerIdNumber: string
  signerPhone: string
  savedSignature: string | null
  includeMemberList?: boolean
  includeItinerary?: boolean
  members: ContractMember[]
  dailyData: DayData[]
}

/**
 * 組裝列印用 HTML（主合約 + 附件：團員名單 + 行程表）並觸發列印。
 */
export function printContract({
  contractHtml,
  tourName,
  contractCode,
  signerAddress,
  signerIdNumber,
  signerPhone,
  savedSignature,
  includeMemberList,
  includeItinerary,
  members,
  dailyData,
}: PrintContractParams): void {
  // 團員名單 HTML
  let memberListHtml = ''
  if (includeMemberList && members.length > 1) {
    memberListHtml = `
      <div style="page-break-before: always; padding-top: 20px;">
        <h3 style="font-size: 14pt; font-weight: bold; margin-bottom: 12px;">附件一：簽約團員名單（${members.length} 人）</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 10pt;">
          <thead>
            <tr style="border-bottom: 2px solid #333;">
              <th style="text-align: left; padding: 6px 8px; width: 40px;">序號</th>
              <th style="text-align: left; padding: 6px 8px;">姓名</th>
              <th style="text-align: left; padding: 6px 8px;">身分證字號 / 護照號碼</th>
              <th style="text-align: left; padding: 6px 8px;">出生日期</th>
            </tr>
          </thead>
          <tbody>
            ${members
              .map(
                (m, i) => `
              <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 6px 8px;">${i + 1}</td>
                <td style="padding: 6px 8px; font-weight: 500;">${m.chinese_name || '-'}</td>
                <td style="padding: 6px 8px;">${m.id_number || '-'}</td>
                <td style="padding: 6px 8px;">${m.birth_date ? formatDate(m.birth_date) : '-'}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `
  }

  // 行程表 HTML（跟報價單同款式）
  let itineraryHtml = ''
  if (includeItinerary && dailyData.length > 0) {
    const attachmentNum = includeMemberList && members.length > 1 ? '二' : '一'
    const border = `1px solid ${MORANDI_COLORS.border}`
    itineraryHtml = `
      <div style="page-break-before: always; padding-top: 20px;">
        <h3 style="font-size: 14pt; font-weight: bold; margin-bottom: 12px;">附件${attachmentNum}：簡易行程表</h3>
        <table style="width: 100%; border-collapse: separate; border-spacing: 0; font-size: 12px; border-radius: 8px; overflow: hidden; border: ${border};">
          <thead>
            <tr>
              <th style="padding: 6px 8px; text-align: center; font-weight: 600; color: white; background: ${MORANDI_COLORS.gold}; width: 50px;">天數</th>
              <th style="padding: 6px 8px; text-align: left; font-weight: 600; color: white; background: ${MORANDI_COLORS.gold};">行程內容</th>
            </tr>
          </thead>
          <tbody>
            ${dailyData
              .map((day, idx) => {
                const bg = idx % 2 === 0 ? 'var(--card)' : 'var(--morandi-container)'
                return `
                <tr style="background: ${bg};">
                  <td rowspan="${1 + (day.note ? 1 : 0) + 1 + (day.accommodation ? 1 : 0)}" style="padding: 6px 8px; text-align: center; vertical-align: middle; font-weight: 600; color: ${MORANDI_COLORS.gold}; border-top: ${border}; border-right: ${border};">${day.date || day.dayLabel}</td>
                  <td style="padding: 6px 8px; font-weight: 500; border-top: ${border};">${day.title}</td>
                </tr>
                ${day.note ? `<tr style="background: ${bg};"><td style="padding: 4px 8px; color: ${MORANDI_COLORS.gold}; font-size: 11px; border-top: ${border};">※${day.note}</td></tr>` : ''}
                <tr style="background: ${bg};">
                  <td style="padding: 4px 0; border-top: ${border};">
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; font-size: 11px;">
                      <div style="padding: 0 8px;"><b style="color: ${MORANDI_COLORS.lightGray}">早餐 </b>${day.meals.breakfast || 'X'}</div>
                      <div style="padding: 0 8px; border-left: ${border};"><b style="color: ${MORANDI_COLORS.lightGray}">午餐 </b>${day.meals.lunch || 'X'}</div>
                      <div style="padding: 0 8px; border-left: ${border};"><b style="color: ${MORANDI_COLORS.lightGray}">晚餐 </b>${day.meals.dinner || 'X'}</div>
                    </div>
                  </td>
                </tr>
                ${day.accommodation ? `<tr style="background: ${bg};"><td style="padding: 4px 8px; font-size: 11px; border-top: ${border};"><b style="color: ${MORANDI_COLORS.lightGray}">住宿 </b>${day.accommodation}</td></tr>` : ''}
              `
              })
              .join('')}
          </tbody>
        </table>
      </div>
    `
  }

  // 列印時帶入簽約人資訊 + 簽名
  const infoStyle = 'font-size:8pt;font-family:"PingFang TC Light",sans-serif;color:black'
  let printContractHtml = contractHtml
    .replace(
      '<!--SIGNER_ADDRESS-->',
      signerAddress ? `<span style="${infoStyle}">${signerAddress}</span>` : ''
    )
    .replace(
      '<!--SIGNER_ID-->',
      signerIdNumber ? `<span style="${infoStyle}">${signerIdNumber}</span>` : ''
    )
    .replace(
      '<!--SIGNER_PHONE-->',
      signerPhone ? `<span style="${infoStyle}">${signerPhone}</span>` : ''
    )
  if (savedSignature) {
    printContractHtml = printContractHtml.replace(
      '<span id="contract-signature-placeholder"></span>',
      `<span style="display:inline-block;vertical-align:middle;margin-left:12px;"><img src="${savedSignature}" alt="甲方簽名" style="height:50px;object-fit:contain;vertical-align:middle;" /></span>`
    )
  }

  printHtml(printContractHtml + memberListHtml + itineraryHtml, {
    title: `合約 - ${tourName} - ${contractCode}`,
    orientation: 'portrait',
    margin: 15,
    fontSize: 12,
  })
}
