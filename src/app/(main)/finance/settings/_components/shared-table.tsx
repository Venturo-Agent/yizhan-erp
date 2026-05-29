// Finance settings 內部使用的精簡 Table primitives
// 不放共用 ui/、因為 EnhancedTable 設計面跟這裡需求不同
// 移自 page.tsx、邏輯零變動

import * as React from 'react'

export const Table = ({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) => <table className={`w-full text-sm table-fixed ${className || ''}`}>{children}</table>

export const TableHeader = ({ children }: { children: React.ReactNode }) => (
  <thead className="sticky top-0 z-20 bg-card border-b border-border [&_tr]:bg-morandi-gold-header">
    {children}
  </thead>
)

export const TableBody = ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>

export const TableRow = ({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) => (
  <tr
    className={`border-b border-border/40 hover:bg-morandi-container/20 transition-colors ${className || ''}`}
  >
    {children}
  </tr>
)

export const TableHead = ({
  children,
  className,
}: {
  children?: React.ReactNode
  className?: string
}) => (
  <th
    className={`text-left [padding-block:0.95em] px-4 text-xs font-medium text-morandi-primary ${className || ''}`}
  >
    {children}
  </th>
)

export const TableCell = ({
  children,
  className,
  colSpan,
}: {
  children: React.ReactNode
  className?: string
  colSpan?: number
}) => (
  <td className={`px-4 [padding-block:0.95em] text-sm ${className || ''}`} colSpan={colSpan}>
    {children}
  </td>
)
