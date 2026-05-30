'use client'

import { useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Copy, Check, CheckSquare } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCreateTenantForm } from './_components/useCreateTenantForm'
import { TenantBasicInfoSection } from './_components/TenantBasicInfoSection'
import { TenantIndustrySection } from './_components/TenantIndustrySection'
import { TenantBrandSection } from './_components/TenantBrandSection'
import { TenantOrgSection } from './_components/TenantOrgSection'
import { TenantAdminSection } from './_components/TenantAdminSection'
import { TenantFeatureSection } from './_components/TenantFeatureSection'
import { TenantPrepSection } from './_components/TenantPrepSection'

interface CreateTenantDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: () => void
  existingCodes: string[]
}

export function CreateTenantDialog({
  open,
  onOpenChange,
  onComplete,
  existingCodes,
}: CreateTenantDialogProps) {
  const t = useTranslations('workspacesPage')
  const {
    step,
    creating,
    copied,
    codeError,
    taxIdError,
    form,
    setForm,
    loginInfo,
    isFormValid,
    resetForm,
    handleCodeChange,
    handleTaxIdChange,
    handleCreate,
    handleCopyLoginInfo,
    updateBrand,
    addBrand,
    removeBrand,
    updateBranch,
    addBranch,
    removeBranch,
    toggleMultiBranch,
    handleOptionalFeaturesChange,
    handleIndustryChange,
    handleSubIndustryChange,
  } = useCreateTenantForm(existingCodes)

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) resetForm()
      onOpenChange(isOpen)
    },
    [onOpenChange, resetForm]
  )

  const handleClose = () => {
    onComplete()
    resetForm()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent level={1} className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-morandi-primary">
            {step === 'form' ? t('step1Title') : t('step3Title')}
          </DialogTitle>
        </DialogHeader>

        {step === 'form' && (
          <div className="space-y-5">
            <TenantFeatureSection
              selectedFeatures={form.optionalFeatures}
              onChange={handleOptionalFeaturesChange}
            />

            <TenantPrepSection selectedFeatures={form.optionalFeatures} />

            <TenantBasicInfoSection
              form={form}
              setForm={setForm}
              codeError={codeError}
              taxIdError={taxIdError}
              onCodeChange={handleCodeChange}
              onTaxIdChange={handleTaxIdChange}
            />

            <TenantIndustrySection
              industry={form.industry}
              subIndustry={form.subIndustry}
              onIndustryChange={handleIndustryChange}
              onSubIndustryChange={handleSubIndustryChange}
            />

            <TenantBrandSection
              brands={form.brands}
              onUpdate={updateBrand}
              onAdd={addBrand}
              onRemove={removeBrand}
            />

            <TenantOrgSection
              isMultiBranch={form.isMultiBranch}
              branches={form.branches}
              onToggleMultiBranch={toggleMultiBranch}
              onUpdateBranch={updateBranch}
              onAddBranch={addBranch}
              onRemoveBranch={removeBranch}
            />

            <TenantAdminSection form={form} setForm={setForm} />

            <div className="flex gap-2 pt-4 border-t border-morandi-container/40">
              <Button
                variant="soft-gold"
                onClick={() => handleOpenChange(false)}
                className="flex-1"
                type="button"
              >
                {t('btnCancel')}
              </Button>
              <Button
                variant="morandi-gold"
                onClick={handleCreate}
                disabled={!isFormValid || creating}
                className="flex-1"
                type="button"
              >
                <CheckSquare size="1em" />
                {creating ? t('btnCreating') : t('btnCreate')}
              </Button>
            </div>
          </div>
        )}

        {step === 'done' && loginInfo && (
          <>
            <p className="text-sm text-morandi-secondary mb-4">{t('step3Desc')}</p>

            <Card className="bg-morandi-container/10 border-morandi-container/30 p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-morandi-secondary">{t('loginInfoCode')}</span>
                <span className="font-mono font-semibold text-morandi-primary">
                  {loginInfo.workspaceCode}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-morandi-secondary">{t('fieldEmail')}</span>
                <span className="font-mono font-semibold text-morandi-primary text-xs">
                  {loginInfo.email}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-morandi-secondary">
                  {t('loginInfoEmployeeNumber')}
                </span>
                <span className="font-mono font-semibold text-morandi-primary">
                  {loginInfo.employeeNumber}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-morandi-secondary">{t('loginInfoPassword')}</span>
                <span className="font-mono font-semibold text-morandi-primary">
                  {loginInfo.password}
                </span>
              </div>
            </Card>
            <p className="text-xs text-morandi-muted mt-2">
              此密碼僅顯示這一次、請複製給客戶。客戶首次登入會強制改密。
            </p>

            <div className="flex gap-2 mt-4">
              <Button variant="soft-gold" onClick={handleClose} className="flex-1" type="button">
                {t('btnClose')}
              </Button>
              <Button
                variant="soft-gold"
                onClick={handleCopyLoginInfo}
                className="flex-1 gap-2"
                type="button"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {t('copyAll')}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
