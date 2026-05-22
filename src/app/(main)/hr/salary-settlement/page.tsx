'use client'

/**
 * /hr/salary-settlement
 *
 * 薪資結算列表頁。
 *
 * 2026-05-15 William 拍板：HR 加「薪資結算」按鈕、按月 batch 結算、產出請款單。
 *
 * 流程：
 *   1. 列表（按 period desc）顯示所有 batch、status badge、總額、員工數
 *   2. 右上「+ 新增薪資結算」按鈕 → 選月份 dialog → POST → 跳轉 detail
 *   3. 點任一 row → 進 detail 頁
 *
 * 對應 module: src/modules/hr_salary_settlement.ts
 * Capability: hr_salary_settlement.read / write
 */

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Wallet, Plus, Loader2, Calendar } from 'lucide-react'
import { ListPageLayout } from '@/components/layout/list-page-layout'
import type { TableColumn } from '@/components/ui/enhanced-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { apiMutate } from '@/lib/swr/api-mutate'

interface SettlementRow {
  id: string
  period: string
  status: 'draft' | 'submitted' | 'cancelled'
  total_amount: number
  employee_count: number
  payment_request_id: string | null
  notes: string | null
  submitted_at: string | null
  created_at: string
}

function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatNT(n: number): string {
  return `NT$ ${Number(n).toLocaleString('zh-TW')}`
}

const STATUS_BADGE: Record<SettlementRow['status'], { label: string; className: string }> = {
  draft: { label: '草稿', className: 'bg-morandi-muted/20 text-morandi-secondary' },
  submitted: { label: '已確認', className: 'bg-morandi-green/20 text-morandi-green' },
  cancelled: { label: '已取消', className: 'bg-red-100 text-red-700' },
}

export default function SalarySettlementListPage() {
  const router = useRouter()
  const [list, setList] = useState<SettlementRow[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newPeriod, setNewPeriod] = useState(currentMonth())

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/hr/salary-settlements')
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        toast.error(body.error || `載入失敗 HTTP ${res.status}`)
        return
      }
      const body = await res.json()
      setList(body.data ?? [])
    } catch (err) {
      logger.error('Load salary settlements failed:', err)
      toast.error('載入失敗')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadList()
  }, [loadList])

  const handleCreate = async () => {
    if (!/^\d{4}-\d{2}$/.test(newPeriod)) {
      toast.error('期間格式錯誤、應為 YYYY-MM')
      return
    }
    setCreating(true)
    try {
      const res = await apiMutate<{ data: { id: string; employee_count: number } }>(
        '/api/hr/salary-settlements',
        {
          method: 'POST',
          body: { period: newPeriod },
          invalidate: ['/api/hr/salary-settlements'],
        }
      )
      if (!res.ok || !res.data) {
        toast.error(res.error || `建立失敗 HTTP ${res.status}`)
        return
      }
      toast.success(`已建立 ${newPeriod} 結算、共 ${res.data.data.employee_count} 位員工`)
      setCreateOpen(false)
      router.push(`/hr/salary-settlement/${res.data.data.id}`)
    } catch (err) {
      logger.error('Create salary settlement failed:', err)
      toast.error('建立失敗')
    } finally {
      setCreating(false)
    }
  }

  // 2026-05-22 William 拍板：列表改 ListPageLayout + EnhancedTable、跟請款 / 收款 / 出納單一致
  const columns: TableColumn<SettlementRow>[] = [
    { key: 'period', label: '結算月份', sortable: true, width: '120px' },
    {
      key: 'employee_count',
      label: '員工數',
      sortable: true,
      width: '90px',
      render: (v) => <span className="text-morandi-secondary">{Number(v) || 0} 位</span>,
    },
    {
      key: 'total_amount',
      label: '總金額',
      sortable: true,
      width: '140px',
      render: (v) => (
        <span className="text-morandi-gold font-semibold">{formatNT(Number(v) || 0)}</span>
      ),
    },
    {
      key: 'status',
      label: '狀態',
      sortable: true,
      width: '100px',
      render: (v) => {
        const badge = STATUS_BADGE[v as SettlementRow['status']]
        return <Badge className={badge.className}>{badge.label}</Badge>
      },
    },
    {
      key: 'notes',
      label: '備註',
      render: (v) =>
        typeof v === 'string' && v ? v : <span className="text-morandi-muted">—</span>,
    },
    {
      key: 'created_at',
      label: '建立時間',
      sortable: true,
      width: '140px',
      render: (v) => (
        <span className="text-xs text-morandi-muted">
          {v ? new Date(String(v)).toLocaleDateString('zh-TW') : '—'}
        </span>
      ),
    },
  ]

  return (
    <>
      <ListPageLayout
        title="薪資結算"
        icon={Wallet}
        data={list}
        loading={loading}
        columns={columns}
        searchFields={['period', 'notes']}
        searchPlaceholder="搜尋月份 / 備註"
        onRowClick={(row) => router.push(`/hr/salary-settlement/${row.id}`)}
        initialPageSize={15}
        primaryAction={{
          label: '新增薪資結算',
          icon: Plus,
          onClick: () => setCreateOpen(true),
        }}
        breadcrumb={[
          { label: '人資管理', href: '/hr' },
          { label: '薪資結算', href: '/hr/salary-settlement' },
        ]}
      />

      {/* 新增薪資結算 wizard dialog（William 2026-05-22 拍板：跟出納單 / 獎金 wizard 對齊） */}
      <Dialog open={createOpen} onOpenChange={(o) => !creating && setCreateOpen(o)}>
        <DialogContent className="!max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-morandi-gold" />
              新增薪資結算
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="period">
                結算月份 (YYYY-MM) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="period"
                placeholder="2026-05"
                value={newPeriod}
                onChange={(e) => setNewPeriod(e.target.value)}
                disabled={creating}
                className="w-40"
              />
              <p className="text-xs text-morandi-muted">
                該月份所有 active 員工的薪資會被結算
              </p>
            </div>

            <div className="rounded-lg bg-morandi-container/30 border border-morandi-border p-3 text-xs text-morandi-secondary leading-relaxed">
              <p className="font-medium text-morandi-primary mb-1">提醒</p>
              <p>· 建立後會自動帶入該 workspace 所有 active 員工的薪資</p>
              <p>· 進入詳情頁可調整個別員工金額、或排除某員工（譬如離職）</p>
              <p>· 確認結算後產生請款單、不可再改</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              建立並進入結算頁
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
