'use client'

import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FileCheck, Tag, Trash2, X, ChevronDown } from 'lucide-react'
import { confirm } from '@/lib/ui/alert-dialog'
import { cn } from '@/lib/utils'
import type { Todo } from '@/stores/types'

const STATUS_LABELS: Record<string, string> = {
  pending: '待處理',
  in_progress: '進行中',
  completed: '已完成',
  cancelled: '已取消',
}

const STATUS_OPTIONS = [
  { value: 'pending', dot: 'bg-morandi-muted' },
  { value: 'in_progress', dot: 'bg-morandi-gold' },
  { value: 'completed', dot: 'bg-status-success' },
  { value: 'cancelled', dot: 'bg-status-danger' },
] as const

interface Employee {
  id: string
  display_name?: string | null
  chinese_name?: string | null
  english_name?: string | null
}

interface TodoSidebarProps {
  todo: {
    status: string
    priority?: number
    deadline?: string
    tags?: string[]
    title: string
    visibility?: string[]
  }
  canEdit: boolean
  currentUserId?: string
  employees: Employee[]
  onUpdate: (updates: Partial<Todo>) => void
  onClose: () => void
  onDelete?: () => void | Promise<void>
}

const COMPONENT_LABELS = {
  STATUS: '狀態',
  PRIORITY: '優先度',
  DEADLINE: '到期日',
  ACTIONS: '動作',
  SAVE_CLOSE: '存檔',
  REOPEN: '重新開啟',
  MARK_COMPLETE: '標記完成',
  CONFIRM_DELETE_PREFIX: '確定刪除「',
  CONFIRM_DELETE_SUFFIX: '」？',
  DELETE: '刪除',
  SHARE_WITH_TEAMMATES: '共享給夥伴',
  SHARE_NO_OTHERS: '您是 workspace 唯一成員、暫無對象可共享',
  SHARE_ALL_SHARED: '已共享給所有可選成員',
  SELECT_MEMBER: '選擇成員...',
  ADD_TO_SHARE: '加入共享',
} as const

export function TodoSidebar({
  todo,
  canEdit,
  currentUserId,
  employees,
  onUpdate,
  onClose,
  onDelete,
}: TodoSidebarProps) {
  const t = useTranslations('todos')
  const [showShareForm, setShowShareForm] = useState(false)
  const [shareTargetId, setShareTargetId] = useState('')
  const [newTagInput, setNewTagInput] = useState('')

  const tags = todo.tags || []
  const currentVisibility = todo.visibility || []

  const addTag = (raw: string) => {
    const t = raw.trim()
    if (!t || tags.includes(t)) return
    onUpdate({ tags: [...tags, t] })
  }
  const removeTag = (t: string) => {
    onUpdate({ tags: tags.filter(x => x !== t) })
  }

  const getStatusDot = (status: string) =>
    STATUS_OPTIONS.find(s => s.value === status)?.dot || 'bg-morandi-muted'

  const getStatusLabel = (status: string) => STATUS_LABELS[status] || status

  return (
    <aside className="w-[16rem] pl-3 pr-4 py-4 space-y-3 shrink-0 overflow-y-auto border-l border-border/40">
      <div>
        <label className="text-xs font-medium text-morandi-muted mb-1.5 block">
          {COMPONENT_LABELS.STATUS}
        </label>
        <Select
          value={todo.status}
          onValueChange={(v: 'pending' | 'in_progress' | 'completed' | 'cancelled') => {
            if (!canEdit) return
            onUpdate({ status: v, completed: v === 'completed' })
          }}
          disabled={!canEdit}
        >
          <SelectTrigger className="w-full h-8 text-sm">
            <div className="flex items-center gap-2">
              <div className={cn('w-2 h-2 rounded-full', getStatusDot(todo.status))} />
              <span>{getStatusLabel(todo.status)}</span>
            </div>
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                <div className="flex items-center gap-2">
                  <div className={cn('w-2 h-2 rounded-full', opt.dot)} />
                  <span>{STATUS_LABELS[opt.value]}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-xs font-medium text-morandi-muted mb-1.5 block">
          {COMPONENT_LABELS.PRIORITY}
        </label>
        <Select
          value={String(todo.priority || 3)}
          onValueChange={v => canEdit && onUpdate({ priority: Number(v) as 1 | 2 | 3 | 4 | 5 })}
          disabled={!canEdit}
        >
          <SelectTrigger className="w-full h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-status-danger" />
                緊急
              </span>
            </SelectItem>
            <SelectItem value="4">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-status-danger" />高
              </span>
            </SelectItem>
            <SelectItem value="3">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-status-warning" />中
              </span>
            </SelectItem>
            <SelectItem value="2">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-status-neutral" />低
              </span>
            </SelectItem>
            <SelectItem value="1">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-morandi-muted" />
                很低
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-xs font-medium text-morandi-muted mb-1.5 block">
          {COMPONENT_LABELS.DEADLINE}
        </label>
        <DatePicker
          value={todo.deadline || ''}
          onChange={v => canEdit && onUpdate({ deadline: v || undefined })}
          disabled={!canEdit}
        />
      </div>

      <div>
        <label className="text-xs font-medium text-morandi-muted mb-1.5 block">{t('tags')}</label>
        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {tags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.588rem] bg-morandi-gold/10 text-morandi-gold border border-morandi-gold/20"
              >
                {tag}
                {canEdit && (
                  <button
                    onClick={() => removeTag(tag)}
                    className="hover:bg-status-danger/20 rounded"
                    title={t('remove')}
                  >
                    <X size={10} />
                  </button>
                )}
              </span>
            ))}
          </div>
        ) : (
          !canEdit && <p className="text-xs text-morandi-muted mb-1.5">{t('noTags')}</p>
        )}
        {canEdit && (
          <Input
            type="text"
            value={newTagInput}
            onChange={e => setNewTagInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing && newTagInput.trim()) {
                e.preventDefault()
                addTag(newTagInput)
                setNewTagInput('')
              }
            }}
            placeholder={t('addTagPlaceholder')}
            className="h-7 text-xs"
          />
        )}
      </div>

      <div>
        <label className="text-xs font-medium text-morandi-muted mb-2 block">
          {COMPONENT_LABELS.ACTIONS}
        </label>
        <div className="flex flex-col gap-1">
          <button
            onClick={() => onClose()}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-morandi-secondary hover:bg-morandi-container/30 transition-colors text-left"
          >
            <FileCheck className="w-3.5 h-3.5" />
            {COMPONENT_LABELS.SAVE_CLOSE}
          </button>
          <button
            onClick={() => {
              if (!canEdit) return
              const isCompleted = todo.status === 'completed'
              onUpdate({
                status: isCompleted ? 'pending' : 'completed',
                completed: !isCompleted,
              })
            }}
            disabled={!canEdit}
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors text-left',
              todo.status === 'completed'
                ? 'text-morandi-secondary hover:bg-morandi-container/30'
                : 'text-status-success hover:bg-status-success/10'
            )}
          >
            <FileCheck className="w-3.5 h-3.5" />
            {todo.status === 'completed' ? COMPONENT_LABELS.REOPEN : COMPONENT_LABELS.MARK_COMPLETE}
          </button>
          <button
            onClick={async () => {
              if (!onDelete) return
              const ok = await confirm(
                `${COMPONENT_LABELS.CONFIRM_DELETE_PREFIX}${todo.title}${COMPONENT_LABELS.CONFIRM_DELETE_SUFFIX}`,
                { title: '刪除待辦事項', type: 'warning' }
              )
              if (!ok) return
              await onDelete()
            }}
            disabled={!onDelete || !canEdit}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-status-danger hover:bg-status-danger/10 disabled:opacity-50 transition-colors text-left"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {COMPONENT_LABELS.DELETE}
          </button>
        </div>
      </div>

      {/* 共享 section */}
      <div className="pt-3 border-t border-border">
        <button
          onClick={() => canEdit && setShowShareForm(s => !s)}
          disabled={!canEdit}
          className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-morandi-gold hover:bg-morandi-container/30 disabled:opacity-50 transition-colors text-left w-full"
        >
          <Tag className="w-3.5 h-3.5" />
          {COMPONENT_LABELS.SHARE_WITH_TEAMMATES}
          <ChevronDown
            className={cn('w-3 h-3 ml-auto transition-transform', showShareForm && 'rotate-180')}
          />
        </button>
        {showShareForm &&
          canEdit &&
          (() => {
            const otherEmployees = employees.filter(emp => emp.id !== currentUserId)
            const sharedWith = otherEmployees.filter(emp => currentVisibility.includes(emp.id))
            const availableToShare = otherEmployees.filter(
              emp => !currentVisibility.includes(emp.id)
            )

            return (
              <div className="mt-2 space-y-2 px-2">
                {sharedWith.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {sharedWith.map(emp => (
                      <span
                        key={emp.id}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.588rem] bg-status-success/10 text-status-success border border-status-success/20"
                      >
                        {emp.display_name || emp.chinese_name || emp.english_name}
                        <button
                          onClick={() => {
                            onUpdate({
                              visibility: currentVisibility.filter(id => id !== emp.id),
                            })
                          }}
                          className="hover:bg-status-danger/20 rounded"
                          title={t('removeShare')}
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {otherEmployees.length === 0 ? (
                  <p className="text-xs text-morandi-muted">{COMPONENT_LABELS.SHARE_NO_OTHERS}</p>
                ) : availableToShare.length === 0 ? (
                  <p className="text-xs text-morandi-muted">{COMPONENT_LABELS.SHARE_ALL_SHARED}</p>
                ) : (
                  <>
                    <Select value={shareTargetId} onValueChange={setShareTargetId}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder={COMPONENT_LABELS.SELECT_MEMBER} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableToShare.map(emp => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.display_name || emp.chinese_name || emp.english_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="soft-gold"
                      size="sm"
                      className="w-full h-8 text-xs"
                      disabled={!shareTargetId}
                      onClick={() => {
                        onUpdate({
                          visibility: [...currentVisibility, shareTargetId],
                        })
                        setShareTargetId('')
                      }}
                    >
                      {COMPONENT_LABELS.ADD_TO_SHARE}
                    </Button>
                  </>
                )}
              </div>
            )
          })()}
      </div>
    </aside>
  )
}
