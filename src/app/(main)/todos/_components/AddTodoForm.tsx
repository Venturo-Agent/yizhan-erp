'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StarRating } from '@/components/ui/star-rating'
import { DatePicker } from '@/components/ui/date-picker'
import { Plus, X } from 'lucide-react'
import { useEmployeesSlim } from '@/data'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

type QuickAction = 'receipt' | 'invoice' | 'group' | 'quote' | 'assign'

interface AddTodoFormData {
  title: string
  priority: 1 | 2 | 3 | 4 | 5
  deadline: string
  assignee: string
  enabled_quick_actions: QuickAction[]
}

interface AddTodoFormProps {
  onSubmit: (data: AddTodoFormData) => void
  onCancel: () => void
  isSubmitting?: boolean
}

export function AddTodoForm({ onSubmit, onCancel, isSubmitting }: AddTodoFormProps) {
  const t = useTranslations('todos')
  const { items: users, loading: isLoadingUsers } = useEmployeesSlim()
  const [formData, setFormData] = useState<AddTodoFormData>({
    title: '',
    priority: 3,
    deadline: '',
    assignee: '',
    enabled_quick_actions: ['receipt', 'quote'],
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      toast.error(t('enterTitle'))
      return
    }
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-morandi-primary mb-1">
          {t('taskTitle')}
        </label>
        <Input
          value={formData.title}
          onChange={e => setFormData({ ...formData, title: e.target.value })}
          placeholder={t('enterTaskTitle')}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-morandi-primary mb-1">
          {t('urgency')}
        </label>
        <StarRating
          value={formData.priority}
          onChange={value => setFormData({ ...formData, priority: value as 1 | 2 | 3 | 4 | 5 })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-morandi-primary mb-1">
          {t('deadline')}
        </label>
        <DatePicker
          value={formData.deadline}
          onChange={date => setFormData({ ...formData, deadline: date })}
          placeholder={t('selectDate')}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-morandi-primary mb-1">
          {t('assignToOptional')}
        </label>
        <Select
          value={formData.assignee || '__none__'}
          onValueChange={value =>
            setFormData({ ...formData, assignee: value === '__none__' ? '' : value })
          }
          disabled={isLoadingUsers}
        >
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={isLoadingUsers ? t('loadingEmployees') : t('noAssign')}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">{t('noAssign')}</SelectItem>
            {users &&
              users.map(user => (
                <SelectItem key={user.id} value={user.id}>
                  {user.display_name} ({user.employee_number})
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 pt-4">
        <Button
          variant="soft-gold"
          type="submit"
          disabled={isSubmitting}
          className="flex-1 gap-2"
        >
          <Plus size={16} />
          {t('createTask')}
        </Button>
        <Button type="button" variant="soft-gold" onClick={onCancel} className="gap-2">
          <X size={16} />
          {t('cancel')}
        </Button>
      </div>
    </form>
  )
}
