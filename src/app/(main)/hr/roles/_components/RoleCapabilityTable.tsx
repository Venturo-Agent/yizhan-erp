// 角色權限表格（右側面板，從 roles/page.tsx 抽出）
// 顯示模組 / 分頁權限的 Switch 清單、支援全開/全關/部分開啟

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Shield, Save, Loader2 } from 'lucide-react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { type ModuleDefinition, type TabPermission } from '@/lib/permissions'
import type { Role } from '@/data/hooks/useRoles'

interface RoleCapabilityTableProps {
  selectedRole: Role | null
  visibleModules: ModuleDefinition[]
  permissions: TabPermission[]
  expandedModules: string[]
  saving: boolean
  onToggleExpand: (moduleCode: string) => void
  onToggleModuleAll: (module: ModuleDefinition, field: 'can_read' | 'can_write') => void
  onToggleTabPermission: (
    moduleCode: string,
    tabCode: string,
    field: 'can_read' | 'can_write'
  ) => void
  onSavePermissions: () => void
  getPermission: (moduleCode: string, tabCode: string | null) => TabPermission | undefined
  isModuleFullyEnabled: (module: ModuleDefinition, field: 'can_read' | 'can_write') => boolean
  isModulePartiallyEnabled: (module: ModuleDefinition, field: 'can_read' | 'can_write') => boolean
}

export function RoleCapabilityTable({
  selectedRole,
  visibleModules,
  permissions: _permissions,
  expandedModules,
  saving,
  onToggleExpand,
  onToggleModuleAll,
  onToggleTabPermission,
  onSavePermissions,
  getPermission,
  isModuleFullyEnabled,
  isModulePartiallyEnabled,
}: RoleCapabilityTableProps) {
  const renderModuleRow = (module: ModuleDefinition) => {
    const hasTabs = module.tabs.length > 0
    const isExpanded = expandedModules.includes(module.code)
    const isAdminRole = selectedRole?.is_admin

    const readFully = isModuleFullyEnabled(module, 'can_read')
    const readPartial = isModulePartiallyEnabled(module, 'can_read')
    const writeFully = isModuleFullyEnabled(module, 'can_write')
    const writePartial = isModulePartiallyEnabled(module, 'can_write')

    return (
      <div key={module.code}>
        {/* 模組行 */}
        <div
          className={`flex items-center border-t border-border ${hasTabs ? 'bg-morandi-bg/30' : 'bg-card'}`}
        >
          <div className="flex-1 p-4 flex items-center gap-2">
            {hasTabs ? (
              <button
                onClick={() => onToggleExpand(module.code)}
                className="p-1 hover:bg-morandi-bg rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-morandi-secondary" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-morandi-secondary" />
                )}
              </button>
            ) : (
              <div className="w-6" />
            )}
            <span className="font-medium text-morandi-primary">{module.name}</span>
            {hasTabs && (
              <Badge variant="outline" className="text-xs text-morandi-secondary">
                {module.tabs.length} 個分頁
              </Badge>
            )}
          </div>
          <div className="w-32 p-4 flex justify-center">
            <div className="relative">
              <Switch
                checked={readFully}
                onCheckedChange={() => onToggleModuleAll(module, 'can_read')}
                className="data-[state=checked]:bg-morandi-green"
              />
              {readPartial && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-morandi-gold rounded-full" />
              )}
            </div>
          </div>
          <div className="w-32 p-4 flex justify-center">
            <div className="relative">
              <Switch
                checked={writeFully}
                onCheckedChange={() => onToggleModuleAll(module, 'can_write')}
                className="data-[state=checked]:bg-morandi-gold"
              />
              {writePartial && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-morandi-gold rounded-full" />
              )}
            </div>
          </div>
        </div>

        {/* 分頁行 */}
        {hasTabs &&
          isExpanded &&
          module.tabs.map(tab => {
            const perm = getPermission(module.code, tab.code)
            // 自鎖保護：系統主管的「職務管理·可寫入」(hr.roles.write) 永遠鎖定、
            // 留一把「回得來的鑰匙」、避免系統主管把權限管理能力關掉後再也進不來改回。
            const rolesWriteLocked = isAdminRole && module.code === 'hr' && tab.code === 'roles'
            return (
              <div key={tab.code} className="flex items-center border-t border-border bg-card">
                <div className="flex-1 p-4 pl-12 flex items-center gap-2">
                  <div className="w-1 h-4 bg-border rounded-full" />
                  <span className="text-sm text-morandi-primary">{tab.name}</span>
                </div>
                <div className="w-32 p-4 flex justify-center">
                  <Switch
                    checked={perm?.can_read ?? false}
                    onCheckedChange={() => onToggleTabPermission(module.code, tab.code, 'can_read')}
                    className="data-[state=checked]:bg-morandi-green"
                  />
                </div>
                <div className="w-32 p-4 flex justify-center">
                  <Switch
                    checked={rolesWriteLocked || (perm?.can_write ?? false)}
                    onCheckedChange={() =>
                      onToggleTabPermission(module.code, tab.code, 'can_write')
                    }
                    disabled={rolesWriteLocked}
                    title={
                      rolesWriteLocked
                        ? '系統主管必須保留「職務管理」權限、避免鎖死自己'
                        : undefined
                    }
                    className="data-[state=checked]:bg-morandi-gold"
                  />
                </div>
              </div>
            )
          })}
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-lg flex flex-col h-full">
      <div className="flex items-center justify-between px-4 h-14 border-b border-border">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-morandi-primary">
            {selectedRole ? `${selectedRole.name} 的權限` : '請選擇職務'}
          </h3>
          {selectedRole && (
            <div className="flex items-center gap-4 text-xs text-morandi-secondary">
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-morandi-green" /> 可讀取
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-morandi-gold" /> 可寫入
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-morandi-gold" /> 部分開啟
              </span>
            </div>
          )}
        </div>
        {selectedRole && (
          <Button
            variant="soft-gold"
            onClick={onSavePermissions}
            disabled={saving}
            size="sm"
            className="h-8"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5 mr-1.5" />
            )}
            儲存
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {selectedRole ? (
          <div>
            {/* 表頭 */}
            <div className="flex items-center bg-card sticky top-0 z-20 border-b border-border shadow-sm">
              <div className="flex-1 p-4 font-semibold text-morandi-primary">功能模組</div>
              <div className="w-32 p-4 text-center font-semibold text-morandi-primary">可讀取</div>
              <div className="w-32 p-4 text-center font-semibold text-morandi-primary">可寫入</div>
            </div>

            {/* 模組列表（只列出 workspace 已啟用的功能） */}
            {visibleModules.map(module => renderModuleRow(module))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-morandi-secondary">
            <div className="text-center">
              <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>請從左側選擇一個角色</p>
            </div>
          </div>
        )}
      </div>

      {selectedRole?.is_admin && (
        <div className="p-4 border-t border-border bg-morandi-bg/30">
          <p className="text-sm text-morandi-secondary text-center">
            系統主管可自行調整能力（「職務管理·可寫入」保留鎖定、避免鎖死自己）
          </p>
        </div>
      )}
    </div>
  )
}
