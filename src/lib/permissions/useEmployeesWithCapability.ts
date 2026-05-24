'use client'

/**
 * useEmployeesWithCapability — 取職務具備某能力的員工（指派候選池）
 *
 * 5/24 William 拍板：純角色 SSOT。候選 = 員工的職務(role_id)在 role_capabilities 有該能力(enabled)。
 * 取代舊的 useEligibleEmployees（eligibility 旗標、已廢）。
 *
 * 回傳空陣列 = 全公司無人具此能力 → caller 可據此隱藏對應欄位/按鈕（hide-if-none、William 特別交代）。
 *
 * 用法：
 *   const salesPersons = useEmployeesWithCapability(CAPABILITIES.ORDERS_CREATE_WRITE)   // 業務
 *   const controllers  = useEmployeesWithCapability(CAPABILITIES.TOURS_MEMBERS_WRITE)   // 團控
 *   const advancers    = useEmployeesWithCapability(CAPABILITIES.FINANCE_ADVANCE_PAYMENT_WRITE) // 代墊
 */

import { useMemo } from 'react'
import { useRoleCapabilities, useEmployeesSlim } from '@/data'

export function useEmployeesWithCapability(capabilityCode: string) {
  const { items: roleCaps } = useRoleCapabilities()
  const { items: employees } = useEmployeesSlim({ all: true })

  return useMemo(() => {
    const roleIdsWithCap = new Set(
      roleCaps
        .filter((rc) => rc.capability_code === capabilityCode && rc.enabled)
        .map((rc) => rc.role_id),
    )
    return employees.filter((emp) => {
      const roleId = (emp as { role_id?: string | null }).role_id
      return roleId != null && roleIdsWithCap.has(roleId)
    })
  }, [roleCaps, employees, capabilityCode])
}
