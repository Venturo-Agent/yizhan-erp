'use client'

import React from 'react'
import { FileSignature, Check, Loader2, ChevronDown, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MORANDI_COLORS } from '@/lib/print'
import { formatDate } from '@/lib/utils/format-date'
import DOMPurify from 'dompurify'

const PAGE_LABELS = {
  ATTACHMENT_MEMBER_LIST_PREFIX: '附件一：簽約團員名單（',
  ATTACHMENT_MEMBER_LIST_SUFFIX: ' 人）',
  ATTACHMENT_ITINERARY: '：簡易行程表',
  ATTACHMENT_NUM_TWO: '附件二',
  ATTACHMENT_NUM_ONE: '附件一',
  COL_INDEX: '序號',
  COL_NAME: '姓名',
  COL_ID_PASSPORT: '身分證字號 / 護照號碼',
  COL_BIRTH_DATE: '出生日期',
  COL_DAYS: '天數',
  COL_ITINERARY: '行程內容',
  MEAL_BREAKFAST: '早餐 ',
  MEAL_LUNCH: '午餐 ',
  MEAL_DINNER: '晚餐 ',
  MEAL_ACCOMMODATION: '住宿 ',
  TOUR_CONTRACT: '旅遊合約',
  SIGNED_BADGE: '已簽署',
  PRINT_CONTRACT: '列印合約',
  READ_FULL_CONTRACT: '請閱讀完整合約內容',
  SCROLL_TO_BOTTOM: '滾動至合約底部後即可簽署',
  PROCEED_TO_SIGN: '我已閱讀，進行電子簽署',
  SIGNED_PREFIX: '已於 ',
  SIGNED_SUFFIX: ' 簽署完成',
  SIGNED_NEED_REVIEW: '簽署完成，請確認合約內容',
} as const

interface ContractMember {
  id: string
  chinese_name: string | null
  id_number: string | null
  birth_date: string | null
}

interface PreviewDayData {
  date?: string
  dayLabel?: string
  title: string
  note?: string
  meals: { breakfast?: string; lunch?: string; dinner?: string }
  accommodation?: string
}

interface ContractPreviewStepProps {
  templateLabel: string
  tourName: string
  contractCode: string
  workspaceName: string
  savedSignature: string | null
  isSigned: boolean
  signedAt?: string | null
  loading: boolean
  error: string | null
  contractHtml: string
  readingProgress: number
  canSign: boolean
  signerAddress: string
  signerIdNumber: string
  signerPhone: string
  includeMemberList?: boolean
  includeItinerary?: boolean
  members: ContractMember[]
  dailyData: PreviewDayData[]
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
  onScroll: () => void
  onProceedToSign: () => void
  onPrint: () => void
}

export function ContractPreviewStep({
  templateLabel,
  tourName,
  contractCode,
  workspaceName,
  savedSignature,
  isSigned,
  signedAt,
  loading,
  error,
  contractHtml,
  readingProgress,
  canSign,
  signerAddress,
  signerIdNumber,
  signerPhone,
  includeMemberList,
  includeItinerary,
  members,
  dailyData,
  scrollContainerRef,
  onScroll,
  onProceedToSign,
  onPrint,
}: ContractPreviewStepProps) {
  return (
    <div className="min-h-screen bg-morandi-container flex flex-col">
      {/* 頂部資訊列 */}
      <div className="bg-card border-b border-border shadow-sm sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              {savedSignature ? (
                <Check className="w-5 h-5 text-morandi-green" />
              ) : (
                <FileSignature className="w-5 h-5 text-status-warning" />
              )}
              <div>
                <div className="font-medium text-morandi-primary flex items-center gap-2">
                  {templateLabel}
                  {savedSignature && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-morandi-green/15 text-morandi-green">
                      {PAGE_LABELS.SIGNED_BADGE}
                    </span>
                  )}
                </div>
                <div className="text-sm text-morandi-muted">
                  {tourName} · {contractCode}
                </div>
              </div>
            </div>
            <div className="text-sm text-morandi-muted">{workspaceName}</div>
          </div>
        </div>

        {/* 閱讀進度條 */}
        <div className="w-full h-1 bg-morandi-container">
          <div
            className="h-full bg-morandi-gold transition-all duration-300"
            style={{ width: `${readingProgress}%` }}
          />
        </div>
      </div>

      {/* 合約內容區（可滾動，像 Word 文件） */}
      <div className="flex-1 overflow-hidden p-4">
        <div className="max-w-4xl mx-auto h-full">
          {loading ? (
            <div className="bg-card rounded-lg shadow-lg h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-morandi-gold" />
            </div>
          ) : error ? (
            <div className="bg-card rounded-lg shadow-lg h-full flex items-center justify-center">
              <div className="text-center text-morandi-red">
                <p>{error}</p>
              </div>
            </div>
          ) : (
            <div
              ref={scrollContainerRef}
              onScroll={onScroll}
              className="bg-card rounded-lg shadow-lg h-full overflow-y-auto"
              style={{ maxHeight: 'calc(100vh - 200px)' }}
            >
              {/* 合約 HTML 內容（含簽名） */}
              <div
                className="p-8"
                dangerouslySetInnerHTML={{
                  __html: (() => {
                    let html = contractHtml
                    // 使用者輸入先 escape、避免 XSS 自我注入
                    const escape = (s: string) =>
                      s
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;')
                        .replace(/'/g, '&#39;')
                    const infoStyle =
                      'font-size:8pt;font-family:"PingFang TC Light",sans-serif;color:black'
                    html = html.replace(
                      '<!--SIGNER_ADDRESS-->',
                      signerAddress
                        ? `<span style="${infoStyle}">${escape(signerAddress)}</span>`
                        : ''
                    )
                    html = html.replace(
                      '<!--SIGNER_ID-->',
                      signerIdNumber
                        ? `<span style="${infoStyle}">${escape(signerIdNumber)}</span>`
                        : ''
                    )
                    html = html.replace(
                      '<!--SIGNER_PHONE-->',
                      signerPhone ? `<span style="${infoStyle}">${escape(signerPhone)}</span>` : ''
                    )
                    // savedSignature 是 data:image/png;base64,... URL、驗證起頭後才塞
                    if (
                      savedSignature &&
                      /^data:image\/(png|jpeg|jpg|svg\+xml);base64,/.test(savedSignature)
                    ) {
                      html = html.replace(
                        '<span id="contract-signature-placeholder"></span>',
                        `<span style="display:inline-block;vertical-align:middle;margin-left:12px;"><img src="${savedSignature}" alt="甲方簽名" style="height:50px;object-fit:contain;vertical-align:middle;" /></span>`
                      )
                    }
                    // 最後整體經過 DOMPurify、防契約範本被注入惡意 script
                    return DOMPurify.sanitize(html, {
                      ADD_TAGS: ['img'],
                      ADD_ATTR: ['style', 'src', 'alt', 'id'],
                      FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
                      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
                    })
                  })(),
                }}
              />

              {/* 附件：團員名單表格 */}
              {includeMemberList && members.length > 1 && (
                <div className="border-t-2 border-border p-8">
                  <h3 className="text-base font-semibold text-morandi-primary mb-4">
                    {PAGE_LABELS.ATTACHMENT_MEMBER_LIST_PREFIX}
                    {members.length}
                    {PAGE_LABELS.ATTACHMENT_MEMBER_LIST_SUFFIX}
                  </h3>
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b-2 border-morandi-muted">
                        <th className="text-left py-2 px-3 font-medium text-morandi-secondary w-10">
                          {PAGE_LABELS.COL_INDEX}
                        </th>
                        <th className="text-left py-2 px-3 font-medium text-morandi-secondary">
                          {PAGE_LABELS.COL_NAME}
                        </th>
                        <th className="text-left py-2 px-3 font-medium text-morandi-secondary">
                          {PAGE_LABELS.COL_ID_PASSPORT}
                        </th>
                        <th className="text-left py-2 px-3 font-medium text-morandi-secondary">
                          {PAGE_LABELS.COL_BIRTH_DATE}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((member, idx) => (
                        <tr key={member.id} className="border-b border-border">
                          <td className="py-2 px-3 text-morandi-muted">{idx + 1}</td>
                          <td className="py-2 px-3 font-medium text-morandi-primary">
                            {member.chinese_name || '-'}
                          </td>
                          <td className="py-2 px-3 text-morandi-primary">
                            {member.id_number || '-'}
                          </td>
                          <td className="py-2 px-3 text-morandi-primary">
                            {member.birth_date ? formatDate(member.birth_date) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 附件：簡易行程表（跟報價單同款式） */}
              {includeItinerary && dailyData.length > 0 && (
                <div className="border-t-2 border-border p-8">
                  <h3 className="text-base font-semibold text-morandi-primary mb-4">
                    {includeMemberList && members.length > 1
                      ? PAGE_LABELS.ATTACHMENT_NUM_TWO
                      : PAGE_LABELS.ATTACHMENT_NUM_ONE}
                    {PAGE_LABELS.ATTACHMENT_ITINERARY}
                  </h3>
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'separate',
                      borderSpacing: 0,
                      fontSize: '0.75rem',
                      borderRadius: '0.5rem',
                      overflow: 'hidden',
                      border: `1px solid ${MORANDI_COLORS.border}`,
                    }}
                  >
                    <thead>
                      <tr>
                        <th
                          style={{
                            padding: '6px 8px',
                            textAlign: 'center',
                            fontWeight: 600,
                            color: 'white',
                            backgroundColor: MORANDI_COLORS.gold,
                            width: '3.125rem',
                          }}
                        >
                          {PAGE_LABELS.COL_DAYS}
                        </th>
                        <th
                          style={{
                            padding: '6px 8px',
                            textAlign: 'left',
                            fontWeight: 600,
                            color: 'white',
                            backgroundColor: MORANDI_COLORS.gold,
                          }}
                        >
                          {PAGE_LABELS.COL_ITINERARY}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyData.map((day, idx) => {
                        const bg = idx % 2 === 0 ? 'var(--card)' : 'var(--morandi-container)'
                        const border = `1px solid ${MORANDI_COLORS.border}`
                        return (
                          <React.Fragment key={idx}>
                            <tr style={{ backgroundColor: bg }}>
                              <td
                                rowSpan={1 + (day.note ? 1 : 0) + 1 + (day.accommodation ? 1 : 0)}
                                style={{
                                  padding: '6px 8px',
                                  textAlign: 'center',
                                  verticalAlign: 'middle',
                                  fontWeight: 600,
                                  color: MORANDI_COLORS.gold,
                                  borderTop: border,
                                  borderRight: border,
                                }}
                              >
                                {day.date || day.dayLabel}
                              </td>
                              <td
                                style={{ padding: '6px 8px', fontWeight: 500, borderTop: border }}
                              >
                                {day.title}
                              </td>
                            </tr>
                            {day.note && (
                              <tr style={{ backgroundColor: bg }}>
                                <td
                                  style={{
                                    padding: '4px 8px',
                                    color: MORANDI_COLORS.gold,
                                    fontSize: '0.6875rem',
                                    borderTop: border,
                                  }}
                                >
                                  ※{day.note}
                                </td>
                              </tr>
                            )}
                            <tr style={{ backgroundColor: bg }}>
                              <td style={{ padding: '4px 0', borderTop: border }}>
                                <div
                                  style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr 1fr',
                                    fontSize: '0.6875rem',
                                  }}
                                >
                                  <div style={{ padding: '0 8px' }}>
                                    <span
                                      style={{ fontWeight: 600, color: MORANDI_COLORS.lightGray }}
                                    >
                                      {PAGE_LABELS.MEAL_BREAKFAST}
                                    </span>
                                    {day.meals.breakfast || 'X'}
                                  </div>
                                  <div style={{ padding: '0 8px', borderLeft: border }}>
                                    <span
                                      style={{ fontWeight: 600, color: MORANDI_COLORS.lightGray }}
                                    >
                                      {PAGE_LABELS.MEAL_LUNCH}
                                    </span>
                                    {day.meals.lunch || 'X'}
                                  </div>
                                  <div style={{ padding: '0 8px', borderLeft: border }}>
                                    <span
                                      style={{ fontWeight: 600, color: MORANDI_COLORS.lightGray }}
                                    >
                                      {PAGE_LABELS.MEAL_DINNER}
                                    </span>
                                    {day.meals.dinner || 'X'}
                                  </div>
                                </div>
                              </td>
                            </tr>
                            {day.accommodation && (
                              <tr style={{ backgroundColor: bg }}>
                                <td
                                  style={{
                                    padding: '4px 8px',
                                    fontSize: '0.6875rem',
                                    borderTop: border,
                                  }}
                                >
                                  <span
                                    style={{ fontWeight: 600, color: MORANDI_COLORS.lightGray }}
                                  >
                                    {PAGE_LABELS.MEAL_ACCOMMODATION}
                                  </span>
                                  {day.accommodation}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 底部按鈕區 */}
      <div className="bg-card border-t border-border shadow-lg px-4 py-4 sticky bottom-0">
        <div className="max-w-4xl mx-auto">
          {savedSignature ? (
            /* 簽署完成：顯示狀態 + 列印按鈕 */
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
              <div className="flex items-center gap-2 text-morandi-green font-medium">
                <Check className="w-5 h-5" />
                {isSigned
                  ? `${PAGE_LABELS.SIGNED_PREFIX}${formatDate(signedAt!)}${PAGE_LABELS.SIGNED_SUFFIX}`
                  : PAGE_LABELS.SIGNED_NEED_REVIEW}
              </div>
              <Button size="lg" variant="soft-gold" onClick={onPrint}>
                <Printer className="w-5 h-5 mr-2" />
                {PAGE_LABELS.PRINT_CONTRACT}
              </Button>
            </div>
          ) : !canSign ? (
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-morandi-muted mb-2">
                <ChevronDown className="w-4 h-4 animate-bounce" />
                <span>{PAGE_LABELS.READ_FULL_CONTRACT}</span>
                <ChevronDown className="w-4 h-4 animate-bounce" />
              </div>
              <p className="text-xs text-morandi-muted">{PAGE_LABELS.SCROLL_TO_BOTTOM}</p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" onClick={onProceedToSign}>
                <FileSignature className="w-5 h-5 mr-2" />
                {PAGE_LABELS.PROCEED_TO_SIGN}
              </Button>
              <Button size="lg" variant="soft-gold" onClick={onPrint}>
                <Printer className="w-5 h-5 mr-2" />
                {PAGE_LABELS.PRINT_CONTRACT}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
