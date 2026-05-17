'use client'

/**
 * /hr/bonus-settlement
 *
 * 獎金結算頁、按團勾選結算。
 *
 * 2026-05-15 William 拍板：
 *   - 來源：tour 結團時寫進 bonus_pending（status=pending）
 *   - 列表顯示「每團一行」（含團名、結團日、員工數、總獎金）
 *   - 勾選團 → 「結算選中」→ 每團產一張請款單
 */

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Award, Check, Loader2, Calendar } from 'lucide-react'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/dialog/form-dialog'
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
  // 結算 dialog（讓 HR 選請款日期）
  const [confirmOpen, setConfirmOpen] = useState(false)
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
      setSelected(new Set())
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
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(tourId)) next.delete(tourId)
      else next.add(tourId)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === list.length) setSelected(new Set())
    else setSelected(new Set(list.map((r) => r.tour_id)))
  }

  const selectedAmount = list
    .filter((r) => selected.has(r.tour_id))
    .reduce((sum, r) => sum + r.total_amount, 0)

  const openSettleDialog = () => {
    if (selected.size === 0) {
      toast.error('請先勾選團')
      return
    }
    setRequestDate(getTodayString())
    setConfirmOpen(true)
  }

  const handleSettle = async () => {
    if (selected.size === 0 || !requestDate) return
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
        setConfirmOpen(false)
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

  const primaryAction =
    selected.size > 0
      ? {
          label: settling
            ? '結算中...'
            : `結算選中 (${selected.size} 團 · ${formatNT(selectedAmount)})`,
          icon: Check,
          onClick: openSettleDialog,
          disabled: settling,
        }
      : undefined

  return (
    <ContentPageLayout
      title="獎金結算"
      icon={Award}
      primaryAction={primaryAction}
      breadcrumb={[
        { label: '人資管理', href: '/hr' },
        { label: '獎金結算', href: '/hr/bonus-settlement' },
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
          <p className="text-sm mb-2">目前無待結算獎金</p>
          <p className="text-xs text-morandi-muted">
            旅遊團結團後、有設定獎金的會出現在這裡待勾選結算。
          </p>
        </Card>
      )}

      {!loading && list.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-morandi-muted/20 bg-morandi-container/20 flex items-center gap-3">
            <Checkbox
              checked={selected.size === list.length && list.length > 0}
              onCheckedChange={toggleAll}
            />
            <span className="text-xs text-morandi-secondary">
              {selected.size > 0
                ? `已選 ${selected.size} / ${list.length} 團`
                : `共 ${list.length} 團待結算`}
            </span>
            {selected.size > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                清除選擇
              </Button>
            )}
          </div>
          <div className="divide-y divide-morandi-muted/10">
            {list.map((row) => {
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
                    onClick={(e) => e.stopPropagation()}
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
                      {row.closing_date && `結團 ${row.closing_date.slice(0, 10)} · `}
                      {row.employee_count} 員工 · {row.bonus_count} 筆獎金
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-morandi-gold tabular-nums">
                      {formatNT(row.total_amount)}
                    </div>
                    <button
                      type="button"
                      className="text-[0.647rem] text-morandi-muted underline hover:text-morandi-primary"
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/hr/bonus-settlement/${row.tour_id}`)
                      }}
                    >
                      看員工明細
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      <FormDialog
        open={confirmOpen}
        onOpenChange={open => {
          if (!settling) setConfirmOpen(open)
        }}
        title={
          <span className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-morandi-gold" />
            確認結算
          </span>
        }
        subtitle={`將為 ${selected.size} 團產出請款單、共 ${formatNT(selectedAmount)}`}
        maxWidth="md"
        showFooter={false}
        loading={settling}
        level={2}
      >
        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm text-morandi-secondary block mb-2">
              請款日期 <span className="text-red-500">*</span>
            </label>
            <DatePicker
              value={requestDate}
              onChange={setRequestDate}
              className="w-full"
            />
            <p className="text-xs text-morandi-muted mt-1">
              此日期會帶入請款單 request_date、單號後綴也用此日期
            </p>
          </div>

          <div className="rounded-lg bg-morandi-container/30 border border-morandi-border p-3 text-xs text-morandi-secondary leading-relaxed">
            <p className="font-medium text-morandi-primary mb-1">提醒</p>
            <p>· 結算後不可修改、請款單會自動產生</p>
            <p>· 每團產一張請款單（BNS-團號-日期）</p>
            <p>· 對應的 bonus_pending 會標記為已結算</p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-morandi-border">
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={settling}
            >
              取消
            </Button>
            <Button
              onClick={handleSettle}
              disabled={settling || !requestDate}
            >
              {settling && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              確認結算
            </Button>
          </div>
        </div>
      </FormDialog>
    </ContentPageLayout>
  )
}
