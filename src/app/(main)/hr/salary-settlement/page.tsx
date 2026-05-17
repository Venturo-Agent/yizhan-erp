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
import { Wallet, Plus, Loader2 } from 'lucide-react'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Card } from '@/components/ui/card'
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

  const primaryAction = {
    label: '新增薪資結算',
    icon: Plus,
    onClick: () => setCreateOpen(true),
  }

  return (
    <>
      <ContentPageLayout
        title="薪資結算"
        icon={Wallet}
        primaryAction={primaryAction}
        breadcrumb={[
          { label: '人資管理', href: '/hr' },
          { label: '薪資結算', href: '/hr/salary-settlement' },
        ]}
      >
        {loading && (
          <div className="flex items-center justify-center py-12 text-morandi-secondary">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            載入中...
          </div>
        )}

        {!loading && list.length === 0 && (
          <Card className="p-12 text-center text-morandi-secondary">
            <p className="text-sm mb-2">尚無薪資結算紀錄</p>
            <p className="text-xs text-morandi-muted">點右上「新增薪資結算」開始</p>
          </Card>
        )}

        {!loading && list.length > 0 && (
          <div className="space-y-3">
            {list.map((row) => {
              const badge = STATUS_BADGE[row.status]
              return (
                <Card
                  key={row.id}
                  className="p-5 hover:shadow-md hover:border-morandi-gold/30 transition-all cursor-pointer"
                  onClick={() => router.push(`/hr/salary-settlement/${row.id}`)}
                >
                  <div className="flex items-center gap-6">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-semibold text-morandi-primary">
                          {row.period} 薪資
                        </h3>
                        <Badge className={badge.className}>{badge.label}</Badge>
                      </div>
                      <div className="text-sm text-morandi-secondary flex items-center gap-4">
                        <span>{row.employee_count} 位員工</span>
                        <span className="text-morandi-gold font-semibold">
                          {formatNT(row.total_amount)}
                        </span>
                        {row.notes && <span className="text-xs">· {row.notes}</span>}
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </ContentPageLayout>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增薪資結算</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="period">結算月份 (YYYY-MM)</Label>
              <Input
                id="period"
                placeholder="2026-05"
                value={newPeriod}
                onChange={(e) => setNewPeriod(e.target.value)}
                disabled={creating}
              />
              <p className="text-xs text-morandi-muted">
                建立後會自動帶入該 workspace 所有 active 員工的薪資。
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={creating}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              建立
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
