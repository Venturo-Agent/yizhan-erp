'use client'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTranslations } from 'next-intl'

interface Employee {
  id: string
  display_name?: string | null
  chinese_name?: string | null
  english_name?: string | null
}

interface TodoFiltersBarProps {
  priorityFilter: number | 'all'
  memberFilter: string
  employees: Employee[] | undefined
  onPriorityChange: (value: number | 'all') => void
  onMemberChange: (value: string) => void
}

export function TodoFiltersBar({
  priorityFilter,
  memberFilter,
  employees,
  onPriorityChange,
  onMemberChange,
}: TodoFiltersBarProps) {
  const t = useTranslations('todos')
  const hasActiveFilter = priorityFilter !== 'all' || memberFilter !== 'all'

  return (
    <div className="flex items-center gap-2">
      <Select
        value={String(priorityFilter)}
        onValueChange={v =>
          onPriorityChange(v === 'all' ? 'all' : (Number(v) as 1 | 2 | 3 | 4 | 5))
        }
      >
        <SelectTrigger className="h-9 w-[120px] text-xs">
          <SelectValue placeholder={t('priority')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('allPriorities')}</SelectItem>
          <SelectItem value="5">★★★★★ 緊急</SelectItem>
          <SelectItem value="4">★★★★ 高</SelectItem>
          <SelectItem value="3">★★★ 中</SelectItem>
          <SelectItem value="2">★★ 低</SelectItem>
          <SelectItem value="1">★ 很低</SelectItem>
        </SelectContent>
      </Select>
      <Select value={memberFilter} onValueChange={onMemberChange}>
        <SelectTrigger className="h-9 w-[120px] text-xs">
          <SelectValue placeholder={t('assignee')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('allAssignees')}</SelectItem>
          {employees?.map(emp => (
            <SelectItem key={emp.id} value={emp.id}>
              {emp.display_name || emp.chinese_name || emp.english_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasActiveFilter && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 text-xs text-morandi-secondary"
          onClick={() => {
            onPriorityChange('all')
            onMemberChange('all')
          }}
        >
          清除篩選
        </Button>
      )}
    </div>
  )
}
