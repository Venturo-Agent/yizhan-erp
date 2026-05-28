'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTranslations } from 'next-intl'

interface TodoFiltersBarProps {
  priorityFilter: number | 'all'
  onPriorityChange: (value: number | 'all') => void
}

export function TodoFiltersBar({ priorityFilter, onPriorityChange }: TodoFiltersBarProps) {
  const t = useTranslations('todos')

  return (
    <Select
      value={String(priorityFilter)}
      onValueChange={v => onPriorityChange(v === 'all' ? 'all' : (Number(v) as 1 | 2 | 3 | 4 | 5))}
    >
      <SelectTrigger className="h-9 w-[120px] text-sm">
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
  )
}
