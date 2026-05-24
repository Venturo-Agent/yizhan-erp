'use client'

/**
 * useCreateTenantForm — 建立租戶表單 state + validation + API 呼叫
 *
 * 從 create-tenant-dialog.tsx 拆出，主 Dialog 只負責組合 UI。
 */

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { useTranslations } from 'next-intl'
import { type FormData, type LoginInfo, type DimensionRow, type Industry, type SubIndustry, INITIAL_FORM } from './create-tenant-types'
import type { PlanId, AdvancePickId } from '@/lib/permissions/subscription-plans'

export function useCreateTenantForm(existingCodes: string[]) {
  const t = useTranslations('workspacesPage')
  const [step, setStep] = useState<'form' | 'done'>('form')
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [codeError, setCodeError] = useState('')
  const [taxIdError, setTaxIdError] = useState('')

  const [form, setForm] = useState<FormData>(INITIAL_FORM)
  const [loginInfo, setLoginInfo] = useState<LoginInfo | null>(null)

  const resetForm = useCallback(() => {
    setStep('form')
    setCreating(false)
    setCopied(false)
    setCodeError('')
    setTaxIdError('')
    setForm(INITIAL_FORM)
    setLoginInfo(null)
  }, [])

  const validateCode = useCallback(
    (code: string) => {
      if (!code) {
        setCodeError('')
        return false
      }
      if (!/^[A-Z]+$/.test(code)) {
        setCodeError(t('fieldCodeInvalid'))
        return false
      }
      const isDuplicate = existingCodes.some(c => c.toUpperCase() === code.toUpperCase())
      if (isDuplicate) {
        setCodeError(t('fieldCodeDuplicate'))
        return false
      }
      setCodeError('')
      return true
    },
    [existingCodes]
  )

  const validateTaxId = useCallback((taxId: string) => {
    if (!taxId) {
      setTaxIdError('')
      return false
    }
    if (!/^\d{8}$/.test(taxId)) {
      setTaxIdError(t('fieldTaxIdInvalid'))
      return false
    }
    setTaxIdError('')
    return true
  }, [])

  const handleCodeChange = useCallback(
    (value: string) => {
      const upper = value.toUpperCase()
      setForm(prev => ({ ...prev, code: upper }))
      validateCode(upper)
    },
    [validateCode]
  )

  const handleTaxIdChange = useCallback(
    (value: string) => {
      const digits = value.replace(/\D/g, '').slice(0, 8)
      setForm(prev => ({ ...prev, taxId: digits }))
      validateTaxId(digits)
    },
    [validateTaxId]
  )

  // 品牌 list ops
  const updateBrand = (idx: number, field: keyof DimensionRow, value: string) => {
    setForm(prev => {
      const next = [...prev.brands]
      next[idx] = { ...next[idx], [field]: value }
      return { ...prev, brands: next }
    })
  }
  const addBrand = () => setForm(prev => ({ ...prev, brands: [...prev.brands, { code: '', name: '' }] }))
  const removeBrand = (idx: number) =>
    setForm(prev => ({ ...prev, brands: prev.brands.filter((_, i) => i !== idx) }))

  // 分公司 list ops
  const updateBranch = (idx: number, field: keyof DimensionRow, value: string) => {
    setForm(prev => {
      const next = [...prev.branches]
      next[idx] = { ...next[idx], [field]: value }
      return { ...prev, branches: next }
    })
  }
  const addBranch = () =>
    setForm(prev => ({
      ...prev,
      branches: [
        ...prev.branches,
        prev.branches.length === 0
          ? { code: '', name: prev.name, tax_id: prev.taxId }
          : { code: '', name: '', tax_id: '' },
      ],
    }))
  const removeBranch = (idx: number) =>
    setForm(prev => ({ ...prev, branches: prev.branches.filter((_, i) => i !== idx) }))

  const toggleMultiBranch = (checked: boolean) => {
    setForm(prev => ({
      ...prev,
      isMultiBranch: checked,
      // 第一筆預填公司名稱 + workspace 統編（總公司），讓用戶在此基礎上加後綴（如「台北分公司」）
      branches:
        checked && prev.branches.length === 0
          ? [{ code: '', name: prev.name, tax_id: prev.taxId }]
          : prev.branches,
    }))
  }

  const handlePlanChange = useCallback((planId: PlanId) => {
    setForm(prev => ({
      ...prev,
      subscriptionPlan: planId,
      advancePicks: planId === 'advance' ? prev.advancePicks : [],
    }))
  }, [])

  const handleAdvancePicksChange = useCallback((picks: AdvancePickId[]) => {
    setForm(prev => ({ ...prev, advancePicks: picks }))
  }, [])

  const handleOptionalFeaturesChange = useCallback((features: string[]) => {
    setForm(prev => ({ ...prev, optionalFeatures: features }))
  }, [])

  const handleIndustryChange = useCallback((industry: Industry | '') => {
    setForm(prev => ({
      ...prev,
      industry,
      subIndustry: industry === 'tourism' ? prev.subIndustry : null,
    }))
  }, [])

  const handleSubIndustryChange = useCallback((subIndustry: SubIndustry) => {
    setForm(prev => ({ ...prev, subIndustry }))
  }, [])

  const isFormValid = (() => {
    if (!form.name.trim() || !form.code.trim() || !form.taxId.trim()) return false
    if (codeError || taxIdError) return false
    if (!/^[A-Z]+$/.test(form.code)) return false
    if (!/^\d{8}$/.test(form.taxId)) return false
    if (!form.adminName.trim() || !form.adminEmail.trim()) return false
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.adminEmail)) return false
    if (!form.industry) return false
    if (form.industry === 'tourism' && !form.subIndustry) return false
    if (form.subscriptionPlan === 'advance' && form.advancePicks.length !== 2) return false
    for (const b of form.brands) {
      if (b.name.trim() === '' && b.code.trim() !== '') return false
    }
    if (form.isMultiBranch) {
      const valid = form.branches.filter(b => b.name.trim())
      if (valid.length === 0) return false
      // 多分公司模式：每筆 tax_id 必填 8 碼
      for (const b of form.branches) {
        if (!b.name.trim()) continue
        if (!/^\d{8}$/.test((b.tax_id ?? '').trim())) return false
      }
    }
    return true
  })()

  const handleCreate = async () => {
    if (!isFormValid) return
    setCreating(true)

    try {
      const payload = {
        workspaceName: form.name.trim(),
        workspaceCode: form.code.trim(),
        workspaceType: 'travel_agency',
        maxEmployees: form.maxEmployees ? parseInt(form.maxEmployees, 10) : null,
        taxId: form.taxId.trim(),
        subscriptionPlan: form.subscriptionPlan,
        advancePicks: form.advancePicks,
        optionalFeatures: form.optionalFeatures,
        brands: form.brands
          .filter(b => b.name.trim())
          .map(b => ({ code: b.code.trim().toUpperCase(), name: b.name.trim() })),
        isMultiBranch: form.isMultiBranch,
        branches: form.isMultiBranch
          ? form.branches
              .filter(b => b.name.trim())
              .map(b => ({
                code: b.code.trim().toUpperCase(),
                name: b.name.trim(),
                tax_id: (b.tax_id ?? '').trim(),
              }))
          : undefined,
        adminEmployeeNumber: form.employeeNumber.trim() || 'E001',
        adminName: form.adminName.trim(),
        adminEmail: form.adminEmail.trim(),
      }

      const response = await fetch('/api/tenants/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!result.success) {
        const errorMsg = result.message || result.error || t('toastCreateFailed')
        logger.error('Failed to create tenant:', errorMsg, 'Full result:', result)
        toast.error(errorMsg)
        setCreating(false)
        return
      }

      logger.log('Tenant created successfully:', result.data)
      toast.success(t('toastWorkspaceCreated'))
      toast.success(t('toastAdminCreated'))

      setLoginInfo({
        workspaceCode: result.data.login.workspaceCode,
        employeeNumber: result.data.login.employeeNumber,
        email: result.data.login.email,
        password: result.data.login.password,
      })
      setStep('done')
    } catch (error) {
      logger.error('Failed to create tenant:', error)
      toast.error(t('toastCreateFailed'))
    } finally {
      setCreating(false)
    }
  }

  const handleCopyLoginInfo = async () => {
    if (!loginInfo) return
    const text = [
      `${t('loginInfoCode')}：${loginInfo.workspaceCode}`,
      `${t('fieldEmail')}：${loginInfo.email}`,
      `${t('loginInfoEmployeeNumber')}：${loginInfo.employeeNumber}`,
      `${t('loginInfoPassword')}：${loginInfo.password}`,
    ].join('\n')

    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success(t('copied'))
    setTimeout(() => setCopied(false), 2000)
  }

  return {
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
    // brand ops
    updateBrand,
    addBrand,
    removeBrand,
    // branch ops
    updateBranch,
    addBranch,
    removeBranch,
    // toggles
    toggleMultiBranch,
    // plan
    handlePlanChange,
    handleAdvancePicksChange,
    handleOptionalFeaturesChange,
    // industry
    handleIndustryChange,
    handleSubIndustryChange,
  }
}
