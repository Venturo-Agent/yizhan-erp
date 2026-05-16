'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { FormDialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { Copy, Check, Plane } from 'lucide-react'
import { useMembers, useToursSlim } from '@/data'
import type { Todo } from '@/stores/types'
import { cn } from '@/lib/utils'

const COMPONENT_LABELS = {
  PASSENGER_LIST_PREFIX: '乘客名單（',
  PASSENGER_LIST_SUFFIX: ' 人）',
  NEED_ORDER_RELATED: '— 請先在右側 sidebar 關聯訂單',
  NO_PASSENGER_DATA: '無乘客資料',
  PAX_ADULT: '成人',
  PAX_CHILD: '兒童',
  PAX_INFANT: '嬰兒',
  NO_NAME: '(無姓名)',
  NM_TITLE: 'NM 旅客名字指令',
  COPIED: '已複製',
  COPY: '複製',
  NM_EMPTY: '（無乘客資料、PNR 名字無法產生）',
  AN_TITLE: 'AN 班機查詢指令',
  DEPART_DATE: '出發日期',
  DEPART_AIRPORT: '出發機場',
  ARRIVAL_AIRPORT: '抵達機場',
  GENERATED_COMMAND: '產生指令',
  AN_EMPTY: '（請先填入出發日期、起降機場代碼）',
  DIALOG_TITLE: 'PNR 訂位指令工具',
  SELECTED_PREFIX: '已選',
  SELECT_ALL: '全選',
  DESELECT_ALL: '全不選',
} as const

interface PnrToolDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  todo: Todo
}

const MONTH_AMADEUS = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
]

function fmtAmadeusDate(d: string | null | undefined): string {
  if (!d) return ''
  const date = new Date(d)
  if (isNaN(date.getTime())) return ''
  const day = String(date.getDate()).padStart(2, '0')
  return `${day}${MONTH_AMADEUS[date.getMonth()]}${String(date.getFullYear()).slice(-2)}`
}

function getMemberPnrName(m: {
  passport_name?: string | null
  passport_name_print?: string | null
  chinese_name?: string | null
}): string {
  // passport_name = 標準護照拼音、餵 Amadeus NM 指令用（已是斜線格式）
  // passport_name_print = 行李吊牌列印格式、非 Amadeus 格式（最後 fallback）
  return (m.passport_name || m.passport_name_print || m.chinese_name || '').toUpperCase().trim()
}

type PaxType = 'adt' | 'chd' | 'inf'

function classifyMember(m: {
  age?: number | null
  member_type?: string | null
  identity?: string | null
  birth_date?: string | null
}): PaxType {
  const t = (m.member_type || m.identity || '').toLowerCase()
  if (t.includes('inf') || t.includes('嬰') || t.includes('infant')) return 'inf'
  if (t.includes('chd') || t.includes('童') || t.includes('child')) return 'chd'

  if (m.age != null) {
    if (m.age < 2) return 'inf'
    if (m.age < 12) return 'chd'
    return 'adt'
  }

  if (m.birth_date) {
    const birth = new Date(m.birth_date)
    if (!isNaN(birth.getTime())) {
      const now = new Date()
      const age =
        now.getFullYear() -
        birth.getFullYear() -
        (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0)
      if (age < 2) return 'inf'
      if (age < 12) return 'chd'
    }
  }
  return 'adt'
}

/**
 * PNR 訂位指令工具的內容部分（不含 Dialog 包裝）
 * 供 dialog 跟子任務內嵌兩種模式重用
 */
export function PnrToolContent({ todo }: { todo: Todo }) {
  const { items: allMembers } = useMembers({ all: true })
  const { items: tours } = useToursSlim({ all: true })

  const tourRelated = todo.related_items?.find(r => r.type === 'group')
  const orderRelated = todo.related_items?.find(r => r.type === 'order')

  const tour = useMemo(
    () => tours.find(t => t.id === tourRelated?.id),
    [tours, tourRelated]
  )

  const orderMembers = useMemo(
    () => (allMembers || []).filter(m => m.order_id === orderRelated?.id),
    [allMembers, orderRelated]
  )

  // 選擇要納入 NM 指令的團員（機位有限時、員工挑誰要訂）
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  useEffect(() => {
    setSelectedIds(new Set(orderMembers.map(m => m.id)))
  }, [orderMembers])
  const toggleMember = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const selectAll = () => setSelectedIds(new Set(orderMembers.map(m => m.id)))
  const deselectAll = () => setSelectedIds(new Set())

  const [anDate, setAnDate] = useState<string>('')
  const [anFrom, setAnFrom] = useState<string>('TPE')
  const [anTo, setAnTo] = useState<string>('')

  useEffect(() => {
    if (tour?.departure_date) setAnDate(tour.departure_date)
    if (tour?.airport_code) setAnTo(tour.airport_code.toUpperCase())
  }, [tour?.departure_date, tour?.airport_code])

  const nmCommand = useMemo(() => {
    const selectedMembers = orderMembers.filter(m => selectedIds.has(m.id))
    if (selectedMembers.length === 0) return ''
    const adultsAndChildren = selectedMembers.filter(m => classifyMember(m) !== 'inf')
    const infants = selectedMembers.filter(m => classifyMember(m) === 'inf')

    const segments: string[] = []
    adultsAndChildren.forEach((m, idx) => {
      const type = classifyMember(m)
      const prefix = idx === 0 ? 'NM1' : '1'
      let name = getMemberPnrName(m)
      if (!name) return
      if (type === 'chd') {
        const birthStr = m.birth_date ? fmtAmadeusDate(m.birth_date) : '請補生日'
        name = `${name}(CHD/${birthStr})`
      }
      if (idx === 0 && infants.length > 0) {
        const inf = infants[0]
        const infName = getMemberPnrName(inf)
        const infDate = inf.birth_date ? fmtAmadeusDate(inf.birth_date) : '請補生日'
        if (infName) name = `${name}(INF${infName}/${infDate})`
      }
      segments.push(`${prefix}${name}`)
    })
    return segments.join(' ')
  }, [orderMembers])

  const anCommand = useMemo(() => {
    if (!anDate || !anFrom || !anTo) return ''
    const date = new Date(anDate)
    if (isNaN(date.getTime())) return ''
    const day = String(date.getDate()).padStart(2, '0')
    return `AN${day}${MONTH_AMADEUS[date.getMonth()]} ${anFrom.toUpperCase()} ${anTo.toUpperCase()}`
  }, [anDate, anFrom, anTo])

  const [copiedNm, setCopiedNm] = useState(false)
  const [copiedAn, setCopiedAn] = useState(false)

  const copy = async (text: string, setter: (v: boolean) => void) => {
    await navigator.clipboard.writeText(text)
    setter(true)
    setTimeout(() => setter(false), 2000)
  }

  return (
    <div className="space-y-4">
      {/* 乘客名單 */}
      <div className="bg-card border border-border rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-medium text-morandi-primary">
            {COMPONENT_LABELS.PASSENGER_LIST_PREFIX}{orderMembers.length}{COMPONENT_LABELS.PASSENGER_LIST_SUFFIX}
            {!orderRelated && (
              <span className="text-xs text-morandi-muted ml-2">{COMPONENT_LABELS.NEED_ORDER_RELATED}</span>
            )}
          </h4>
          {orderMembers.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-morandi-muted">{COMPONENT_LABELS.SELECTED_PREFIX} {selectedIds.size} / {orderMembers.length}</span>
              <button
                type="button"
                onClick={selectAll}
                className="text-morandi-gold hover:underline"
              >
                {COMPONENT_LABELS.SELECT_ALL}
              </button>
              <span className="text-morandi-muted">·</span>
              <button
                type="button"
                onClick={deselectAll}
                className="text-morandi-gold hover:underline"
              >
                {COMPONENT_LABELS.DESELECT_ALL}
              </button>
            </div>
          )}
        </div>
        {orderMembers.length === 0 ? (
          <p className="text-xs text-morandi-muted">{COMPONENT_LABELS.NO_PASSENGER_DATA}</p>
        ) : (
          <div className="space-y-1 max-h-[160px] overflow-y-auto">
            {orderMembers.map(m => {
              const type = classifyMember(m)
              return (
                <label
                  key={m.id}
                  className="flex items-center gap-2 text-xs cursor-pointer hover:bg-morandi-container/30 rounded px-1 py-0.5"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(m.id)}
                    onChange={() => toggleMember(m.id)}
                    className="cursor-pointer"
                  />
                  <span
                    className={cn(
                      'text-[0.588rem] px-1.5 py-0.5 rounded',
                      type === 'adt'
                        ? 'bg-morandi-container/50 text-morandi-secondary'
                        : type === 'chd'
                          ? 'bg-status-warning/10 text-status-warning'
                          : 'bg-cat-pink/10 text-cat-pink'
                    )}
                  >
                    {type === 'adt' ? COMPONENT_LABELS.PAX_ADULT : type === 'chd' ? COMPONENT_LABELS.PAX_CHILD : COMPONENT_LABELS.PAX_INFANT}
                  </span>
                  <span className="text-morandi-primary">
                    {getMemberPnrName(m) || m.chinese_name || COMPONENT_LABELS.NO_NAME}
                  </span>
                  {m.birth_date && (
                    <span className="text-xs text-morandi-muted">
                      {fmtAmadeusDate(m.birth_date)}
                    </span>
                  )}
                </label>
              )
            })}
          </div>
        )}
      </div>

      {/* NM 指令 */}
      <div className="bg-card border border-border rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-medium text-morandi-primary">{COMPONENT_LABELS.NM_TITLE}</h4>
          <Button
            variant="soft-gold"
            size="sm"
            onClick={() => copy(nmCommand, setCopiedNm)}
            disabled={!nmCommand}
            className="h-7 text-xs gap-1"
          >
            {copiedNm ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copiedNm ? COMPONENT_LABELS.COPIED : COMPONENT_LABELS.COPY}
          </Button>
        </div>
        <pre className="bg-morandi-container/30 rounded p-3 text-xs font-mono text-morandi-primary whitespace-pre-wrap break-all min-h-[60px]">
          {nmCommand || COMPONENT_LABELS.NM_EMPTY}
        </pre>
      </div>

      {/* AN 指令 */}
      <div className="bg-card border border-border rounded-lg p-3">
        <h4 className="text-xs font-medium text-morandi-primary mb-2">{COMPONENT_LABELS.AN_TITLE}</h4>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div>
            <label className="text-xs text-morandi-primary mb-1 block">{COMPONENT_LABELS.DEPART_DATE}</label>
            <DatePicker value={anDate} onChange={setAnDate} className="h-8 text-xs" />
          </div>
          <div>
            <label className="text-xs text-morandi-primary mb-1 block">{COMPONENT_LABELS.DEPART_AIRPORT}</label>
            <Input
              value={anFrom}
              onChange={e => setAnFrom(e.target.value.toUpperCase())}
              placeholder="TPE"
              className="h-8 text-xs"
              maxLength={3}
            />
          </div>
          <div>
            <label className="text-xs text-morandi-primary mb-1 block">{COMPONENT_LABELS.ARRIVAL_AIRPORT}</label>
            <Input
              value={anTo}
              onChange={e => setAnTo(e.target.value.toUpperCase())}
              placeholder="NRT"
              className="h-8 text-xs"
              maxLength={3}
            />
          </div>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-morandi-secondary">{COMPONENT_LABELS.GENERATED_COMMAND}</span>
          <Button
            variant="soft-gold"
            size="sm"
            onClick={() => copy(anCommand, setCopiedAn)}
            disabled={!anCommand}
            className="h-7 text-xs gap-1"
          >
            {copiedAn ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copiedAn ? COMPONENT_LABELS.COPIED : COMPONENT_LABELS.COPY}
          </Button>
        </div>
        <pre className="bg-morandi-container/30 rounded p-3 text-xs font-mono text-morandi-primary min-h-[40px]">
          {anCommand || COMPONENT_LABELS.AN_EMPTY}
        </pre>
      </div>
    </div>
  )
}

/**
 * Dialog 包裝（給 sidebar 業務動作按鈕觸發用）
 */
export function PnrToolDialog({ open, onOpenChange, todo }: PnrToolDialogProps) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        <span className="flex items-center gap-2">
          <Plane className="w-5 h-5 text-morandi-gold" />
          {COMPONENT_LABELS.DIALOG_TITLE}
        </span>
      }
      showFooter={false}
      loading={false}
      level={2}
      maxWidth="2xl"
    >
      <PnrToolContent todo={todo} />
    </FormDialog>
  )
}
