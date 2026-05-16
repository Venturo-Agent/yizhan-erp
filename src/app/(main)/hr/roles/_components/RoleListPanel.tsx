// 職務列表左側面板（從 roles/page.tsx 抽出）

import { Button } from '@/components/ui/button'
import { Loader2, Users, Trash2, Check } from 'lucide-react'
import type { Role } from '@/data/hooks/useRoles'

const PANEL_LABELS = {
  ROLE_LIST: '職務列表',
  NO_ROLES_YET: '尚未建立角色',
} as const

interface RoleListPanelProps {
  roles: Role[]
  loading: boolean
  selectedRole: Role | null
  onSelectRole: (role: Role) => void
  onDeleteRole: (role: Role) => void
}

export function RoleListPanel({
  roles,
  loading,
  selectedRole,
  onSelectRole,
  onDeleteRole,
}: RoleListPanelProps) {
  return (
    <div className="bg-card border border-border rounded-lg flex flex-col h-full">
      <div className="flex items-center px-4 h-14 border-b border-border">
        <h3 className="font-semibold text-morandi-primary">{PANEL_LABELS.ROLE_LIST}</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-morandi-secondary" />
          </div>
        ) : roles.length === 0 ? (
          <div className="text-center py-8 text-morandi-secondary">
            <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>{PANEL_LABELS.NO_ROLES_YET}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {roles.map(role => (
              <div
                key={role.id}
                className={`group p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedRole?.id === role.id
                    ? 'border-morandi-gold bg-morandi-gold/5 shadow-sm'
                    : 'border-border hover:border-morandi-gold/50 hover:bg-morandi-bg/50'
                }`}
                onClick={() => onSelectRole(role)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {selectedRole?.id === role.id && (
                      <Check className="h-4 w-4 text-morandi-gold" />
                    )}
                    <span className="font-medium text-morandi-primary text-sm">{role.name}</span>
                  </div>
                  {!role.is_admin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-morandi-red/10 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={e => {
                        e.stopPropagation()
                        onDeleteRole(role)
                      }}
                    >
                      <Trash2 className="h-3 w-3 text-morandi-red" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
