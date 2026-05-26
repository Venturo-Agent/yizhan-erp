'use client'

/**
 * SeveranceCalculatorDialog — 離職 / 資遣試算
 *
 * 2026-05-15 William 拍板：
 *   - 試算工具放員工列表 row action「資遣試算」按鈕
 *   - 包含平均工資算法 + 資遣費 + 未休特休折算
 *   - 不寫 DB、純試算、給 HR 跟員工溝通用
 */

import { useEffect, useMemo, useState } from 'react'
import { Calculator, RefreshCw } from 'lucide-react'

import { FormDialog } from '@/components/dialog/form-dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { EmployeeFull } from '@/stores/types'
import {
  calcAnnualLeave,
  calcSeverance,
  calcYearsOfService,
  calcAvgMonthlyWage,
  estimateAvgWageFromSalaryInfo,
  type LeavePolicy,
  type PensionSystem,
} from '@/lib/hr/leave-severance-calculator'

interface SeveranceCalculatorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employee: EmployeeFull | null
}

const PENSION_LABEL: Record<PensionSystem, string> = {
  old: '舊制（勞基法第 17 條、1 年 1 月）',
  new: '新制（勞退條例第 12 條、1 年 0.5 月、上限 6 月）',
  mixed: '跨制（2005/7/1 前舊制 + 之後新制）',
}

const LEAVE_LABEL: Record<LeavePolicy, string> = {
  hire_anniversary: '週年制（以到職日週年計）',
  calendar_year: '年度制（曆年 1/1 重算）',
}

interface PayslipRow {
  /** 'YYYY-MM' */
  period: string
  /** 該月薪資（gross） */
  amount: number
}

function formatTWD(n: number): string {
  // 2026-05-26 台幣不顯示符號（William 拍板）
  if (!Number.isFinite(n)) return '0'
  return `${Math.round(n).toLocaleString()}`
}

function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export function SeveranceCalculatorDialog({
  open,
  onOpenChange,
  employee,
}: SeveranceCalculatorDialogProps) {
  const [terminationDate, setTerminationDate] = useState<string>(todayISO())
  const [pensionSystem, setPensionSystem] = useState<PensionSystem>('new')
  const [leavePolicy, setLeavePolicy] = useState<LeavePolicy>('hire_anniversary')
  const [payslipFetched, setPayslipFetched] = useState(false)
  const [payslipRows, setPayslipRows] = useState<PayslipRow[]>([])
  const [payslipLoading, setPayslipLoading] = useState(false)
  const [payslipError, setPayslipError] = useState<string | null>(null)
  // 平均工資（手動可覆寫、預設用 payslip 或 salary_info 估算）
  const [avgWage, setAvgWage] = useState<number>(0)
  const [policyLoaded, setPolicyLoaded] = useState(false)

  // 撈當前 workspace 的 leave_policy / pension_system（公司預設）
  useEffect(() => {
    if (!open || !employee?.workspace_id) return
    let cancelled = false
    setPolicyLoaded(false)
    fetch(`/api/workspaces/${employee.workspace_id}`)
      .then(r => (r.ok ? r.json() : null))
      .then(json => {
        if (cancelled || !json) return
        const w = json.workspace ?? json
        if (w?.pension_system && ['old', 'new', 'mixed'].includes(w.pension_system)) {
          setPensionSystem(w.pension_system as PensionSystem)
        }
        if (w?.leave_policy && ['calendar_year', 'hire_anniversary'].includes(w.leave_policy)) {
          setLeavePolicy(w.leave_policy as LeavePolicy)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setPolicyLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [open, employee?.workspace_id])

  // 撈最近 6 個月實際薪資 (salary_settlement_items)、沒有就 fallback estimate
  useEffect(() => {
    if (!open || !employee) return
    let cancelled = false
    setPayslipFetched(false)
    setPayslipError(null)
    setPayslipLoading(true)
    fetch(`/api/hr/salary-settlements?employee_id=${employee.id}&recent=6`)
      .then(r => (r.ok ? r.json() : null))
      .then(json => {
        if (cancelled) return
        const items: Array<{ period?: string; gross_pay?: number; amount?: number }> =
          json?.items ?? json?.recent ?? []
        const rows: PayslipRow[] = items
          .map(it => ({
            period: String(it.period ?? ''),
            amount: Number(it.gross_pay ?? it.amount ?? 0),
          }))
          .filter(r => r.amount > 0)
          .slice(0, 6)
        setPayslipRows(rows)
        setPayslipFetched(true)
      })
      .catch(err => {
        if (cancelled) return
        setPayslipError(err?.message ?? '撈薪資失敗')
        setPayslipFetched(true)
      })
      .finally(() => {
        if (!cancelled) setPayslipLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, employee])

  // 預設平均工資：實際薪資優先、無則用 salary_info 估算
  useEffect(() => {
    if (!employee || !payslipFetched) return
    if (payslipRows.length > 0) {
      setAvgWage(calcAvgMonthlyWage(payslipRows.map(r => r.amount)))
    } else {
      const est = estimateAvgWageFromSalaryInfo(employee.salary_info ?? {})
      setAvgWage(est || Number(employee.monthly_salary ?? 0) || 0)
    }
  }, [employee, payslipFetched, payslipRows])

  const result = useMemo(() => {
    if (!employee?.job_info?.hire_date) return null
    const hireDate = new Date(employee.job_info.hire_date)
    const termDate = new Date(terminationDate)
    if (Number.isNaN(hireDate.getTime()) || Number.isNaN(termDate.getTime())) return null
    if (termDate < hireDate) return null

    const years = calcYearsOfService(hireDate, termDate)
    const severance = calcSeverance(hireDate, termDate, avgWage, pensionSystem)
    const leave = calcAnnualLeave(hireDate, termDate, leavePolicy)
    // 未休特休折算工資（按 平均工資 / 30 * 天數）
    const leavePayout = Math.round((avgWage / 30) * leave.proRatedDays)
    const total = severance.totalSeverance + leavePayout

    return {
      yearsOfService: years,
      severance,
      leave,
      leavePayout,
      total,
    }
  }, [employee, terminationDate, avgWage, pensionSystem, leavePolicy])

  if (!employee) return null

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        <span className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-morandi-primary" />
          離職 / 資遣試算
        </span>
      }
      subtitle={`${employee.display_name}（${employee.employee_number}）`}
      maxWidth="3xl"
      showFooter={false}
      loading={false}
      level={2}
      nested
    >
      <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
        {/* ─── 輸入區 ─── */}
        <div className="rounded-lg border border-morandi-border bg-morandi-surface p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-morandi-muted block mb-1">離職 / 資遣日</label>
              <Input
                type="date"
                value={terminationDate}
                onChange={e => setTerminationDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-morandi-muted block mb-1">到職日（唯讀）</label>
              <Input type="date" value={employee.job_info?.hire_date ?? ''} readOnly disabled />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-morandi-muted block mb-1">
                資遣費制度（公司預設、可單筆覆寫）
              </label>
              <select
                value={pensionSystem}
                onChange={e => setPensionSystem(e.target.value as PensionSystem)}
                className="w-full h-9 px-3 rounded-md border border-morandi-border bg-morandi-surface text-sm"
              >
                <option value="new">新制</option>
                <option value="old">舊制</option>
                <option value="mixed">跨制</option>
              </select>
              <p className="text-[0.647rem] text-morandi-muted mt-1">
                {PENSION_LABEL[pensionSystem]}
              </p>
            </div>
            <div>
              <label className="text-xs text-morandi-muted block mb-1">特休制度</label>
              <select
                value={leavePolicy}
                onChange={e => setLeavePolicy(e.target.value as LeavePolicy)}
                className="w-full h-9 px-3 rounded-md border border-morandi-border bg-morandi-surface text-sm"
              >
                <option value="hire_anniversary">週年制</option>
                <option value="calendar_year">年度制</option>
              </select>
              <p className="text-[0.647rem] text-morandi-muted mt-1">{LEAVE_LABEL[leavePolicy]}</p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-morandi-muted">
                平均工資（離職前 6 個月、勞基法第 2 條）
              </label>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[0.647rem] gap-1"
                onClick={() => {
                  if (payslipRows.length > 0) {
                    setAvgWage(calcAvgMonthlyWage(payslipRows.map(r => r.amount)))
                  } else {
                    const est = estimateAvgWageFromSalaryInfo(employee.salary_info ?? {})
                    setAvgWage(est || Number(employee.monthly_salary ?? 0) || 0)
                  }
                }}
              >
                <RefreshCw className="h-3 w-3" />
                重設
              </Button>
            </div>
            <Input
              type="number"
              value={avgWage || ''}
              onChange={e => setAvgWage(Number(e.target.value || 0))}
              placeholder="平均工資"
            />
            {payslipLoading && (
              <p className="text-[0.647rem] text-morandi-muted mt-1">正在撈最近薪資結算...</p>
            )}
            {payslipError && (
              <p className="text-[0.647rem] text-status-warning mt-1">
                ⚠ {payslipError}、改用 salary_info 估算
              </p>
            )}
            {payslipFetched && !payslipLoading && (
              <p className="text-[0.647rem] text-morandi-muted mt-1">
                {payslipRows.length > 0
                  ? `來源：最近 ${payslipRows.length} 月實際薪資結算（${payslipRows.map(r => r.period).join(' / ')}）`
                  : '尚無薪資結算紀錄、用 salary_info（base_salary + 全勤 + 津貼）估算'}
              </p>
            )}
          </div>
        </div>

        {/* ─── 試算結果 ─── */}
        {result && (
          <div className="rounded-lg border border-morandi-border bg-morandi-background p-4 space-y-4">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs text-morandi-muted">年資</p>
                <p className="font-mono text-morandi-primary text-base">
                  {result.yearsOfService.toFixed(2)} 年
                </p>
              </div>
              <div>
                <p className="text-xs text-morandi-muted">資遣費（{pensionSystem}）</p>
                <p className="font-mono text-morandi-primary text-base">
                  {formatTWD(result.severance.totalSeverance)}
                </p>
              </div>
              <div>
                <p className="text-xs text-morandi-muted">未休特休折算</p>
                <p className="font-mono text-morandi-primary text-base">
                  {formatTWD(result.leavePayout)}
                </p>
              </div>
            </div>

            <hr className="border-morandi-border" />

            <div className="space-y-2 text-sm">
              <p className="text-xs text-morandi-muted">資遣費明細</p>
              {result.severance.system === 'mixed' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-morandi-muted">
                      舊制段 {result.severance.oldYears.toFixed(2)} 年 × 1 月
                    </span>
                    <span className="font-mono">{formatTWD(result.severance.oldSeverance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-morandi-muted">
                      新制段 {result.severance.newYears.toFixed(2)} 年 × 0.5 月（上限 6 月）
                    </span>
                    <span className="font-mono">{formatTWD(result.severance.newSeverance)}</span>
                  </div>
                </>
              )}
              {result.severance.system !== 'mixed' && (
                <p className="text-xs text-morandi-muted">{result.severance.notes}</p>
              )}
            </div>

            <div className="space-y-2 text-sm">
              <p className="text-xs text-morandi-muted">未休特休</p>
              <div className="flex justify-between">
                <span className="text-morandi-muted">
                  本期間應發 {result.leave.proRatedDays} 天 × 平均工資 ÷ 30
                </span>
                <span className="font-mono">{formatTWD(result.leavePayout)}</span>
              </div>
              <p className="text-[0.647rem] text-morandi-muted">{result.leave.notes}</p>
            </div>

            <hr className="border-morandi-border" />

            <div className="flex justify-between items-center">
              <span className="text-sm text-morandi-muted">應付總計</span>
              <span className="font-mono text-xl text-morandi-primary font-semibold">
                {formatTWD(result.total)}
              </span>
            </div>

            <p className="text-[0.647rem] text-morandi-muted leading-relaxed">
              ※ 此為試算、未寫入資料庫。實際資遣費依勞基法第 17 條 / 勞退條例第 12 條；
              未休特休依勞基法第 38 條第 4 項折算工資。請以正式契約 + 預告期工資另行計算。
            </p>
          </div>
        )}

        {!result && (
          <div className="rounded-lg border border-status-warning/30 bg-status-warning-bg p-3 text-sm text-status-warning">
            無法試算：請確認到職日 + 離職日資料正確（離職日不可早於到職日）。
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            關閉
          </Button>
        </div>
      </div>
    </FormDialog>
  )
}
