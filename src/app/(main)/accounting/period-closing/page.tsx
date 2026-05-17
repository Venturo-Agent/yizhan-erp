'use client'

import { useState, useEffect } from 'react'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { useTranslations } from 'next-intl'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Calendar, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { useAsyncSubmit } from '@/hooks/useAsyncSubmit'
import { confirm } from '@/lib/ui/alert-dialog'

const PAGE_LABELS = {
  PERIOD_TYPE: '期間類型',
  MONTHLY_CLOSING: '月結',
  QUARTERLY_CLOSING: '季結',
  YEARLY_CLOSING: '年結',
  YEAR: '年度',
  MONTH: '月份',
  QUARTER: '季度',
  CLOSING_HISTORY: '結轉歷史',
  NO_CLOSING_RECORDS: '尚無結轉記錄',
  ALREADY_CLOSED: '此期間已結轉，無法重複結轉',
  CLOSE_FAILED: '結轉失敗',
  CLOSE_SUCCESS_PREFIX: '結轉成功！\n本期',
  NET_INCOME: '淨利',
  NET_LOSS: '淨損',
  COLON: '：',
} as const

interface PeriodClosing {
  id: string
  period_type: 'month' | 'quarter' | 'year' | string
  period_start: string
  period_end: string
  net_income: number
  closed_at: string | null
  closed_by: string | null
}

const periodTypeLabels = {
  month: '月結',
  quarter: '季結',
  year: '年結',
}

export default function PeriodClosingPage() {
  const { user } = useAuthStore()
  const t = useTranslations('accounting')
  const [closings, setClosings] = useState<PeriodClosing[]>([])

  // 選擇期間
  const [periodType, setPeriodType] = useState<'month' | 'quarter' | 'year'>('month')
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [quarter, setQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3))

  useEffect(() => {
    loadClosings()
  }, [user?.workspace_id])

  const loadClosings = async () => {
    if (!user?.workspace_id) return

    try {
      const { data, error } = await supabase
        .from('accounting_period_closings')
        .select(
          'id, period_start, period_end, period_type, closed_by, closed_at, net_income, workspace_id, created_at'
        )
        .eq('workspace_id', user.workspace_id)
        .order('period_end', { ascending: false })
        .limit(20)

      if (error) throw error
      setClosings(data || [])
    } catch (error) {
      logger.error('載入結轉記錄失敗:', error)
    }
  }

  // 計算期間
  const getPeriodDates = () => {
    let start: Date
    let end: Date

    if (periodType === 'month') {
      start = new Date(year, month - 1, 1)
      end = new Date(year, month, 0) // 該月最後一天
    } else if (periodType === 'quarter') {
      const quarterStartMonth = (quarter - 1) * 3
      start = new Date(year, quarterStartMonth, 1)
      end = new Date(year, quarterStartMonth + 3, 0)
    } else {
      // year
      start = new Date(year, 0, 1)
      end = new Date(year, 11, 31)
    }

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    }
  }

  // 檢查是否已結轉
  const checkIfClosed = () => {
    const { start, end } = getPeriodDates()
    return closings.some(
      c => c.period_type === periodType && c.period_start === start && c.period_end === end
    )
  }

  const { isSubmitting: isLoading, execute: executeClose } = useAsyncSubmit(
    async () => {
      const { start, end } = getPeriodDates()

      const response = await fetch('/api/accounting/period-closing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period_type: periodType,
          period_start: start,
          period_end: end,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || PAGE_LABELS.CLOSE_FAILED)
      }

      toast.success(
        `${PAGE_LABELS.CLOSE_SUCCESS_PREFIX}${data.net_income >= 0 ? PAGE_LABELS.NET_INCOME : PAGE_LABELS.NET_LOSS}${PAGE_LABELS.COLON}${Math.abs(data.net_income).toLocaleString()}`
      )
      loadClosings()
    },
    {
      onError: (error) => {
        logger.error('結轉失敗:', error)
        toast.error(error instanceof Error ? error.message : PAGE_LABELS.CLOSE_FAILED)
      },
    }
  )

  const handleClose = async () => {
    if (checkIfClosed()) {
      toast.error(PAGE_LABELS.ALREADY_CLOSED)
      return
    }

    const { start, end } = getPeriodDates()

    const ok = await confirm(
      `確定要執行 ${periodTypeLabels[periodType]}（${start} ~ ${end}）？此操作將結轉損益科目餘額，執行後無法復原！`,
      { title: `執行${periodTypeLabels[periodType]}`, type: 'warning', confirmText: '確認執行', cancelText: '取消' }
    )

    if (!ok) return

    await executeClose()
  }

  const isClosed = checkIfClosed()
  const { start, end } = getPeriodDates()

  return (
    <ContentPageLayout title={t('periodClosing')}>
      <div className="space-y-6">
        {/* 執行結轉 */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar size={20} />
            執行期末結轉
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <Label>{PAGE_LABELS.PERIOD_TYPE}</Label>
              <Select
                value={periodType}
                onValueChange={(value: 'month' | 'quarter' | 'year') => setPeriodType(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">{PAGE_LABELS.MONTHLY_CLOSING}</SelectItem>
                  <SelectItem value="quarter">{PAGE_LABELS.QUARTERLY_CLOSING}</SelectItem>
                  <SelectItem value="year">{PAGE_LABELS.YEARLY_CLOSING}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{PAGE_LABELS.YEAR}</Label>
              <Select value={year.toString()} onValueChange={value => setYear(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                    <SelectItem key={y} value={y.toString()}>
                      {y} 年
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {periodType === 'month' && (
              <div>
                <Label>{PAGE_LABELS.MONTH}</Label>
                <Select value={month.toString()} onValueChange={value => setMonth(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <SelectItem key={m} value={m.toString()}>
                        {m} 月
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {periodType === 'quarter' && (
              <div>
                <Label>{PAGE_LABELS.QUARTER}</Label>
                <Select
                  value={quarter.toString()}
                  onValueChange={value => setQuarter(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4].map(q => (
                      <SelectItem key={q} value={q.toString()}>
                        Q{q}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="bg-muted p-4 rounded-lg mb-4">
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">期間：</span>
                <span className="font-mono">
                  {start} ~ {end}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">狀態：</span>
                {isClosed ? (
                  <Badge variant="outline" className="text-morandi-green">
                    <CheckCircle size={14} className="mr-1" />
                    已結轉
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <AlertCircle size={14} className="mr-1" />
                    未結轉
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <Button onClick={handleClose} disabled={isLoading || isClosed} className="w-full">
            {isLoading ? '結轉中...' : isClosed ? '此期間已結轉' : '執行結轉'}
          </Button>

          <div className="mt-4 text-sm text-muted-foreground">
            <p className="font-semibold mb-2">執行結轉將會：</p>
            <ul className="list-disc list-inside space-y-1">
              <li>計算所有損益科目（收入、費用、成本）的餘額</li>
              <li>將損益科目餘額結轉到「3200 本期損益」</li>
              {periodType === 'year' && (
                <li className="text-status-warning font-semibold">
                  【年結特殊】將「3200 本期損益」結轉到「3300 保留盈餘」
                </li>
              )}
              <li>生成結轉傳票（狀態：已鎖定）</li>
              <li>記錄本次結轉歷史（無法重複結轉）</li>
            </ul>
          </div>
        </Card>

        {/* 結轉歷史 */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">{PAGE_LABELS.CLOSING_HISTORY}</h2>

          {closings.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">{PAGE_LABELS.NO_CLOSING_RECORDS}</div>
          ) : (
            <div className="space-y-2">
              {closings.map(closing => (
                <div
                  key={closing.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium">
                      {periodTypeLabels[closing.period_type as keyof typeof periodTypeLabels] ||
                        closing.period_type}{' '}
                      - {closing.period_start} ~ {closing.period_end}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      結轉時間：
                      {closing.closed_at
                        ? new Date(closing.closed_at).toLocaleString('zh-TW')
                        : '-'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`font-semibold ${closing.net_income >= 0 ? 'text-morandi-green' : 'text-morandi-red'}`}
                    >
                      {closing.net_income >= 0 ? '淨利' : '淨損'}
                    </div>
                    <div className="font-mono text-sm">
                      ${Math.abs(closing.net_income).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </ContentPageLayout>
  )
}
