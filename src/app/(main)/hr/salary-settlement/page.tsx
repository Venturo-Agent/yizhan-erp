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
import { Wallet, Plus, Loader2, Calendar, X } from 'lucide-react'
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
  // Phase 2（William 2026-05-22 拍板）：月份多選、可同時建多月份 settlement
  const [periods, setPeriods] = useState<string[]>([currentMonth()])
  const [periodInput, setPeriodInput] = useState('')

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

  const addPeriod = () => {
    const trimmed = periodInput.trim()
    if (!/^\d{4}-\d{2}$/.test(trimmed)) {
      toast.error('期間格式錯誤、應為 YYYY-MM')
      return
    }
    if (periods.includes(trimmed)) {
      toast.error(`${trimmed} 已加入`)
      return
    }
    setPeriods((prev) => [...prev, trimmed])
    setPeriodInput('')
  }

  const removePeriod = (p: string) => {
    setPeriods((prev) => prev.filter((x) => x !== p))
  }

  // Phase 2：多月份 loop 建立、同時補發
  const handleCreate = async () => {
    if (periods.length === 0) {
      toast.error('請至少加一個月份')
      return
    }
    setCreating(true)
    let okCount = 0
    let firstId: string | null = null
    let totalEmployees = 0
    const failedPeriods: string[] = []
    try {
      for (const period of periods) {
        try {
          const res = await apiMutate<{ data: { id: string; employee_count: number } }>(
            '/api/hr/salary-settlements',
            {
              method: 'POST',
              body: { period },
              invalidate: ['/api/hr/salary-settlements'],
            }
          )
          if (res.ok && res.data) {
            okCount++
            totalEmployees += res.data.data.employee_count
            if (!firstId) firstId = res.data.data.id
          } else {
            failedPeriods.push(`${period}: ${res.error || `HTTP ${res.status}`}`)
          }
        } catch (err) {
          logger.error(`Create salary settlement ${period} failed:`, err)
          failedPeriods.push(`${period}: 例外`)
        }
      }

      if (failedPeriods.length > 0) {
        toast.warning(
          `${okCount} 個成功、${failedPeriods.length} 個失敗：${failedPeriods.join('、')}`
        )
      } else {
        toast.success(`已建立 ${okCount} 個結算、共 ${totalEmployees} 位員工`)
      }

      setCreateOpen(false)
      // 單月：跳該 settlement 詳情；多月：留在列表
      if (okCount === 1 && firstId && periods.length === 1) {
        router.push(`/hr/salary-settlement/${firstId}`)
      } else {
        // 重設 state、refresh list
        setPeriods([currentMonth()])
        setPeriodInput('')
        loadList()
      }
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
              <Label>
                結算月份 (YYYY-MM、可加多個補發) <span className="text-red-500">*</span>
              </Label>

              {/* 已加入的月份 chips */}
              {periods.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {periods.map((p) => (
                    <div
                      key={p}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-morandi-gold/15 border border-morandi-gold/30 text-sm text-morandi-primary"
                    >
                      <span>{p}</span>
                      <button
                        type="button"
                        onClick={() => removePeriod(p)}
                        disabled={creating}
                        className="text-morandi-secondary hover:text-status-danger ml-1"
                        title="移除"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 加月份 input + 按鈕 */}
              <div className="flex items-center gap-2">
                <Input
                  placeholder="2026-04（按 Enter 或點加號加入）"
                  value={periodInput}
                  onChange={(e) => setPeriodInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addPeriod()
                    }
                  }}
                  disabled={creating}
                  className="w-56"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addPeriod}
                  disabled={creating || !periodInput.trim()}
                >
                  <Plus className="w-3 h-3 mr-1" />加月份
                </Button>
              </div>

              <p className="text-xs text-morandi-muted">
                可一次建多個月份的結算（譬如同時補發 2026-04 + 2026-05）
              </p>
            </div>

            <div className="rounded-lg bg-morandi-container/30 border border-morandi-border p-3 text-xs text-morandi-secondary leading-relaxed">
              <p className="font-medium text-morandi-primary mb-1">提醒</p>
              <p>· 每個月份各自建立一張 settlement、各自含該月所有 active 員工的薪資</p>
              <p>· 進入詳情頁可調整個別員工金額、或排除某員工（譬如離職）</p>
              <p>· 確認結算後產生請款單、不可再改</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={creating || periods.length === 0}>
              {creating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              建立 {periods.length > 0 && `(${periods.length} 個月)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
