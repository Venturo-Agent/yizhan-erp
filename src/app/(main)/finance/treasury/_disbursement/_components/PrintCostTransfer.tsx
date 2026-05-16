'use client'
/**
 * PrintCostTransfer
 * 出納單列印預覽 — 成本轉移區塊
 * 包含：孤兒 pair 警告、對沖模式明細表（原團 -X / 新團 +X）、小計（固定 NT$ 0）
 */

import React from 'react'
import type { TransferPairRow } from '../_utils/printHelpers'

const COMPONENT_LABELS = {
  TRANSFER_SUBTOTAL: '轉移小計',
  ORPHAN_WARNING_PREFIX: '⚠ 偵測到',
  ORPHAN_WARNING_BODY: '組異常的成本轉移配對（找不到對手方）、未列入下方明細。請確認 PR 是否被誤刪或狀態異常（pair_id：',
  COST_TRANSFER_TITLE: '成本轉移 COST TRANSFER',
  COL_TOUR: '團',
  COL_SUPPLIER: '供應商',
  COL_DESCRIPTION: '項目說明',
  COL_AMOUNT: '金額',
  TRANSFER_OUT_PREFIX: '轉出：',
  TRANSFER_IN_PREFIX: '轉入：',
} as const

// Morandi 色系
const COLORS = {
  gold: '#B8A99A',
  brown: '#3a3633',
  lightBrown: '#FAF7F2',
  gray: '#4B5563',
  lightGray: '#9CA3AF',
  red: '#B84C4C', // 轉移出（負金額）、Morandi 紅
}

interface PrintCostTransferProps {
  transferPairs: TransferPairRow[]
  orphanPairIds: string[]
}

export function PrintCostTransfer({ transferPairs, orphanPairIds }: PrintCostTransferProps) {
  return (
    <>
      {/* 孤兒 pair 警告：pair_id 存在但對手 PR 缺失（被誤刪 / 狀態異常） */}
      {orphanPairIds.length > 0 && (
        <div
          style={{
            marginBottom: '12px',
            padding: '8px 12px',
            border: `1px solid ${COLORS.red}`,
            borderRadius: '4px',
            backgroundColor: '#FEF2F2',
            fontSize: '11px',
            color: COLORS.red,
          }}
        >
          {COMPONENT_LABELS.ORPHAN_WARNING_PREFIX} {orphanPairIds.length} {COMPONENT_LABELS.ORPHAN_WARNING_BODY}
          {orphanPairIds.map(id => id.slice(0, 8)).join('、')}）。
        </div>
      )}

      {/* 成本轉移區塊（對沖模式：每對顯示「原團 -X / 新團 +X」、小計自動 = 0） */}
      {transferPairs.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: COLORS.brown,
              letterSpacing: '2px',
              marginBottom: '6px',
              paddingTop: '8px',
            }}
          >
            {COMPONENT_LABELS.COST_TRANSFER_TITLE}
          </div>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '11px',
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: COLORS.lightBrown,
                  borderBottom: `1px solid ${COLORS.gold}`,
                }}
              >
                <th
                  style={{
                    textAlign: 'left',
                    padding: '6px 8px',
                    color: COLORS.gray,
                    fontWeight: 500,
                  }}
                >
                  {COMPONENT_LABELS.COL_TOUR}
                </th>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '6px 8px',
                    color: COLORS.gray,
                    fontWeight: 500,
                  }}
                >
                  {COMPONENT_LABELS.COL_SUPPLIER}
                </th>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '6px 8px',
                    color: COLORS.gray,
                    fontWeight: 500,
                  }}
                >
                  {COMPONENT_LABELS.COL_DESCRIPTION}
                </th>
                <th
                  style={{
                    textAlign: 'right',
                    padding: '6px 8px',
                    color: COLORS.gray,
                    fontWeight: 500,
                  }}
                >
                  {COMPONENT_LABELS.COL_AMOUNT}
                </th>
              </tr>
            </thead>
            <tbody>
              {transferPairs.map(pair => {
                const primary = pair.items[0] || { description: '-', supplier: '-', subtotal: 0 }
                return (
                  <React.Fragment key={pair.pairId}>
                    {/* 原團（出）— 負金額 */}
                    <tr style={{ borderBottom: `1px solid #e5e5e5` }}>
                      <td style={{ padding: '5px 8px', color: COLORS.gray }}>
                        {pair.fromTourCode}
                      </td>
                      <td style={{ padding: '5px 8px', color: COLORS.gray }}>
                        {primary.supplier}
                      </td>
                      <td style={{ padding: '5px 8px', color: COLORS.gray }}>
                        {COMPONENT_LABELS.TRANSFER_OUT_PREFIX}{primary.description}
                      </td>
                      <td style={{ padding: '5px 8px', textAlign: 'right', color: COLORS.red }}>
                        {(-pair.amount).toLocaleString()}
                      </td>
                    </tr>
                    {/* 新團（入）— 正金額 */}
                    <tr style={{ borderBottom: `1px solid #e5e5e5` }}>
                      <td style={{ padding: '5px 8px', color: COLORS.gray }}>
                        {pair.toTourCode}
                      </td>
                      <td style={{ padding: '5px 8px', color: COLORS.gray }}>
                        {primary.supplier}
                      </td>
                      <td style={{ padding: '5px 8px', color: COLORS.gray }}>
                        {COMPONENT_LABELS.TRANSFER_IN_PREFIX}{primary.description}
                      </td>
                      <td style={{ padding: '5px 8px', textAlign: 'right', color: COLORS.gray }}>
                        {pair.amount.toLocaleString()}
                      </td>
                    </tr>
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              padding: '8px 8px',
              borderTop: `1px solid ${COLORS.gold}`,
              fontSize: '12px',
            }}
          >
            <span style={{ color: COLORS.lightGray, marginRight: '16px' }}>{COMPONENT_LABELS.TRANSFER_SUBTOTAL}</span>
            <span style={{ fontWeight: 600, color: COLORS.gray }}>NT$ 0</span>
          </div>
        </div>
      )}
    </>
  )
}
