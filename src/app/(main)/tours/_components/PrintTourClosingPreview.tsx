'use client'

/**
 * PrintTourClosingPreview — 結帳明細列印預覽（HTML、仿出納單樣式）
 *
 * 設計：
 * - A4 直式、Morandi 色系
 * - logo 左上、標題置中、團號 + 日期右上、底部金線
 * - 利潤計算表（4 列 × 2 欄）+ 收入明細 + 支出明細 + 獎金明細
 * - 純 HTML、由父層用 iframe.print() 列印（仿 DisbursementPrintDialog 模式）
 */

import React, { forwardRef, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import type { Tour } from '@/stores/types'
import type { ProfitCalculationResult } from '@/types/bonus.types'
import { BonusSettingType, BonusCalculationType } from '@/types/bonus.types'
import { formatDate } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceSettings, getLogoStyle } from '@/hooks/useWorkspaceSettings'
import { BONUS_TYPE_LABELS } from '../_constants/bonus-labels'
import { COLORS, fmt } from './print-templates/print-closing-shared'
import { PrintClosingIncomeTable } from './print-templates/PrintClosingIncomeTable'
import { PrintClosingExpenseTable } from './print-templates/PrintClosingExpenseTable'
import { PrintClosingProfitTable } from './print-templates/PrintClosingProfitTable'
import { PrintClosingBonusTable, type BonusDetailRow } from './print-templates/PrintClosingBonusTable'

interface ReceiptRow {
  receipt_number?: string
  receipt_date?: string
  receipt_amount?: number
  amount?: number
  payment_method?: string
}

interface CostRow {
  code?: string | null
  request_number?: string | null
  supplier_name?: string | null
  request_type?: string | null
  amount?: number | null
}

export interface PrintTourClosingPreviewProps {
  tour: Tour
  receipts: ReceiptRow[]
  costs: CostRow[]
  profitResult: ProfitCalculationResult
  preparedBy?: string
}

const SectionHeader = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      fontSize: '13px',
      fontWeight: 600,
      color: COLORS.brown,
      marginBottom: '10px',
      paddingBottom: '6px',
      borderBottom: `1px solid ${COLORS.gold}`,
    }}
  >
    {children}
  </div>
)

export const PrintTourClosingPreview = forwardRef<HTMLDivElement, PrintTourClosingPreviewProps>(
  function PrintTourClosingPreview(
    { tour, receipts, costs, profitResult, preparedBy },
    ref
  ) {
    const t = useTranslations('tour')
    const ws = useWorkspaceSettings()
    const workspaceName = ws.name || useAuthStore.getState().user?.workspace_name || ''
    const logoUrl = ws.logo_url

    // 利潤計算表 — 左右兩欄會計對照
    const grossRevenue = profitResult.receipt_total - profitResult.expense_total
    const profitPreTax = grossRevenue - profitResult.administrative_cost
    const profitPostTax = profitPreTax - profitResult.profit_tax

    const opBonuses = profitResult.employee_bonuses.filter(
      b => b.setting.type === BonusSettingType.OP_BONUS
    )
    const saleBonuses = profitResult.employee_bonuses.filter(
      b => b.setting.type === BonusSettingType.SALE_BONUS
    )
    const opTotal = opBonuses.reduce((s, b) => s + b.amount, 0)
    const saleTotal = saleBonuses.reduce((s, b) => s + b.amount, 0)
    const teamBonusTotal = profitResult.team_bonuses.reduce((s, b) => s + b.amount, 0)

    const sumSub = (count: number) => (count > 1 ? `${count} 筆合計` : '')

    interface ProfitColRow {
      label: string
      sub?: string
      amount: number
      highlight?: boolean
    }

    const leftCol: ProfitColRow[] = useMemo(
      () => [
        { label: '收款總額', sub: '進項', amount: profitResult.receipt_total },
        {
          label: '行政費用',
          sub:
            profitResult.admin_cost_per_person > 0
              ? `${profitResult.admin_cost_per_person} 元/人`
              : '',
          amount: profitResult.administrative_cost,
        },
        { label: '業務獎金', sub: sumSub(saleBonuses.length), amount: saleTotal },
        { label: 'OP 獎金', sub: sumSub(opBonuses.length), amount: opTotal },
        {
          label: '團隊獎金',
          sub: sumSub(profitResult.team_bonuses.length),
          amount: teamBonusTotal,
        },
      ],
      [profitResult, opBonuses.length, opTotal, saleBonuses.length, saleTotal, teamBonusTotal]
    )

    const rightCol: ProfitColRow[] = useMemo(
      () => [
        { label: '付款總額', sub: '銷項', amount: profitResult.expense_total },
        { label: '營收總額', sub: '未扣除營收稅額', amount: grossRevenue },
        {
          label: '營收稅額',
          sub: profitResult.tax_rate > 0 ? `${profitResult.tax_rate}%` : '',
          amount: profitResult.profit_tax,
        },
        { label: '利潤總額', sub: '已扣除營收稅額', amount: profitPostTax },
        {
          label: '公司盈餘',
          amount: profitResult.company_profit,
          highlight: true,
        },
      ],
      [profitResult, grossRevenue, profitPostTax]
    )

    // 獎金明細
    const detailRows: BonusDetailRow[] = []
    if (profitResult.administrative_cost !== 0) {
      detailRows.push({
        label: '行政費用',
        sub:
          profitResult.admin_cost_per_person > 0
            ? `${profitResult.admin_cost_per_person} 元/人 × ${profitResult.member_count} 人`
            : '',
        amount: profitResult.administrative_cost,
      })
    }
    if (profitResult.profit_tax !== 0) {
      detailRows.push({
        label: '營收稅額',
        sub: profitResult.tax_rate > 0 ? `${profitResult.tax_rate}%` : '',
        amount: profitResult.profit_tax,
      })
    }
    for (const b of profitResult.employee_bonuses) {
      if (b.amount === 0) continue
      const v = Number(b.setting.bonus)
      const sub =
        b.setting.bonus_type === BonusCalculationType.PERCENT ? `${v}%` : `$${v}`
      const employee = b.employee_name ? ` — ${b.employee_name}` : ''
      detailRows.push({
        label: `${BONUS_TYPE_LABELS[b.setting.type as BonusSettingType]}${employee}`,
        sub,
        amount: b.amount,
      })
    }
    for (const b of profitResult.team_bonuses) {
      if (b.amount === 0) continue
      const v = Number(b.setting.bonus)
      const sub =
        b.setting.bonus_type === BonusCalculationType.PERCENT ? `${v}%` : `$${v}`
      detailRows.push({
        label: BONUS_TYPE_LABELS[BonusSettingType.TEAM_BONUS],
        sub,
        amount: b.amount,
      })
    }

    return (
      <div
        ref={ref}
        style={{
          width: '100%',
          padding: '32px 28px',
          background: 'white',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang TC", "Microsoft JhengHei", sans-serif',
          fontSize: '12px',
          color: COLORS.gray,
          boxSizing: 'border-box',
        }}
      >
        {/* 頁首 */}
        <div
          style={{
            position: 'relative',
            paddingBottom: '16px',
            marginBottom: '24px',
            borderBottom: `1px solid ${COLORS.gold}`,
          }}
        >
          {logoUrl && (
            <div style={{ position: 'absolute', left: 0, top: 0 }}>
              <img src={logoUrl} alt="logo" style={getLogoStyle('print')} />
            </div>
          )}

          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div
              style={{
                fontSize: '11px',
                letterSpacing: '3px',
                color: COLORS.gold,
                fontWeight: 500,
                marginBottom: '4px',
              }}
            >
              TOUR CLOSING REPORT
            </div>
            <h1
              style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: COLORS.brown,
                margin: 0,
              }}
            >
              {t('closingReportHeadline')}
            </h1>
          </div>

          <div
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              textAlign: 'right',
              fontSize: '11px',
              color: COLORS.gray,
            }}
          >
            <div style={{ fontWeight: 600 }}>{tour.code || '-'}</div>
            <div style={{ color: COLORS.lightGray, marginTop: '2px' }}>
              {tour.departure_date && tour.return_date
                ? `${formatDate(tour.departure_date)} ~ ${formatDate(tour.return_date)}`
                : '-'}
            </div>
          </div>
        </div>

        {/* meta：團名 + 製表人 + 列印日 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
            fontSize: '11px',
            color: COLORS.gray,
          }}
        >
          <div>
            <span style={{ color: COLORS.lightGray }}>{t('closingReportTourName')}</span>
            <span style={{ color: COLORS.brown, fontWeight: 600 }}>{tour.name || '-'}</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            {preparedBy && (
              <div>
                <span style={{ color: COLORS.lightGray }}>{t('closingReportCreatedBy')}</span>
                <span>{preparedBy}</span>
              </div>
            )}
            <div style={{ color: COLORS.lightGray, marginTop: '2px' }}>
              {t('closingReportPrintDate')}
              {formatDate(new Date().toISOString())}
            </div>
          </div>
        </div>

        {/* === 收入明細 === */}
        <PrintClosingIncomeTable
          receipts={receipts}
          receiptTotal={profitResult.receipt_total}
          SectionHeader={SectionHeader}
        />

        {/* === 支出明細 === */}
        <PrintClosingExpenseTable
          costs={costs}
          expenseTotal={profitResult.expense_total}
          SectionHeader={SectionHeader}
        />

        {/* === 利潤計算表 === */}
        <PrintClosingProfitTable
          leftCol={leftCol}
          rightCol={rightCol}
          SectionHeader={SectionHeader}
        />

        {/* === 獎金明細 === */}
        <PrintClosingBonusTable
          detailRows={detailRows}
          SectionHeader={SectionHeader}
        />

        {/* === 公司盈餘 === */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 6px',
            marginTop: '12px',
            borderTop: `2px solid ${COLORS.brown}`,
            background: COLORS.lightBrown,
          }}
        >
          <span style={{ fontSize: '13px', fontWeight: 600, color: COLORS.brown }}>
            公司盈餘
          </span>
          <span style={{ fontSize: '15px', fontWeight: 'bold', color: COLORS.brown }}>
            NT$ {fmt(profitResult.company_profit)}
          </span>
        </div>

        {/* 頁尾 slogan */}
        <div
          style={{
            marginTop: '32px',
            paddingTop: '12px',
            borderTop: `1px solid ${COLORS.gold}`,
            textAlign: 'center',
            fontSize: '10px',
            color: COLORS.lightGray,
            letterSpacing: '2px',
          }}
        >
          {workspaceName ? `─ ${workspaceName} ─` : '─'}
        </div>
      </div>
    )
  }
)
