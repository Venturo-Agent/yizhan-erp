'use client'

/**
 * 職務管理頁面（HR 模組）
 * 支援模組 + 分頁的細粒度權限設定
 */

import { useState, useEffect, useMemo } from 'react'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { useTranslations } from 'next-intl'
import { FormDialog } from '@/components/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Shield, Plus } from 'lucide-react'
import { useAuthStore } from '@/stores'
import { MODULES, type ModuleDefinition, type TabPermission } from '@/lib/permissions'
import { useWorkspaceFeatures } from '@/lib/permissions/hooks'
import { CAPABILITIES, useCapabilities } from '@/lib/permissions'
import { logger } from '@/lib/utils/logger'
import { useRouter } from 'next/navigation'
import { HR_ADMIN_TABS } from '../components/hr-admin-tabs'
import { useRoles, type Role, type RoleReadScope } from '@/data/hooks/useRoles'
import { invalidateRoleCapabilities } from '@/data'
import { confirm } from '@/lib/ui/alert-dialog'
import { RoleListPanel } from './_components/RoleListPanel'
import { RoleCapabilityTable } from './_components/RoleCapabilityTable'
import { apiMutate } from '@/lib/swr/api-mutate'
import { supabase } from '@/lib/supabase/client'

const PAGE_LABELS = {
  ADD_ROLE: '新增職務',
  ROLE_NAME_PLACEHOLDER: '例如：業務、會計、助理',
  ROLE_DESC_PLACEHOLDER: '這個角色的職責說明',
} as const

export default function RolesPage() {
  const t = useTranslations('hrPage')
  const router = useRouter()
  const { user } = useAuthStore()
  const { can } = useCapabilities()
  const { isFeatureEnabled, isTabEnabled, loading: _featuresLoading } = useWorkspaceFeatures()
  const workspaceId = user?.workspace_id
  const [branchesCount, setBranchesCount] = useState(0)

  // 只顯示這個 workspace 已啟用的模組、且過濾掉 workspace 沒開通的 tab
  const visibleModules = useMemo(
    () =>
      MODULES.filter(m => isFeatureEnabled(m.code)).map(m => ({
        ...m,
        tabs: m.tabs.filter(tab => isTabEnabled(m.code, tab.code, tab.category)),
      })),
    [isFeatureEnabled, isTabEnabled]
  )

  const { roles, loading, mutate: mutateRoles } = useRoles()
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [permissions, setPermissions] = useState<TabPermission[]>([])
  const [readScope, setReadScope] = useState<RoleReadScope>('branch')
  const [expandedModules, setExpandedModules] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState({ name: '', description: '' })

  // 預設選中第一筆（當列表載入且尚無選中時）
  useEffect(() => {
    if (!selectedRole && roles.length > 0) {
      setSelectedRole(roles[0])
    }
  }, [roles, selectedRole])

  // 選中職務變動時、同步本地 readScope 狀態
  useEffect(() => {
    setReadScope(selectedRole?.read_scope ?? 'branch')
  }, [selectedRole])

  // 拿當前 workspace 實際分公司數（決定「看分公司」radio 是否顯示）
  useEffect(() => {
    if (!workspaceId) return
    void (async () => {
      const { count } = await supabase
        .from('branches')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('is_active', true)
      setBranchesCount(typeof count === 'number' ? count : 0)
    })()
  }, [workspaceId])

  // 載入選中角色的權限
  useEffect(() => {
    const fetchPermissions = async () => {
      if (!selectedRole) {
        setPermissions([])
        return
      }

      try {
        const res = await fetch(`/api/roles/${selectedRole.id}/tab-permissions`)
        if (res.ok) {
          const data = await res.json()
          setPermissions(data)
        }
      } catch (err) {
        logger.error('Failed to fetch permissions:', err)
      }
    }

    fetchPermissions()
  }, [selectedRole])

  // 展開/收合模組
  const toggleExpand = (moduleCode: string) => {
    setExpandedModules(prev =>
      prev.includes(moduleCode) ? prev.filter(m => m !== moduleCode) : [...prev, moduleCode]
    )
  }

  // 取得權限
  const getPermission = (moduleCode: string, tabCode: string | null): TabPermission | undefined => {
    return permissions.find(p => p.module_code === moduleCode && p.tab_code === tabCode)
  }

  // 檢查模組是否全開
  const isModuleFullyEnabled = (
    module: ModuleDefinition,
    field: 'can_read' | 'can_write'
  ): boolean => {
    if (module.tabs.length === 0) {
      const perm = getPermission(module.code, null)
      return perm?.[field] ?? false
    }
    return module.tabs.every(tab => {
      const perm = getPermission(module.code, tab.code)
      return perm?.[field] ?? false
    })
  }

  // 檢查模組是否部分開啟
  const isModulePartiallyEnabled = (
    module: ModuleDefinition,
    field: 'can_read' | 'can_write'
  ): boolean => {
    if (module.tabs.length === 0) return false
    const enabledCount = module.tabs.filter(tab => {
      const perm = getPermission(module.code, tab.code)
      return perm?.[field] ?? false
    }).length
    return enabledCount > 0 && enabledCount < module.tabs.length
  }

  // 切換模組全開/全關
  const toggleModuleAll = (module: ModuleDefinition, field: 'can_read' | 'can_write') => {
    const isFullyEnabled = isModuleFullyEnabled(module, field)
    const newValue = !isFullyEnabled

    setPermissions(prev => {
      let updated = [...prev]

      if (module.tabs.length === 0) {
        // 沒有分頁的模組
        const existing = updated.find(p => p.module_code === module.code && p.tab_code === null)
        if (existing) {
          updated = updated.map(p =>
            p.module_code === module.code && p.tab_code === null ? { ...p, [field]: newValue } : p
          )
        } else {
          updated.push({
            module_code: module.code,
            tab_code: null,
            can_read: field === 'can_read' ? newValue : false,
            can_write: field === 'can_write' ? newValue : false,
          })
        }
      } else {
        // 有分頁的模組：更新所有分頁
        module.tabs.forEach(tab => {
          // 自鎖保護：系統主管的「職務管理·可寫入」(hr.roles.write) 不可透過「全關」關掉
          if (
            selectedRole?.is_admin &&
            module.code === 'hr' &&
            tab.code === 'roles' &&
            field === 'can_write' &&
            newValue === false
          ) {
            return
          }
          const existing = updated.find(
            p => p.module_code === module.code && p.tab_code === tab.code
          )
          if (existing) {
            updated = updated.map(p =>
              p.module_code === module.code && p.tab_code === tab.code
                ? { ...p, [field]: newValue }
                : p
            )
          } else {
            updated.push({
              module_code: module.code,
              tab_code: tab.code,
              can_read: field === 'can_read' ? newValue : false,
              can_write: field === 'can_write' ? newValue : false,
            })
          }
        })
      }

      return updated
    })
  }

  // 切換單一分頁
  const toggleTabPermission = (
    moduleCode: string,
    tabCode: string,
    field: 'can_read' | 'can_write'
  ) => {
    setPermissions(prev => {
      const existing = prev.find(p => p.module_code === moduleCode && p.tab_code === tabCode)
      if (existing) {
        return prev.map(p =>
          p.module_code === moduleCode && p.tab_code === tabCode ? { ...p, [field]: !p[field] } : p
        )
      }
      return [
        ...prev,
        {
          module_code: moduleCode,
          tab_code: tabCode,
          can_read: field === 'can_read',
          can_write: field === 'can_write',
        },
      ]
    })
  }

  // 建立新角色
  const handleCreateRole = async () => {
    if (!editingRole.name) return

    setSaving(true)
    try {
      const res = await apiMutate<Role>('/api/roles', {
        method: 'POST',
        body: {
          name: editingRole.name,
          description: editingRole.description || null,
        },
      })

      if (res.ok && res.data) {
        await mutateRoles()
        setSelectedRole(res.data)
        setIsDialogOpen(false)
        setEditingRole({ name: '', description: '' })
        toast.success('已建立角色')
      }
    } catch (err) {
      logger.error('Failed to create role:', err)
      toast.error('建立失敗')
    }
    setSaving(false)
  }

  // 儲存權限 + 讀取範圍
  const handleSavePermissions = async () => {
    if (!selectedRole) return

    setSaving(true)
    try {
      const payload = permissions.filter(p => p.can_read || p.can_write)
      logger.log('[ROLES] PUT payload', {
        role: selectedRole.name,
        role_id: selectedRole.id,
        count: payload.length,
        permissions: payload,
        read_scope: readScope,
      })

      const res = await apiMutate(`/api/roles/${selectedRole.id}/tab-permissions`, {
        method: 'PUT',
        body: { permissions },
      })

      if (!res.ok) {
        logger.error('[ROLES] Save failed', { status: res.status, body: res.data })
        toast.error('儲存失敗', { description: res.error || `HTTP ${res.status}` })
        return
      }

      // 讀取範圍若有變動、額外打 PUT /api/roles/[id] 更新 read_scope
      if (readScope !== selectedRole.read_scope) {
        const scopeRes = await apiMutate(`/api/roles/${selectedRole.id}`, {
          method: 'PUT',
          body: { read_scope: readScope },
        })
        if (!scopeRes.ok) {
          logger.error('[ROLES] read_scope save failed', { status: scopeRes.status })
          toast.error('讀取範圍儲存失敗', {
            description: scopeRes.error || `HTTP ${scopeRes.status}`,
          })
        } else {
          await mutateRoles()
        }
      }

      // 5/24：職務能力改了 → 失效 role_capabilities 快取、讓「業務/團控/代墊」指派下拉即時反映
      // （這些下拉吃 useRoleCapabilities、否則授予能力後要等快取過期才出現）
      await invalidateRoleCapabilities()

      // 存完重新 fetch 驗證（確保 DB 狀態反映到 UI）
      const verifyRes = await fetch(`/api/roles/${selectedRole.id}/tab-permissions`)
      if (verifyRes.ok) {
        const data = await verifyRes.json()
        logger.log('[ROLES] Post-save verify', {
          role: selectedRole.name,
          count: data.length,
          permissions: data,
        })
        setPermissions(data)
      }
      toast.success('已儲存權限')
    } catch (err) {
      logger.error('Failed to save permissions:', err)
      toast.error('儲存失敗')
    }
    setSaving(false)
  }

  // 刪除職務
  const handleDeleteRole = async (role: Role) => {
    if (role.is_admin) {
      toast.error('無法刪除系統主管角色')
      return
    }

    const confirmed = await confirm(`確定要刪除「${role.name}」角色嗎？`, {
      title: '刪除職務',
      type: 'warning',
    })
    if (!confirmed) return

    try {
      const res = await apiMutate(`/api/roles/${role.id}`, { method: 'DELETE' })
      if (res.ok) {
        // 若刪的是選中的，先切到另一筆（用當前 roles 計算 fallback）
        if (selectedRole?.id === role.id) {
          setSelectedRole(roles.find(r => r.id !== role.id) || null)
        }
        await mutateRoles()
        toast.success('已刪除職務')
      }
    } catch (err) {
      logger.error('Failed to delete role:', err)
      toast.error('刪除失敗')
    }
  }

  // 權限檢查：只有有 hr.roles.write capability 的員工能管理職務與權限
  if (!can(CAPABILITIES.HR_MANAGE_ROLES)) {
    return (
      <ContentPageLayout
        title={t('roleManagement')}
        icon={Shield}
        breadcrumb={[
          { label: t('breadcrumbHr'), href: '/hr' },
          { label: t('roleManagement'), href: '/hr/roles' },
        ]}
      >
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="p-8 text-center rounded-lg border border-morandi-border bg-morandi-surface">
            <Shield className="h-12 w-12 mx-auto text-status-danger mb-4" />
            <p className="text-morandi-secondary">權限不足,只有系統主管能進入職務管理</p>
          </div>
        </div>
      </ContentPageLayout>
    )
  }

  return (
    <ContentPageLayout
      title={t('roleManagement')}
      icon={Shield}
      tabs={HR_ADMIN_TABS.employee}
      activeTab="/hr/roles"
      onTabChange={href => router.push(href)}
      breadcrumb={[
        { label: t('breadcrumbHr'), href: '/hr' },
        { label: '職務管理', href: '/hr/roles' },
      ]}
      primaryAction={{
        label: '新增職務',
        icon: Plus,
        onClick: () => setIsDialogOpen(true),
      }}
      rootDataTutorial="hr-roles-header"
      contentClassName="flex-1 overflow-hidden flex flex-col min-h-0 p-0"
    >
      <>
        <div className="grid grid-cols-12 gap-6 flex-1 min-h-0 auto-rows-fr">
          {/* 左側：職務列表 */}
          <div className="col-span-3 flex flex-col min-h-0" data-tutorial="role-list-panel">
            <RoleListPanel
              roles={roles}
              loading={loading}
              selectedRole={selectedRole}
              onSelectRole={setSelectedRole}
              onDeleteRole={handleDeleteRole}
            />
          </div>

          {/* 右側：權限設定 */}
          <div className="col-span-9 flex flex-col min-h-0" data-tutorial="role-capability-panel">
            <RoleCapabilityTable
              selectedRole={selectedRole}
              visibleModules={visibleModules}
              permissions={permissions}
              expandedModules={expandedModules}
              saving={saving}
              readScope={readScope}
              onReadScopeChange={setReadScope}
              branchesCount={branchesCount}
              onToggleExpand={toggleExpand}
              onToggleModuleAll={toggleModuleAll}
              onToggleTabPermission={toggleTabPermission}
              onSavePermissions={handleSavePermissions}
              getPermission={getPermission}
              isModuleFullyEnabled={isModuleFullyEnabled}
              isModulePartiallyEnabled={isModulePartiallyEnabled}
            />
          </div>
        </div>

        {/* 新增職務 Dialog */}
        <FormDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          title={PAGE_LABELS.ADD_ROLE}
          onSubmit={handleCreateRole}
          submitLabel={saving ? '建立中...' : '建立'}
          loading={saving}
          submitDisabled={!editingRole.name}
          maxWidth="sm"
        >
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name" className="text-morandi-primary">
                角色名稱
              </Label>
              <Input
                id="name"
                value={editingRole.name}
                onChange={e => setEditingRole({ ...editingRole, name: e.target.value })}
                placeholder={PAGE_LABELS.ROLE_NAME_PLACEHOLDER}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="description" className="text-morandi-primary">
                說明（選填）
              </Label>
              <Input
                id="description"
                value={editingRole.description}
                onChange={e => setEditingRole({ ...editingRole, description: e.target.value })}
                placeholder={PAGE_LABELS.ROLE_DESC_PLACEHOLDER}
                className="mt-1"
              />
            </div>
          </div>
        </FormDialog>
      </>
    </ContentPageLayout>
  )
}
