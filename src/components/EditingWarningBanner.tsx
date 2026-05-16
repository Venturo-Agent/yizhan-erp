'use client'

import { AlertTriangle, Users } from 'lucide-react'
import { useEditingPresence } from '@/hooks/useEditingPresence'
import { COMPONENT_LABELS } from './constants/labels'

interface EditingWarningBannerProps {
  resourceType: string
  resourceId: string
  resourceName?: string // 資源名稱，例如「此行程」「此訂單」
}

/**
 * 編輯中警告橫幅
 * 當有其他人正在編輯同一份資源時顯示警告
 */
export function EditingWarningBanner({
  resourceType,
  resourceId,
  resourceName = COMPONENT_LABELS.DEFAULT_RESOURCE_NAME,
}: EditingWarningBannerProps) {
  const { otherEditors, isOtherEditing, currentEditors } = useEditingPresence({
    resourceType,
    resourceId,
    enabled: !!resourceId,
  })

  if (!isOtherEditing) {
    return null
  }

  const editorNames = otherEditors.map(e => e.name).join('、')

  return (
    <div className="bg-status-warning-bg border border-morandi-gold/30 rounded-lg p-3 mb-4 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-morandi-gold flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-medium text-morandi-gold">
          {editorNames} {COMPONENT_LABELS.EDITING_SUFFIX}
          {resourceName}
        </p>
        <p className="text-xs text-status-warning mt-1">
          {COMPONENT_LABELS.EDITING_CONFLICT_WARNING}
        </p>
      </div>
      <div className="flex items-center gap-1 text-xs text-status-warning">
        <Users className="w-4 h-4" />
        <span>
          {currentEditors.length} {COMPONENT_LABELS.ONLINE_SUFFIX}
        </span>
      </div>
    </div>
  )
}
