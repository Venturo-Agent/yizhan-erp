'use client'
/**
 * SuppliersPage - 供應商管理頁面（僅基本資訊）
 */

import { logger } from '@/lib/utils/logger'
import React, { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Button } from '@/components/ui/button'
import { Building2, FileSpreadsheet, Plus } from 'lucide-react'
import { SuppliersList } from './SuppliersList'
import { SuppliersDialog } from './SuppliersDialog'
import { ImportSuppliersDialog } from './ImportSuppliersDialog'
import {
  useSuppliersPaginated,
  createSupplier,
  updateSupplier,
  deleteSupplier as deleteSupplierApi,
  invalidateSuppliers,
} from '@/data'
import type { Supplier } from '@/types/supplier.types'
import { confirm, alert } from '@/lib/ui/alert-dialog'
import { useWorkspaceId } from '@/lib/workspace-context'
import { generateSupplierCode } from '@/lib/codes'

// 列表分頁固定 15 筆（紅線：效能 #2、不給每頁筆數選擇器）
const PAGE_SIZE = 15
// server-side 搜尋欄位（對齊原前端 filter：名稱 / 編號 / 銀行代碼 / 銀行帳號）
const SEARCH_FIELDS = ['name', 'code', 'bank_code', 'bank_account']

export const SuppliersPage: React.FC = () => {
  const t = useTranslations('library')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  // 預設按使用次數降序（對齊 entity 預設 orderBy、常用排前）
  const [sortBy, setSortBy] = useState('usage_count')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  // 防連點：handleSubmit 進行中、阻止按鈕重複觸發（紅線：五大方向 5 防連點）
  const [isSubmitting, setIsSubmitting] = useState(false)

  const workspaceId = useWorkspaceId()

  // 伺服器分頁 + 搜尋 + 排序（規模化省 Supabase egress、不全撈）
  const {
    items: suppliers,
    totalCount,
    loading,
  } = useSuppliersPaginated({
    page,
    pageSize: PAGE_SIZE,
    search: searchQuery.trim() || undefined,
    searchFields: SEARCH_FIELDS,
    sortBy,
    sortOrder,
  })

  // 搜尋變更：送伺服器查、歸第一頁避免分頁錯位
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
    setPage(1)
  }, [])

  // 排序變更：server-side 重查、歸第一頁
  const handleSort = useCallback((column: string, direction: 'asc' | 'desc') => {
    setSortBy(column)
    setSortOrder(direction)
    setPage(1)
  }, [])

  // 完整的表單狀態
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    english_name: '',
    tax_id: '',
    is_domestic: true, // onboarding fix pack 2026-05-10：預設國內
    bank_code: '',
    swift_code: '',
    bank_name: '',
    bank_branch: '',
    bank_account_name: '',
    bank_account: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  })

  const handleOpenAddDialog = useCallback(() => {
    setIsEditMode(false)
    setEditingSupplier(null)
    setIsAddDialogOpen(true)
  }, [])

  const handleEdit = useCallback((supplier: Supplier) => {
    setIsEditMode(true)
    setEditingSupplier(supplier)
    setFormData({
      name: supplier.name || '',
      code: supplier.code || '',
      english_name: supplier.english_name || '',
      tax_id: supplier.tax_id || '',
      is_domestic: supplier.is_domestic ?? true,
      bank_code: supplier.bank_code || '',
      swift_code: supplier.swift_code || '',
      bank_name: supplier.bank_name || '',
      bank_branch: supplier.bank_branch || '',
      bank_account_name: supplier.bank_account_name || '',
      bank_account: supplier.bank_account || '',
      contact_person: supplier.contact_person || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      notes: supplier.notes || '',
    })
    setIsAddDialogOpen(true)
  }, [])

  const handleDelete = useCallback(
    async (supplier: Supplier) => {
      const confirmed = await confirm(t('supplierDeleteConfirm', { name: supplier.name }), {
        title: t('supplierDeleteTitle'),
        type: 'warning',
      })
      if (!confirmed) return

      try {
        await deleteSupplierApi(supplier.id)
        await alert(t('supplierDeleteSuccess'), 'success')
      } catch (error) {
        logger.error('❌ Delete Supplier Error:', error)
        await alert(t('supplierDeleteFailed'), 'error')
      }
    },
    [t]
  )

  const handleCloseDialog = useCallback(() => {
    setIsAddDialogOpen(false)
    setIsEditMode(false)
    setEditingSupplier(null)
    setFormData({
      name: '',
      code: '',
      english_name: '',
      tax_id: '',
      is_domestic: true,
      bank_code: '',
      swift_code: '',
      bank_name: '',
      bank_branch: '',
      bank_account_name: '',
      bank_account: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      notes: '',
    })
  }, [])

  const handleFormFieldChange = useCallback(
    <K extends keyof typeof formData>(field: K, value: (typeof formData)[K]) => {
      setFormData(prev => ({ ...prev, [field]: value }))
    },
    []
  )

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      if (isEditMode && editingSupplier) {
        // 更新模式
        await updateSupplier(editingSupplier.id, {
          name: formData.name,
          code: formData.code || null,
          english_name: formData.english_name || null,
          tax_id: formData.tax_id || null,
          is_domestic: formData.is_domestic,
          bank_code: formData.bank_code || null,
          swift_code: formData.swift_code || null,
          bank_name: formData.bank_name || null,
          bank_branch: formData.bank_branch || null,
          bank_account_name: formData.bank_account_name || null,
          bank_account: formData.bank_account || null,
          contact_person: formData.contact_person || null,
          phone: formData.phone || null,
          email: formData.email || null,
          address: formData.address || null,
          notes: formData.notes || null,
        })
        await alert(t('supplierUpdateSuccess'), 'success')
        // 重新載入供應商列表
        await invalidateSuppliers()
      } else {
        // 新增模式：自動產生編號（如果沒填）
        if (!workspaceId) throw new Error('無法取得當前分公司、請重新登入')
        const finalCode = formData.code || (await generateSupplierCode(workspaceId))

        await createSupplier({
          name: formData.name,
          code: finalCode,
          english_name: formData.english_name || null,
          tax_id: formData.tax_id || null,
          is_domestic: formData.is_domestic,
          bank_code: formData.bank_code || null,
          swift_code: formData.swift_code || null,
          bank_name: formData.bank_name || null,
          bank_branch: formData.bank_branch || null,
          bank_account_name: formData.bank_account_name || null,
          bank_account: formData.bank_account || null,
          contact_person: formData.contact_person || null,
          phone: formData.phone || null,
          email: formData.email || null,
          address: formData.address || null,
          notes: formData.notes || null,
          supplier_type_code: 'other', // 預設類別
        })
        await alert(t('supplierCreateSuccess'), 'success')
        // 重新載入供應商列表
        await invalidateSuppliers()
      }
      handleCloseDialog()
    } catch (error) {
      logger.error('❌ Save Supplier Error:', error)
      await alert(t('supplierSaveFailed'), 'error')
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, isEditMode, editingSupplier, handleCloseDialog, isSubmitting, workspaceId, t])

  return (
    <ContentPageLayout
      title={t('supplierManagement')}
      icon={Building2}
      breadcrumb={[
        { label: t('supplierHome'), href: '/dashboard' },
        { label: t('supplierDatabaseManagement'), href: '/library' },
        { label: t('supplierManagement'), href: '/library/suppliers' },
      ]}
      showSearch
      searchTerm={searchQuery}
      onSearchChange={handleSearchChange}
      searchPlaceholder={t('supplierSearchPlaceholder')}
      headerActions={
        // 主操作（新增供應商）走 primaryAction、輔助（匯入）走 escape hatch、樣式套 header-outline 維持視覺一致
        <Button variant="header-outline" size="sm" onClick={() => setIsImportDialogOpen(true)}>
          <FileSpreadsheet size={16} />
          <span>{t('supplierImportBtnSelectFile')}</span>
        </Button>
      }
      primaryAction={{
        label: t('supplierAddTitle'),
        icon: Plus,
        onClick: handleOpenAddDialog,
      }}
    >
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0">
          <SuppliersList
            suppliers={suppliers}
            onEdit={handleEdit}
            onDelete={handleDelete}
            // 防白閃：首次載入（還沒任何資料）才顯示 loading、翻頁時 keepPreviousData 撐住
            loading={loading && suppliers.length === 0}
            serverPagination={{
              currentPage: page,
              pageSize: PAGE_SIZE,
              totalCount,
              onPageChange: setPage,
            }}
            onSort={handleSort}
          />
        </div>
      </div>

      {/* 新增/編輯供應商對話框 */}
      <SuppliersDialog
        isOpen={isAddDialogOpen}
        onClose={handleCloseDialog}
        formData={formData}
        onFormFieldChange={handleFormFieldChange}
        onSubmit={handleSubmit}
        isEditMode={isEditMode}
        loading={isSubmitting}
      />

      {/* 批次匯入對話框 */}
      <ImportSuppliersDialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen} />
    </ContentPageLayout>
  )
}
