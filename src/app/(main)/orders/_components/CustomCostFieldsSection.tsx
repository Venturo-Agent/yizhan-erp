'use client'
/**
 * CustomCostFieldsSection - 自訂費用欄位區域
 * 團體模式使用，管理自訂費用項目
 */

import React, { useState } from 'react'
import { Coins, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormDialog } from '@/components/dialog'
import type { CustomCostField } from '../_types/order-member.types'
import { useTranslations } from 'next-intl'

interface CustomCostFieldsSectionProps {
  fields: CustomCostField[]
  onAddField: (name: string) => void
  onRemoveField: (fieldId: string) => void
}

export function CustomCostFieldsSection({
  fields,
  onAddField,
  onRemoveField,
}: CustomCostFieldsSectionProps) {
  const t = useTranslations('orders')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newFieldName, setNewFieldName] = useState('')

  const handleAdd = () => {
    if (newFieldName.trim()) {
      onAddField(newFieldName.trim())
      setNewFieldName('')
      setShowAddDialog(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Coins size={16} className="text-morandi-gold" />
        <span className="text-sm font-medium text-morandi-primary">
          {t('customCostFields')} ({fields.length})
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAddDialog(true)}
          className="ml-auto"
        >
          <Plus size={14} className="mr-1" />
          {t('addCostField')}
        </Button>
      </div>

      {fields.length > 0 && (
        <div className="space-y-2">
          {fields.map(field => (
            <div
              key={field.id}
              className="flex items-center gap-2 px-3 py-2 bg-status-success/10 rounded border border-status-success/30"
            >
              <span className="flex-1 text-sm text-morandi-primary">{field.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemoveField(field.id)}
                className="text-status-danger hover:text-status-danger"
              >
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* 新增欄位對話框 */}
      <FormDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        title={t('addCustomCostField')}
        onSubmit={handleAdd}
        loading={false}
        submitDisabled={!newFieldName.trim()}
        submitLabel={t('add')}
        cancelLabel={t('cancel')}
        onCancel={() => setShowAddDialog(false)}
        level={2}
        maxWidth="md"
      >
        <div className="py-4">
          <Input
            placeholder={t('addCostFieldPlaceholder')}
            value={newFieldName}
            onChange={e => setNewFieldName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleAdd()
            }}
            autoFocus
          />
        </div>
      </FormDialog>
    </>
  )
}
