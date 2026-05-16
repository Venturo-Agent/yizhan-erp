'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FilePlus, Files, X } from 'lucide-react'
import { COMP_EDITOR_LABELS } from '../constants/labels'

interface PublishDialogProps {
  type: 'version' | 'file'
  open: boolean
  onOpenChange: (open: boolean) => void
  value: string
  onChange: (value: string) => void
  onConfirm: () => void
  saving: boolean
  placeholder: string
  versionCount?: number
}

export function PublishDialog({
  type,
  open,
  onOpenChange,
  value,
  onChange,
  onConfirm,
  saving,
  placeholder,
  versionCount = 0,
}: PublishDialogProps) {
  const isVersion = type === 'version'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent level={1} className="sm:max-w-[25rem]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isVersion ? <FilePlus size="1.125em" /> : <Files size="1.125em" />}
            {isVersion ? COMP_EDITOR_LABELS.另存新版本 : COMP_EDITOR_LABELS.另存新檔}
          </DialogTitle>
          <DialogDescription>
            {isVersion
              ? COMP_EDITOR_LABELS.為這個版本取一個名稱_方便之後辨識
              : COMP_EDITOR_LABELS.將創建一個全新的行程表_有獨立的分享連結}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label
            htmlFor={isVersion ? 'version-note' : 'new-file-name'}
            className="text-sm font-medium"
          >
            {isVersion ? COMP_EDITOR_LABELS.版本名稱 : COMP_EDITOR_LABELS.新檔案名稱}
          </Label>
          <Input
            id={isVersion ? 'version-note' : 'new-file-name'}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className="mt-2"
          />
        </div>
        <DialogFooter>
          <Button variant="soft-gold" onClick={() => onOpenChange(false)} className="gap-1">
            <X size="1em" />
            {COMP_EDITOR_LABELS.取消}
          </Button>
          <Button onClick={onConfirm} disabled={saving}>
            {saving ? COMP_EDITOR_LABELS.儲存中 : COMP_EDITOR_LABELS.確認另存}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
