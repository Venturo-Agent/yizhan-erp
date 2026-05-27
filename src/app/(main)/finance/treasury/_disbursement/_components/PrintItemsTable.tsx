'use client'
/**
 * PrintItemsTable
 * 出納單列印預覽 — 明細表格區塊（團體請款 / 公司請款 共用）
 *
 * 特性：
 * - 付款對象和小計用 rowSpan 合併並垂直置中
 * - 每組最多 5 筆，超過由呼叫方 splitLargeGroups 處理
 * - thirdColHeader 用來切換「團名」或「費用類型」欄位 label
 */

import React from 'react'
import { useTranslations } from 'next-intl'
import type { PayForGroup } from '../_utils/printHelpers'
import { splitPayFor } from '../_utils/printHelpers'

// Morandi 色系
const COLORS = {
  gold: '#B8A99A',
  brown: '#3a3633',
  gray: '#4B5563',
}

interface PrintItemsTableProps {
  sectionLabel: string
  groups: PayForGroup[]
  subtotalLabel: string
  subtotalAmount: number
  /** 第三欄 header（團體請款 = TOUR_NAME、公司請款 = TYPE） */
  thirdColHeader: string
}

export function PrintItemsTable({
  sectionLabel,
  groups,
  subtotalLabel,
  subtotalAmount,
  thirdColHeader,
}: PrintItemsTableProps) {
  const t = useTranslations('finance')
  return (
    <>
      {/* section title */}
      <div
        style={{
          fontSize: '13px',
          fontWeight: 600,
          color: COLORS.brown,
          marginBottom: '12px',
          paddingBottom: '8px',
          borderBottom: `1px solid ${COLORS.gold}`,
        }}
      >
        {sectionLabel}
      </div>

      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginBottom: '16px',
        }}
      >
        <colgroup>
          <col style={{ width: '18%' }} />
          <col style={{ width: '14%' }} />
          <col style={{ width: '18%' }} />
          <col style={{ width: '24%' }} />
          <col style={{ width: '13%' }} />
          <col style={{ width: '13%' }} />
        </colgroup>
        <thead>
          <tr style={{ borderBottom: `2px solid ${COLORS.brown}` }}>
            <th
              style={{
                padding: '8px 6px',
                textAlign: 'left',
                fontWeight: 600,
                color: COLORS.brown,
                fontSize: '10px',
              }}
            >
              {t('printPayee')}
            </th>
            <th
              style={{
                padding: '8px 6px',
                textAlign: 'left',
                fontWeight: 600,
                color: COLORS.brown,
                fontSize: '10px',
              }}
            >
              {t('printRequestNo')}
            </th>
            <th
              style={{
                padding: '8px 6px',
                textAlign: 'left',
                fontWeight: 600,
                color: COLORS.brown,
                fontSize: '10px',
              }}
            >
              {thirdColHeader}
            </th>
            <th
              style={{
                padding: '8px 6px',
                textAlign: 'left',
                fontWeight: 600,
                color: COLORS.brown,
                fontSize: '10px',
              }}
            >
              {t('printItemDesc')}
            </th>
            <th
              style={{
                padding: '8px 6px',
                textAlign: 'right',
                fontWeight: 600,
                color: COLORS.brown,
                fontSize: '10px',
              }}
            >
              {t('printAmount')}
            </th>
            <th
              style={{
                padding: '8px 6px',
                textAlign: 'right',
                fontWeight: 600,
                color: COLORS.brown,
                fontSize: '10px',
              }}
            >
              {t('printSubtotal')}
            </th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group, groupIdx) =>
            group.items.map((item, itemIdx) => {
              const isFirstInGroup = itemIdx === 0
              const { payee: groupPayee, supplier: groupSupplier } = splitPayFor(group.payFor)
              const subtotalRowSpan =
                ((group as unknown as Record<string, unknown>).subtotalRowSpan as number) || 0
              const showSubtotalCell = subtotalRowSpan > 0 && isFirstInGroup

              return (
                <tr key={`${groupIdx}-${itemIdx}`}>
                  {isFirstInGroup && (
                    <td
                      rowSpan={group.items.length}
                      style={{
                        padding: '6px',
                        verticalAlign: 'middle',
                        fontSize: '10px',
                        fontWeight: 600,
                        color: COLORS.brown,
                        borderTop: groupIdx > 0 ? `1px solid ${COLORS.gold}` : 'none',
                      }}
                    >
                      <div>{groupPayee}</div>
                      {groupSupplier && (
                        <div
                          style={{
                            fontSize: '9px',
                            fontWeight: 'normal',
                            color: COLORS.gray,
                            marginTop: '2px',
                          }}
                        >
                          {groupSupplier}
                        </div>
                      )}
                    </td>
                  )}
                  <td
                    style={{
                      padding: '6px',
                      verticalAlign: 'middle',
                      fontSize: '10px',
                      color: COLORS.gray,
                      borderTop:
                        isFirstInGroup && groupIdx > 0 ? `1px solid ${COLORS.gold}` : 'none',
                    }}
                  >
                    {item.requestCode}
                  </td>
                  <td
                    style={{
                      padding: '6px',
                      verticalAlign: 'middle',
                      fontSize: '10px',
                      color: COLORS.gray,
                      borderTop:
                        isFirstInGroup && groupIdx > 0 ? `1px solid ${COLORS.gold}` : 'none',
                      maxWidth: '140px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.tourName}
                  </td>
                  <td
                    style={{
                      padding: '6px',
                      verticalAlign: 'middle',
                      fontSize: '10px',
                      color: COLORS.gray,
                      borderTop:
                        isFirstInGroup && groupIdx > 0 ? `1px solid ${COLORS.gold}` : 'none',
                    }}
                  >
                    {item.description}
                  </td>
                  <td
                    style={{
                      padding: '6px',
                      verticalAlign: 'middle',
                      fontSize: '10px',
                      textAlign: 'right',
                      color: COLORS.gray,
                      borderTop:
                        isFirstInGroup && groupIdx > 0 ? `1px solid ${COLORS.gold}` : 'none',
                    }}
                  >
                    {/* 2026-05-27 William 拍板：金額 = 純應付額；手續費分攤在本列下方小字、
                        含進右邊「小計」欄（group.total = 金額 + 手續費）。不丟到底部獨立行。 */}
                    {item.amount.toLocaleString()}
                    {item.feeAmount > 0 && (
                      <div style={{ fontSize: '8px', color: COLORS.gray, marginTop: '1px' }}>
                        手續費 {Math.round(item.feeAmount).toLocaleString()}
                      </div>
                    )}
                  </td>
                  {showSubtotalCell && (
                    <td
                      rowSpan={subtotalRowSpan}
                      style={{
                        padding: '6px',
                        verticalAlign: 'middle',
                        fontSize: '10px',
                        textAlign: 'center',
                        fontWeight: 600,
                        color: COLORS.brown,
                        borderTop: groupIdx > 0 ? `1px solid ${COLORS.gold}` : 'none',
                      }}
                    >
                      {group.showTotal ? group.total.toLocaleString() : ''}
                    </td>
                  )}
                </tr>
              )
            })
          )}
        </tbody>
      </table>

      {/* 小計行 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          padding: '6px',
          marginBottom: '24px',
          borderTop: `1px solid ${COLORS.gold}`,
        }}
      >
        <span style={{ fontSize: '12px', color: COLORS.gray, marginRight: '16px' }}>
          {subtotalLabel}
        </span>
        <span style={{ fontSize: '13px', fontWeight: 600, color: COLORS.brown }}>
          {subtotalAmount.toLocaleString()}
        </span>
      </div>
    </>
  )
}
