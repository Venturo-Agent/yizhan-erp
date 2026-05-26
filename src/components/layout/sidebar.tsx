'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useWorkspaceFeatures } from '@/lib/permissions'
import { useMyCapabilities } from '@/lib/permissions/useMyCapabilities'
import { ChevronRight, ChevronDown, User, Wrench, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { Skeleton } from '@/components/ui/skeleton'
import { COMP_LAYOUT_LABELS } from './constants/labels'
import { ALL_MODULES } from '@/modules/_registry'
import { SIDEBAR_ORDER, SIDEBAR_META, DEFAULT_SIDEBAR_ICON } from './sidebar-config'
import { PersonalSettingsDialog } from './PersonalSettingsDialog'

interface MenuItem {
  href: string
  label: string
  icon: React.ElementType
  children?: MenuItem[]
  requiredPermission?: string
}

/**
 * menuItems — 從 ALL_MODULES + SIDEBAR_ORDER + SIDEBAR_META 衍生
 *
 * 2026-05-15 William 拍板：sidebar 從 module SSOT 衍生主 entry、
 * 細節（icon / 順序 / sub-menu）放 sidebar-config.ts。
 *
 * 邏輯：
 *   1. 按 SIDEBAR_ORDER 順序、為每個 code 找 module
 *   2. 用 SIDEBAR_META[code] lookup icon / label / children / href
 *   3. requiredPermission 自動 = module.code（不手寫）
 *   4. href fallback = module.routes[0]、label fallback = module.name、icon fallback = Box
 *
 * 新加 module 進 sidebar：
 *   - 加 code 進 SIDEBAR_ORDER（決定位置）
 *   - 加 SIDEBAR_META[code]（可選）
 */
const menuItems: MenuItem[] = SIDEBAR_ORDER.map(code => {
  const m = ALL_MODULES.find(x => x.code === code)
  if (!m) return null
  const meta = SIDEBAR_META[code]
  if (meta?.hidden) return null
  const href = meta?.href ?? m.routes[0]
  if (!href) return null
  return {
    href,
    label: meta?.label ?? m.name,
    icon: meta?.icon ?? DEFAULT_SIDEBAR_ICON,
    requiredPermission: m.code,
    // children 用 child.feature（sub-feature 級）過濾、不是 parent module.code（粗粒度）
    // 譬如業務只勾「finance.payments」cap → 只顯示「收款管理」、不顯示其他財務子 menu
    children: meta?.children?.map(c => ({
      ...c,
      requiredPermission: c.feature ?? m.code,
    })),
  } as MenuItem
}).filter((x): x is MenuItem => x !== null)

const personalToolItems: MenuItem[] = []

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuthStore()
  const { isFeatureEnabled, enabledFeatures } = useWorkspaceFeatures()

  const handleLogout = async () => {
    // 用 try/finally 保證 redirect 一定 fire
    // 之前若 supabase.auth.signOut() 或 /api/auth/logout 卡住（401 retry loop / network 卡）
    // window.location.href 永遠執行不到、user 看到頁面一直轉
    // 5/12 William 踩坑修
    try {
      await Promise.race([
        logout(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('logout timeout')), 3000)),
      ])
    } catch (_err) {
      // 即使 logout 失敗、也要強制跳離（cookie / state 在 server-side 也會被 middleware 處理）
    } finally {
      window.location.href = '/login'
    }
  }
  const { canReadAnyInModule, has, loading: capsLoading } = useMyCapabilities()
  const [mounted, setMounted] = useState(false)
  const [personalSettingsOpen, setPersonalSettingsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false) // 點擊固定展開
  const [isHovered, setIsHovered] = useState(false) // 滑鼠懸停暫時展開
  const [expandedMenus, setExpandedMenus] = useState<string[]>([])

  // 實際顯示狀態：固定展開 或 懸停展開
  const showExpanded = isExpanded || isHovered

  useEffect(() => {
    setMounted(true)
  }, [])

  // 切換側邊欄展開/收起
  const _toggleSidebar = () => {
    setIsExpanded(prev => !prev)
    // 收起時也收起所有子選單
    if (isExpanded) {
      setExpandedMenus([])
    }
  }

  // 關閉側邊欄（跳轉時使用）
  const closeSidebar = () => {
    setIsExpanded(false)
    setExpandedMenus([])
  }

  // 切換子選單展開/收起
  const toggleSubmenu = (href: string) => {
    // 如果側邊欄是收起的（非固定展開），先固定展開再展開子選單
    if (!isExpanded && !isHovered) {
      setIsExpanded(true)
      setExpandedMenus([href])
      return
    }
    setExpandedMenus(prev => (prev.includes(href) ? prev.filter(h => h !== href) : [...prev, href]))
  }

  // 滑鼠進入/離開側邊欄
  const handleMouseEnter = () => {
    if (!isExpanded) {
      setIsHovered(true)
    }
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    // 離開時收起子選單（如果不是固定展開狀態）
    if (!isExpanded) {
      setExpandedMenus([])
    }
  }

  const is_active = (href: string) => {
    if (!mounted) return false
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  // 權限過濾：純靠 capability + workspace_features
  const visibleMenuItems = useMemo(() => {
    const filterMenuByPermissions = (items: MenuItem[]): MenuItem[] => {
      if (!user) return items.filter(item => !item.requiredPermission)

      return items
        .map(item => {
          // 統一守門：workspace_features（workspace 有沒有開這個 feature）+ role_capabilities（user 能不能讀）
          if (item.requiredPermission) {
            if (!isFeatureEnabled(item.requiredPermission)) {
              return null
            }
          }

          if (item.children) {
            const visibleChildren = filterMenuByPermissions(item.children)
            if (visibleChildren.length > 0) {
              return { ...item, children: visibleChildren }
            }
            return null
          }
          if (!item.requiredPermission) return item
          // 模組層任一 capability：role_capabilities 中存在 ${module}.*.read 即顯示
          return canReadAnyInModule(item.requiredPermission) ? item : null
        })
        .filter((item): item is MenuItem => item !== null)
    }
    return filterMenuByPermissions(menuItems)
  }, [user?.id, user?.workspace_code, canReadAnyInModule, isFeatureEnabled, enabledFeatures])

  const visiblePersonalToolItems = useMemo(() => {
    return personalToolItems.filter(item => {
      if (!user) return !item.requiredPermission
      if (!item.requiredPermission) return true
      return canReadAnyInModule(item.requiredPermission)
    })
  }, [user?.id, canReadAnyInModule])

  // 渲染菜單項目
  const renderMenuItem = (item: MenuItem, isChild = false) => {
    const hasChildren = item.children && item.children.length > 0
    const isSubmenuExpanded = expandedMenus.includes(item.href)
    const active = is_active(item.href)

    if (hasChildren) {
      return (
        <li
          key={`${item.href}-${item.label}`}
          data-tutorial={`nav-${item.href.replace(/^\//, '').split('/')[0]}`}
        >
          {/* 父項目：flex layout、icon 在固定 w-16 wrapper、不隨 sidebar 寬度晃動
              active border 用 absolute、不佔 3px 寬、避免 icon 偏離水平中心 */}
          <div
            className={cn(
              'relative w-full flex items-center h-11 text-sm text-sidebar-fg cursor-pointer',
              'hover:bg-morandi-gold/5 hover:text-morandi-gold',
              active && 'bg-morandi-gold/10 text-morandi-gold'
            )}
            onClick={() => toggleSubmenu(item.href)}
          >
            {active && (
              <div className="absolute left-0 top-0 bottom-0 w-[0.1875rem] bg-morandi-gold" />
            )}
            <div className="w-16 flex justify-center shrink-0">
              <item.icon size="1.375em" strokeWidth={1.5} />
            </div>
            {showExpanded && (
              <>
                <span className="flex-1 text-left whitespace-nowrap overflow-hidden">
                  {item.label}
                </span>
                <div className="px-3">
                  {isSubmenuExpanded ? (
                    <ChevronDown size="0.875em" className="text-morandi-gold" />
                  ) : (
                    <ChevronRight size="0.875em" />
                  )}
                </div>
              </>
            )}
          </div>

          {/* 子項目 - 展開在下方 */}
          {showExpanded && isSubmenuExpanded && item.children && (
            <ul className="bg-morandi-background/30">
              {item.children.map(child => renderMenuItem(child, true))}
            </ul>
          )}
        </li>
      )
    }

    // 沒有子項目的菜單項：flex layout、icon 固定不晃
    // 2026-05-22 William 拍板：子項目 icon + 字體都用 em / rem、跟著 FontScaleSwitcher 等比例縮放
    //   - icon: 1em（vs 父 1.375em ≈ 72%）
    //   - 字體: text-xs（vs 父 text-sm ≈ 86%、視覺一致縮）
    //   - 整體右移：icon container 多 pl-4、字體再 pl-1 強化「子目錄」感
    return (
      <li
        key={`${item.href}-${item.label}`}
        data-tutorial={`nav-${item.href.replace(/^\//, '').split('/')[0]}`}
      >
        <Link
          href={item.href}
          prefetch={false}
          onClick={closeSidebar}
          className={cn(
            'relative w-full flex items-center h-11 text-sidebar-fg',
            isChild ? 'text-xs' : 'text-sm',
            'hover:bg-morandi-gold/5 hover:text-morandi-gold',
            active && 'bg-morandi-gold/10 text-morandi-gold'
          )}
        >
          {active && (
            <div className="absolute left-0 top-0 bottom-0 w-[0.1875rem] bg-morandi-gold" />
          )}
          <div className={cn('w-16 flex justify-center shrink-0', isChild && 'pl-4')}>
            <item.icon size={isChild ? '1em' : '1.375em'} strokeWidth={1.5} />
          </div>
          {showExpanded && (
            <span
              className={cn(
                'flex-1 text-left whitespace-nowrap overflow-hidden',
                isChild && 'pl-1'
              )}
            >
              {item.label}
            </span>
          )}
        </Link>
      </li>
    )
  }

  return (
    <div
      className={cn(
        'fixed left-0 top-0 h-screen bg-morandi-container border-r-2 border-morandi-gold/20 z-30 transition-[width] duration-300 flex flex-col print:hidden',
        'hidden lg:flex',
        showExpanded ? 'w-[11.25rem]' : 'w-[4rem]'
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Logo區域：flex layout、Logo 永遠在 w-10 + 邊距固定位置、不隨 sidebar 寬度晃動 */}
      <div className="shrink-0 border-b border-border">
        <div className="h-18 flex items-center">
          <div className="w-16 flex justify-center shrink-0">
            <div className="w-10 h-10 rounded-lg bg-morandi-gold flex items-center justify-center shadow-sm opacity-90">
              <span className="text-white font-semibold text-lg">V</span>
            </div>
          </div>
          {showExpanded && (
            <div className="text-xl font-bold text-morandi-primary whitespace-nowrap overflow-hidden">
              {user?.workspace_code || 'V'}
            </div>
          )}
        </div>
      </div>

      {/* 統一導航選單 */}
      <nav className="flex-1 py-4 overflow-y-auto min-h-0">
        <ul className="space-y-px">
          {capsLoading ? (
            // capabilities 還沒到、render skeleton 避免「partial 兩項」可見
            // 三場景都覆蓋：首次登入 / 登出後重登 / refresh
            Array.from({ length: 7 }).map((_, i) => (
              <li key={`sidebar-skel-${i}`} className="px-3 py-1">
                <Skeleton className={cn('h-9 rounded-md', showExpanded ? 'w-full' : 'w-9')} />
              </li>
            ))
          ) : (
            <>
              {visibleMenuItems.map(item => renderMenuItem(item))}
              {visiblePersonalToolItems.map(item => renderMenuItem(item))}

              {/* 設定（只有有公司設定權限的人看得到；個人項目改走側邊欄底部「扳手」）*/}
              {has('settings.company.read') &&
                renderMenuItem({
                  href: '/settings',
                  label: COMP_LAYOUT_LABELS.設定,
                  icon: Wrench,
                })}
            </>
          )}
        </ul>
      </nav>

      {/* 底部使用者區：名字 + 登出 */}
      {user && (
        <div className="shrink-0 border-t border-border">
          <div className="h-14 flex items-center">
            <div className="w-16 flex justify-center shrink-0">
              <User size="1.375em" strokeWidth={1.5} className="text-sidebar-fg" />
            </div>
            {showExpanded && (
              <>
                <div className="flex-1 text-sm text-morandi-primary whitespace-nowrap overflow-hidden">
                  {user.display_name || user.chinese_name || user.english_name || '使用者'}
                </div>
                <button
                  type="button"
                  onClick={() => setPersonalSettingsOpen(true)}
                  title={COMP_LAYOUT_LABELS.個人偏好}
                  className="px-2 py-2 text-sidebar-fg hover:text-morandi-gold transition-colors"
                >
                  <Wrench size="1em" />
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  title={COMP_LAYOUT_LABELS?.LOGOUT || '登出'}
                  className="px-3 py-2 text-sidebar-fg hover:text-morandi-red transition-colors"
                >
                  <LogOut size="1em" />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <PersonalSettingsDialog open={personalSettingsOpen} onOpenChange={setPersonalSettingsOpen} />
    </div>
  )
}
