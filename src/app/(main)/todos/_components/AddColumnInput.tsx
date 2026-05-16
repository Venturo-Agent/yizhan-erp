'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface AddColumnInputProps {
  isAddingColumn: boolean
  newColumnName: string
  addingColumnInFlight: boolean
  onNewColumnNameChange: (name: string) => void
  onAddColumn: () => void
  onCancelAddColumn: () => void
  onStartAddColumn: () => void
}

export function AddColumnInput({
  isAddingColumn,
  newColumnName,
  addingColumnInFlight,
  onNewColumnNameChange,
  onAddColumn,
  onCancelAddColumn,
  onStartAddColumn,
}: AddColumnInputProps) {
  const t = useTranslations('todos')
  return (
    <div className="w-[320px] flex-shrink-0">
      {isAddingColumn ? (
        <div className="bg-morandi-container/30 rounded-lg p-3">
          <Input
            autoFocus
            placeholder={t('columnName')}
            value={newColumnName}
            onChange={e => onNewColumnNameChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault()
                onAddColumn()
              }
              if (e.key === 'Escape') {
                onCancelAddColumn()
              }
            }}
            className="h-8 text-sm mb-2"
          />
          <div className="flex gap-2">
            {/* 2026-05-16 QDF R51：對齊按鈕順序規則（取消左、主操作右）*/}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={onCancelAddColumn}
            >
              取消
            </Button>
            <Button
              variant="soft-gold"
              size="sm"
              className="h-7 text-xs"
              onClick={onAddColumn}
              disabled={!newColumnName.trim() || addingColumnInFlight}
            >
              {addingColumnInFlight ? '建立中…' : '新增欄位'}
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={onStartAddColumn}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-morandi-container/20 hover:bg-morandi-container/40 text-morandi-secondary hover:text-morandi-primary transition-colors text-sm font-medium border-2 border-dashed border-border/50"
        >
          <Plus size={16} />
          新增欄位
        </button>
      )}
    </div>
  )
}
