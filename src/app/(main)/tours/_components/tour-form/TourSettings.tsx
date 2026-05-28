'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { FormLabel } from '@/components/ui/form-label'
import { Combobox } from '@/components/ui/combobox'
import { useEmployeesSlim } from '@/data'
import type { NewTourData } from '../../_types'
import { logger } from '@/lib/utils/logger'
import { apiGet } from '@/lib/api/client'

import { Spinner } from '@/components/ui/spinner'
interface SelectorField {
  id: string
  name: string
  level: 'tour' | 'order'
  is_required: boolean
  roles: { id: string; name: string }[]
}

interface TourSettingsProps {
  newTour: NewTourData
  setNewTour: React.Dispatch<React.SetStateAction<NewTourData>>
}

export function TourSettings({ newTour, setNewTour }: TourSettingsProps) {
  const t = useTranslations('tour')
  const { items: employees } = useEmployeesSlim({ all: true })
  const [selectorFields, setSelectorFields] = useState<SelectorField[]>([])
  const [loading, setLoading] = useState(true)

  // 載入團級選人欄位
  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiGet<SelectorField[]>('/api/job-roles/selector-fields')
        setSelectorFields(data.filter(f => f.level === 'tour'))
      } catch (err) {
        logger.error('Failed to fetch selector fields:', err)
      }
      setLoading(false)
    }
    load()
  }, [])

  // 所有在職員工（離職員工 status 會切到非 'active'，無需另外擋）
  const activeEmployees = useMemo(() => {
    return employees.filter(emp => emp.status === 'active')
  }, [employees])

  // 根據欄位映射的職務過濾員工
  const getFilteredEmployees = (field: SelectorField) => {
    if (field.roles.length === 0) return activeEmployees

    const roleIds = new Set(field.roles.map(r => r.id))
    return activeEmployees.filter(emp => {
      const empRoleId = (emp as unknown as { role_id?: string }).role_id
      return empRoleId && roleIds.has(empRoleId)
    })
  }

  const handleAssignment = (fieldId: string, employeeId: string) => {
    setNewTour(prev => ({
      ...prev,
      role_assignments: {
        ...prev.role_assignments,
        [fieldId]: employeeId || '',
      },
    }))
  }

  // loading 中也 return null（不 render Spinner）：
  // 因為 selectorFields 可能載入完是空、會 return null（下一行）；
  // 若 loading 中 render Spinner、loading 完變 null，會出現「東西突然消失」的閃動。
  // 改成全程 null（直到有東西才 render）——從使用者角度是「沒東西就沒東西」、不會閃。
  if (loading) return null

  // 沒有設定任何團級選人欄位
  if (selectorFields.length === 0) return null

  return (
    <div className="space-y-4">
      {selectorFields.map(field => {
        const filtered = getFilteredEmployees(field)
        return (
          <div key={field.id}>
            <FormLabel required={field.is_required}>
              {field.name}{' '}
              {!field.is_required && (
                <span className="text-morandi-secondary font-normal">{t('tourFormOptional')}</span>
              )}
            </FormLabel>
            <Combobox
              options={filtered.map(emp => ({
                value: emp.id,
                label: `${emp.display_name || emp.english_name} (${emp.employee_number})`,
              }))}
              value={newTour.role_assignments?.[field.id] || ''}
              onChange={value => handleAssignment(field.id, value)}
              placeholder={`選擇${field.name}...`}
              emptyMessage={`找不到可選的${field.name}`}
              showSearchIcon={true}
              showClearButton={true}
              disablePortal={true}
            />
          </div>
        )
      })}
    </div>
  )
}
