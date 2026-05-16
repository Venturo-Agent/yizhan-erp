'use client'

import React, { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format-currency'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'

const LABELS = {
  COL_SUPPLIER: '供應商',
  COL_AMOUNT: '金額',
  COL_COUNT: '筆數',
  TOTAL: '合計',
} as const

export interface TransactionRow {
  id: string
  date: string
  description: string
  type: 'income' | 'expense'
  category: 'tour' | 'company'
  amount: number
  status: string
  tourCode?: string
  supplierName?: string
  requestCode?: string
}

export interface GroupedRow {
  id: string
  label: string
  income: number
  expense: number
  net: number
  count: number
  details?: TransactionRow[]
}

interface OverviewSupplierTableProps {
  rows: GroupedRow[]
}

/** 供應商彙總表 — 可展開看明細 */
export function OverviewSupplierTable({ rows }: OverviewSupplierTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="border border-border/50 rounded-lg overflow-hidden">
      <table className="w-full text-sm border-separate border-spacing-0">
        <thead className="bg-morandi-gold-header">
          <tr>
            <th className="text-left py-2.5 px-4 font-medium text-morandi-primary w-8"></th>
            <th className="text-left py-2.5 px-4 font-medium text-morandi-primary">
              {LABELS.COL_SUPPLIER}
            </th>
            <th className="text-right py-2.5 px-4 font-medium text-morandi-primary w-[130px]">
              {LABELS.COL_AMOUNT}
            </th>
            <th className="text-right py-2.5 px-4 font-medium text-morandi-primary w-[70px]">
              {LABELS.COL_COUNT}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows
            .filter(r => r.expense > 0 || r.income > 0)
            .map(row => {
              const isOpen = expanded.has(row.id)
              const amount = row.expense > 0 ? row.expense : row.income
              const isIncome = row.income > 0 && row.expense === 0
              return (
                <React.Fragment key={row.id}>
                  <tr
                    className="hover:bg-morandi-gold/5 cursor-pointer transition-colors"
                    onClick={() => toggle(row.id)}
                  >
                    <td className="py-2.5 px-4 border-b border-border/30">
                      {isOpen ? (
                        <ChevronDown size={14} className="text-morandi-secondary" />
                      ) : (
                        <ChevronRight size={14} className="text-morandi-secondary" />
                      )}
                    </td>
                    <td className="py-2.5 px-4 border-b border-border/30 font-medium text-morandi-primary">
                      {row.label}
                    </td>
                    <td
                      className={`py-2.5 px-4 border-b border-border/30 text-right font-semibold ${isIncome ? 'text-morandi-green' : 'text-morandi-red'}`}
                    >
                      {isIncome ? '+' : '-'}
                      {formatCurrency(amount)}
                    </td>
                    <td className="py-2.5 px-4 border-b border-border/30 text-right text-morandi-secondary">
                      {row.count}
                    </td>
                  </tr>
                  {isOpen &&
                    row.details &&
                    row.details.map(detail => (
                      <tr key={detail.id} className="bg-morandi-container/20">
                        <td className="border-b border-border/20"></td>
                        <td className="py-2 px-4 pl-10 border-b border-border/20 text-morandi-secondary text-xs">
                          <span className="text-morandi-primary/60 mr-2">{detail.requestCode}</span>
                          {detail.description}
                          <span className="ml-2 text-morandi-secondary/60">
                            {detail.date
                              ? format(new Date(detail.date), 'MM/dd', { locale: zhTW })
                              : ''}
                          </span>
                        </td>
                        <td
                          className={`py-2 px-4 border-b border-border/20 text-right text-xs ${detail.type === 'income' ? 'text-morandi-green' : 'text-morandi-red'}`}
                        >
                          {formatCurrency(detail.amount)}
                        </td>
                        <td className="py-2 px-4 border-b border-border/20 text-right">
                          <Badge variant="outline" className="text-[0.588rem]">
                            {detail.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                </React.Fragment>
              )
            })}
          {/* 合計行 */}
          <tr className="bg-morandi-gold-header font-semibold">
            <td className="py-2.5 px-4"></td>
            <td className="py-2.5 px-4 text-morandi-primary">{LABELS.TOTAL}</td>
            <td className="py-2.5 px-4 text-right text-morandi-red">
              -{formatCurrency(rows.reduce((sum, r) => sum + r.expense, 0))}
            </td>
            <td className="py-2.5 px-4 text-right text-morandi-secondary">
              {rows.reduce((sum, r) => sum + r.count, 0)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
