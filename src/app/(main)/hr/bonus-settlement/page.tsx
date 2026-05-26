'use client'

/**
 * /hr/bonus-settlement
 *
 * 獎金結算頁、跟「新增出納單」概念對齊（William 2026-05-22 拍板）：
 *   - 主頁面：read-only 預覽「待結算的獎金」（不可勾選、不可結算）
 *   - 點「新增獎金結算」按鈕 → 開 wizard dialog
 *   - wizard dialog 內含：完整列表 + checkbox 多選 + 設請款日 + 確認結算
 */

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Award, Check, Calendar, ExternalLink, Loader2 } from 'lucide-react'
import { ListPageLayout } from '@/components/layout/list-page-layout'
import type { TableColumn } from '@/components/ui/enhanced-table'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { ACTION_BUTTON_BASE, ACTION_BUTTON_DEFAULT_TONE } from '@/components/table-cells'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DatePicker } from '@/components/ui/date-picker'
import { getTodayString } from '@/lib/utils/format-date'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { apiMutate } from '@/lib/swr/api-mutate'

interface PendingTourRow {
  tour_id: string
  tour_code: string | null
  tour_name: string
  closing_date: string | null
  total_amount: number
  employee_count: number
  bonus_count: number
}

function formatNT(n: number): string {
  return `NT$ ${Number(n).toLocaleString('zh-TW')}`
}

export default function BonusSettlementListPage() {
  const router = useRouter()
  const [list, setList] = useState<PendingTourRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [settling, setSettling] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [requestDate, setRequestDate] = useState<string>(() => getTodayString())

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/hr/bonus-settlements/pending-tours')
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        toast.error(body.error || `載入失敗 HTTP ${res.status}`)
        return
      }
      const body = await res.json()
      setList(body.data ?? [])
    } catch (err) {
      logger.error('Load pending tours failed:', err)
      toast.error('載入失敗')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadList()
  }, [loadList])

  const toggleOne = (tourId: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(tourId)) next.delete(tourId)
      else next.add(tourId)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === list.length) setSelected(new Set())
    else setSelected(new Set(list.map(r => r.tour_id)))
  }

  const selectedAmount = list
    .filter(r => selected.has(r.tour_id))
    .reduce((sum, r) => sum + r.total_amount, 0)

  const handleSettle = async () => {
    if (selected.size === 0 || !requestDate) {
      toast.error('請先勾選團、並設定請款日期')
      return
    }
    setSettling(true)
    try {
      const res = await apiMutate<{ data: { ok_count: number; fail_count: number } }>(
        '/api/hr/bonus-settlements/settle',
        {
          method: 'POST',
          body: {
            tour_ids: Array.from(selected),
            request_date: requestDate,
          },
          invalidate: ['/api/hr/bonus-settlements/pending-tours'],
        }
      )
      if (!res.ok || !res.data) {
        toast.error(res.error || `結算失敗 HTTP ${res.status}`)
        return
      }
      const { ok_count, fail_count } = res.data.data
      if (fail_count === 0) {
        toast.success(`已結算 ${ok_count} 團、${ok_count} 張請款單已產出`)
        setWizardOpen(false)
        setSelected(new Set())
        setRequestDate(getTodayString())
      } else {
        toast.warning(`部分成功：${ok_count} 團 OK、${fail_count} 團失敗`)
      }
      loadList()
    } catch (err) {
      logger.error('Settle failed:', err)
      toast.error('結算失敗')
    } finally {
      setSettling(false)
    }
  }

  // 主列表 columns（read-only 預覽、不含 checkbox）
  const previewColumns: TableColumn<PendingTourRow>[] = [
    { key: 'tour_code', label: '團號', sortable: true, width: '140px' },
    { key: 'tour_name', label: '團名', sortable: true },
    {
      key: 'closing_date',
      label: '結案日',
      sortable: true,
      width: '110px',
      render: v =>
        v ? (
          <span className="text-xs text-morandi-secondary">{String(v).slice(0, 10)}</span>
        ) : (
          <span className="text-morandi-muted">—</span>
        ),
    },
    {
      key: 'employee_count',
      label: '員工',
      sortable: true,
      width: '70px',
      render: v => <span className="text-morandi-secondary">{Number(v) || 0} 位</span>,
    },
    {
      key: 'bonus_count',
      label: '獎金筆數',
      sortable: true,
      width: '90px',
      render: v => <span className="text-morandi-secondary">{Number(v) || 0} 筆</span>,
    },
    {
      key: 'total_amount',
      label: '總獎金',
      sortable: true,
      width: '130px',
      render: v => (
        <span className="font-semibold text-morandi-gold tabular-nums">
          {formatNT(Number(v) || 0)}
        </span>
      ),
    },
  ]

  const renderActions = (row: PendingTourRow) => (
    <Button
      variant="ghost"
      size="sm"
      title="看員工明細"
      onClick={e => {
        e.stopPropagation()
        router.push(`/hr/bonus-settlement/${row.tour_id}`)
      }}
      className={cn(ACTION_BUTTON_BASE, ACTION_BUTTON_DEFAULT_TONE)}
    >
      <ExternalLink size="0.95em" />
    </Button>
  )

  const openWizard = () => {
    setSelected(new Set())
    setRequestDate(getTodayString())
    setWizardOpen(true)
  }

  return (
    <>
      <ListPageLayout
        title="獎金結算"
        icon={Award}
        data={list}
        loading={loading}
        columns={previewColumns}
        renderActions={renderActions}
        searchFields={['tour_code', 'tour_name']}
        searchPlaceholder="搜尋團號 / 團名"
        onRowClick={row => router.push(`/hr/bonus-settlement/${row.tour_id}`)}
        initialPageSize={15}
        primaryAction={{
          label: '新增獎金結算',
          icon: Check,
          onClick: openWizard,
          disabled: list.length === 0,
        }}
        breadcrumb={[
          { label: '人資管理', href: '/hr' },
          { label: '獎金結算', href: '/hr/bonus-settlement' },
        ]}
      />

      {/* 結算 wizard dialog（William 2026-05-22 拍板：勾選 + 設請款日 + 確認） */}
      <Dialog open={wizardOpen} onOpenChange={o => !settling && setWizardOpen(o)}>
        <DialogContent className="!max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-morandi-gold" />
              新增獎金結算
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm text-morandi-secondary block mb-2">
                請款日期 <span className="text-red-500">*</span>
              </label>
              <DatePicker value={requestDate} onChange={setRequestDate} className="w-full" />
              <p className="text-xs text-morandi-muted mt-1">
                此日期會帶入請款單 request_date、單號後綴也用此日期
              </p>
            </div>

            <div className="rounded-lg border border-morandi-border overflow-hidden">
              <div className="px-4 py-2 border-b border-morandi-border bg-morandi-container/30 flex items-center gap-3">
                <Checkbox
                  checked={selected.size === list.length && list.length > 0}
                  onCheckedChange={toggleAll}
                  aria-label="全選"
                />
                <span className="text-xs text-morandi-secondary">
                  {selected.size > 0
                    ? `已選 ${selected.size} / ${list.length} 團 · ${formatNT(selectedAmount)}`
                    : `共 ${list.length} 團待結算（按結案日排序）`}
                </span>
                {selected.size > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                    清除
                  </Button>
                )}
              </div>

              {list.length === 0 ? (
                <div className="p-12 text-center text-morandi-secondary text-sm">
                  目前無待結算獎金
                </div>
              ) : (
                <div className="divide-y divide-morandi-muted/10 max-h-[40vh] overflow-y-auto">
                  {list.map(row => {
                    const isSelected = selected.has(row.tour_id)
                    return (
                      <div
                        key={row.tour_id}
                        className={`flex items-center gap-3 px-4 py-3 hover:bg-morandi-container/20 cursor-pointer ${
                          isSelected ? 'bg-morandi-gold/5' : ''
                        }`}
                        onClick={() => toggleOne(row.tour_id)}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleOne(row.tour_id)}
                          onClick={e => e.stopPropagation()}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-morandi-primary">
                              {row.tour_code || row.tour_id.slice(0, 8)}
                            </span>
                            <span className="text-sm text-morandi-secondary truncate">
                              {row.tour_name}
                            </span>
                          </div>
                          <div className="text-xs text-morandi-muted mt-0.5">
                            {row.closing_date && `結案 ${row.closing_date.slice(0, 10)} · `}
                            {row.employee_count} 員工 · {row.bonus_count} 筆獎金
                          </div>
                        </div>
                        <div className="text-sm font-semibold text-morandi-gold tabular-nums">
                          {formatNT(row.total_amount)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="rounded-lg bg-morandi-container/30 border border-morandi-border p-3 text-xs text-morandi-secondary leading-relaxed">
              <p className="font-medium text-morandi-primary mb-1">提醒</p>
              <p>· 結算後不可修改、請款單會自動產生</p>
              <p>· 每團產一張請款單（BNS-團號-日期）</p>
              <p>· 對應的 bonus_pending 會標記為已結算</p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-morandi-border">
              <Button variant="outline" onClick={() => setWizardOpen(false)} disabled={settling}>
                取消
              </Button>
              <Button
                onClick={handleSettle}
                disabled={settling || !requestDate || selected.size === 0}
              >
                {settling && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                確認結算 {selected.size > 0 && `(${selected.size} 團)`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
