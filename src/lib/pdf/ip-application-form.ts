/**
 * 旅行業代收轉付電子收據加值服務平台 — IP 設定表 PDF 生成
 *
 * 對應藍新科技 API 手冊「附件三 IP 設定表」（頁 72）
 * 傳真至：(02)2286-3306
 *
 * 使用方式（client-side only）：
 *   const { jsPDF } = await import('jspdf')
 *   const doc = new jsPDF({ ... })
 *   await loadChineseFonts(doc)
 *   generateIpApplicationForm(doc, data)
 *   doc.save('IP申請表.pdf')
 */

import type jsPDF from 'jspdf'

export interface IpFormData {
  companyName: string       // 會員名稱（公司名稱）
  taxId: string             // 統一編號
  applicantName: string     // 申請人姓名
  phone: string             // 聯絡電話
  mobile?: string           // 行動電話
  fax?: string              // 傳真號碼
  email?: string            // 電子郵件
  fillDate?: string         // 填寫日期（預設今天）
}

const FIXED_IP = '167.179.97.139'
const NOTE_1 = '相同環境（測試或正式）所設定之IP可適用跨環境之所有API，不需逐一申請。'
const NOTE_2 = 'IP設定可由ERP廠商代為申請，申請人為 VENTURO 漫途旅遊科技 代申請。'

export function generateIpApplicationForm(doc: jsPDF, data: IpFormData): void {
  const today = data.fillDate ?? new Date().toLocaleDateString('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  })

  const W = 210  // A4 寬 mm
  const marginL = 15
  const marginR = 15
  const contentW = W - marginL - marginR
  let y = 15

  // ── 標頭 ──────────────────────────────────────────────
  doc.setFontSize(11)
  doc.setFont('ChironHeiHK', 'bold')
  doc.text('藍新科技股份有限公司', W / 2, y, { align: 'center' })
  y += 6

  doc.setFontSize(10)
  doc.text('旅行業代收轉付電子收據加值服務平台', W / 2, y, { align: 'center' })
  y += 6

  doc.setFontSize(14)
  doc.text('會員資料暨IP申請表', W / 2, y, { align: 'center' })
  y += 8

  // 填寫日期（右對齊）
  doc.setFontSize(9)
  doc.setFont('ChironHeiHK', 'normal')
  doc.text(`填寫日期：${today}`, W - marginR, y, { align: 'right' })
  y += 8

  // ── 基本資料表格 ───────────────────────────────────────
  drawSectionTitle(doc, '一、申請公司基本資料', marginL, y, contentW)
  y += 6

  const fieldRows: [string, string][] = [
    ['統一編號', data.taxId || '（請填寫）'],
    ['會員名稱', data.companyName || '（請填寫）'],
    ['申請人',   data.applicantName || '（請填寫）'],
    ['聯絡電話', data.phone || '（請填寫）'],
    ['行動電話', data.mobile || ''],
    ['傳真號碼', data.fax || '（請填寫）'],
    ['電子郵件', data.email || ''],
  ]

  for (const [label, value] of fieldRows) {
    drawFieldRow(doc, label, value, marginL, y, contentW)
    y += 8
  }

  y += 4

  // ── 所屬公會（留空手填）────────────────────────────────
  drawSectionTitle(doc, '二、所屬公會（請手動勾選）', marginL, y, contentW)
  y += 6

  const assocs = [
    '台北市旅行商業同業公會',   '新北市旅行商業同業公會',   '桃園市旅行商業同業公會',
    '台中市旅行商業同業公會',   '台南市旅行商業同業公會',   '高雄市旅行商業同業公會',
    '金門縣旅行商業同業公會',   '台灣省旅行商業同業公會暨省',  '彰化縣旅行商業同業公會',
    '嘉義縣旅行商業同業公會',   '嘉義市旅行商業同業公會',   '宜蘭縣旅行商業同業公會',
    '新竹市旅行商業同業公會',   '花蓮縣旅行商業同業公會',   '苗栗縣旅行商業同業公會',
    '南投縣旅行商業同業公會',   '屏東縣旅行商業同業公會',   '澎湖縣旅行商業同業公會',
    '台東縣旅行商業同業公會',   '雲林縣旅行商業同業公會',
  ]

  doc.setFontSize(8)
  const colW = contentW / 3
  for (let i = 0; i < assocs.length; i++) {
    const col = i % 3
    const row = Math.floor(i / 3)
    const x = marginL + col * colW
    const ay = y + row * 6
    doc.rect(x + 1, ay - 3.5, 3.5, 3.5)  // checkbox
    doc.text(assocs[i], x + 6, ay, { baseline: 'middle' })
  }

  y += Math.ceil(assocs.length / 3) * 6 + 4

  // ── IP 設定 ────────────────────────────────────────────
  drawSectionTitle(doc, '三、IP 設定', marginL, y, contentW)
  y += 6

  // 注意事項
  doc.setFontSize(8)
  doc.setFont('ChironHeiHK', 'normal')
  doc.text(`注意：${NOTE_1}`, marginL, y)
  y += 5
  doc.text(`      ${NOTE_2}`, marginL, y)
  y += 8

  // IP 表格
  const ipTableX = marginL
  const ipTableW = contentW
  const halfW = ipTableW / 2

  // 測試環境
  doc.setFontSize(9)
  doc.setFont('ChironHeiHK', 'bold')
  doc.text('測試環境 API 串接 IP', ipTableX + halfW / 2, y, { align: 'center' })
  doc.text('正式環境 API 串接 IP', ipTableX + halfW + halfW / 2, y, { align: 'center' })
  y += 5

  doc.setFont('ChironHeiHK', 'normal')
  doc.setFontSize(8)

  for (let i = 1; i <= 5; i++) {
    const ipValue = i === 1 ? FIXED_IP : ''
    // 測試環境
    doc.text(`${i}.`, ipTableX + 2, y)
    doc.rect(ipTableX + 7, y - 4, halfW - 10, 5)
    if (ipValue) doc.text(ipValue, ipTableX + 9, y)
    // 正式環境
    doc.text(`${i}.`, ipTableX + halfW + 2, y)
    doc.rect(ipTableX + halfW + 7, y - 4, halfW - 10, 5)
    if (ipValue) doc.text(ipValue, ipTableX + halfW + 9, y)
    y += 7
  }

  y += 4

  // ── 異動原因（留空）────────────────────────────────────
  drawSectionTitle(doc, '四、異動原因（ERP 代申請，請填寫 IP 設定申請）', marginL, y, contentW)
  y += 10

  // ── 簽章 / 注意事項 ────────────────────────────────────
  drawSectionTitle(doc, '五、承辦人簽名 / 公司章', marginL, y, contentW)
  y += 6
  doc.setFontSize(8)
  doc.text('承辦人簽名：', marginL, y)
  doc.line(marginL + 25, y, marginL + 75, y)
  doc.text('公司大小章：', marginL + 90, y)
  doc.rect(marginL + 115, y - 15, 20, 20)
  y += 12

  // ── 收件資訊 ──────────────────────────────────────────
  doc.setFontSize(8)
  doc.setFont('ChironHeiHK', 'bold')
  doc.text('【提交方式】', marginL, y)
  y += 5
  doc.setFont('ChironHeiHK', 'normal')
  doc.text('傳真：(02) 2286-3306', marginL, y)
  y += 5
  doc.text('郵寄：115 台北市南港區南港路二段 97 號 8 樓「藍新科技(股)有限公司」客服中心', marginL, y)
  y += 5
  doc.text('（填妥後需加蓋公司大小章並由承辦人簽名，方可進行申請）', marginL, y)
}

// ── 輔助函數 ─────────────────────────────────────────────

function drawSectionTitle(doc: jsPDF, title: string, x: number, y: number, w: number): void {
  doc.setFillColor(240, 240, 240)
  doc.rect(x, y - 4, w, 6, 'F')
  doc.setFont('ChironHeiHK', 'bold')
  doc.setFontSize(9)
  doc.text(title, x + 2, y)
}

function drawFieldRow(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  w: number
): void {
  const labelW = 28
  doc.setFont('ChironHeiHK', 'bold')
  doc.setFontSize(9)
  doc.text(label, x, y)
  doc.setFont('ChironHeiHK', 'normal')
  doc.line(x + labelW, y + 1, x + w, y + 1)
  if (value) doc.text(value, x + labelW + 2, y)
}
