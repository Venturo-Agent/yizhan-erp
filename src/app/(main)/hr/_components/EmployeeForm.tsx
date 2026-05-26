'use client'

/**
 * EmployeeForm - 統一員工表單
 *
 * mode:
 * - 'self': 員工自己編輯（只有基本資料）
 * - 'hr': HR 管理（基本資料 + 薪資）
 *
 * 狀態 / handlers 集中在 useEmployeeForm hook、此元件專注 render。
 */

import React from 'react'
import { Button } from '@/components/ui/button'
import { Save, User, DollarSign, Lock } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'

import { AvatarHeader } from './EmployeeForm/AvatarHeader'
import { BasicInfoSection } from './EmployeeForm/BasicInfoSection'
import { SalarySection } from './EmployeeForm/SalarySection'
import { useEmployeeForm } from './EmployeeForm/useEmployeeForm'

const LABELS = {
  CANCEL: '取消',
  CHANGE_PASSWORD: '修改密碼',
  SAVING: '儲存中...',
  SUBMITTING: '建立中...',
  SAVE_CHANGES: '儲存變更',
  CREATE_EMPLOYEE: '建立員工',
  TAB_BASIC: '基本資料',
  TAB_SALARY: '薪資設定',
} as const

interface EmployeeFormProps {
  employeeId?: string
  onSubmit: () => void
  onCancel: () => void
  mode?: 'hr' | 'self'
  onPasswordChange?: () => void
  /**
   * 照片那一列右邊的額外 UI slot（5/13、settings 個人頁用）
   * settings 傳「顯示偏好」（主題 + 字體大小）進來、HR 編輯員工不傳
   */
  headerRightSlot?: React.ReactNode
  /**
   * 2026-05-21 William 拍板：self 模式底部按鈕重複、改由 page 用 ContentPageLayout primaryAction 提供
   * formId：外部 submit 按鈕用 form="X" attribute 觸發 form submit
   * onSubmittingChange：讓 page 拿到 submitting state、控制 primaryAction disabled
   */
  formId?: string
  onSubmittingChange?: (submitting: boolean) => void
}

export function EmployeeForm({
  employeeId,
  onSubmit,
  onCancel,
  mode = 'hr',
  onPasswordChange,
  headerRightSlot,
  formId,
  onSubmittingChange,
}: EmployeeFormProps) {
  const {
    employee,
    isEditMode,
    submitting,
    avatarPreview,
    avatarUploading,
    fileInputRef,
    formData,
    setFormData,
    roles,
    branches,
    hrFullEnabled,
    handleCreateBranch,
    handleAvatarChange,
    handleSubmit,
  } = useEmployeeForm({ employeeId, mode, onSubmit })

  // 根據 mode 決定顯示哪些分頁（tab 列表保留供未來 showTabs UI 使用）
  const visibleTabs = [
    { key: 'basic' as const, label: LABELS.TAB_BASIC, icon: User, showIn: ['hr', 'self'] },
    { key: 'salary' as const, label: LABELS.TAB_SALARY, icon: DollarSign, showIn: ['hr'] },
  ].filter(t => t.showIn.includes(mode))
  void visibleTabs

  const bottomButtons = (
    <>
      {mode !== 'self' && (
        <Button type="button" variant="soft-gold" onClick={onCancel}>
          {LABELS.CANCEL}
        </Button>
      )}
      {mode === 'self' && (
        <Button
          type="button"
          variant="soft-gold"
          className="border-morandi-gold text-morandi-gold hover:bg-morandi-gold hover:text-white"
          onClick={() => {
            if (onPasswordChange) onPasswordChange()
          }}
          data-tutorial="btn-change-password"
        >
          <Lock className="w-4 h-4 mr-2" />
          {LABELS.CHANGE_PASSWORD}
        </Button>
      )}
      <Button type="submit" disabled={submitting}>
        {submitting ? (
          <>
            <Spinner size="md" className="mr-2" />
            {isEditMode ? LABELS.SAVING : LABELS.SUBMITTING}
          </>
        ) : (
          <>
            <Save className="w-4 h-4 mr-2" />
            {isEditMode ? LABELS.SAVE_CHANGES : LABELS.CREATE_EMPLOYEE}
          </>
        )}
      </Button>
    </>
  )

  // 2026-05-21：通知外部 submitting 變化（給 ContentPageLayout primaryAction 控 disabled）
  React.useEffect(() => {
    onSubmittingChange?.(submitting)
  }, [submitting, onSubmittingChange])

  return (
    <form id={formId} onSubmit={handleSubmit} className="h-full overflow-y-auto">
      {/* Character Card 風格 */}
      <div className="bg-card rounded-xl border border-border shadow-sm">
        {/* 照片那一列：照片 + 姓名 + (settings 用)顯示偏好 slot */}
        <AvatarHeader
          avatarPreview={avatarPreview}
          avatarUploading={avatarUploading}
          isEditMode={isEditMode}
          employeeNumber={employee?.employee_number}
          displayName={formData.display_name}
          chineseName={formData.chinese_name}
          headerRightSlot={headerRightSlot}
          fileInputRef={fileInputRef}
          onAvatarClick={() => fileInputRef.current?.click()}
          onAvatarChange={handleAvatarChange}
        />

        {/* 右側：表單內容（可滾動） */}
        <div>
          <div className="p-6">
            <BasicInfoSection
              mode={mode}
              isEditMode={isEditMode}
              formData={formData}
              roles={roles}
              branches={branches}
              onChange={patch => setFormData(prev => ({ ...prev, ...patch }))}
              onCreateBranch={handleCreateBranch}
            />

            {/* 薪資設定（HR 模式 + 完整人資 feature 才顯示、新增 / 編輯都要看到）
                hr_full = hr_salary_settlement + hr_bonus_settlement 兩個都開
                沒完整 HR 的租戶（Lite / Standard / Advance 沒選 hr_full）= form 收在「緊急聯絡人」 */}
            {mode === 'hr' && hrFullEnabled && (
              <SalarySection
                formData={formData}
                salaryHistory={employee?.salary_info?.salary_history}
                onChange={patch => setFormData(prev => ({ ...prev, ...patch }))}
              />
            )}

            {/* 2026-05-21 William 拍板：self 模式底部按鈕砍掉、由 ContentPageLayout primaryAction 提供存檔、headerRightSlot 提供修改密碼 */}
          </div>

          {mode !== 'self' && (
            <div className="px-6 py-4 flex justify-end gap-3 flex-shrink-0">{bottomButtons}</div>
          )}
        </div>
      </div>
    </form>
  )
}
