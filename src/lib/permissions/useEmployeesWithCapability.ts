'use client'

/**
 * useEmployeesWithCapability — 取職務具備某能力的員工（指派候選池）
 *
 * 5/24 William 拍板：純角色 SSOT。候選 = 員工的職務(role_id)在 role_capabilities 有該能力(enabled)。
 * 取代舊的 useEligibleEmployees（eligibility 旗標、已廢）。
 *
 * 回傳空陣列 = 全公司無人具此能力 → caller 可據此隱藏對應欄位/按鈕（hide-if-none、William 特別交代）。
 *
 * 傳單一能力或能力陣列（陣列 = 任一符合即入池、OR 語意）。
 *
 * 用法：
 *   const salesPersons = useEmployeesWithCapability([CAPABILITIES.ORDERS_CREATE_WRITE, CAPABILITIES.ORDERS_EDIT_WRITE]) // 業務（能新增或編輯訂單）
 *   const controllers  = useEmployeesWithCapability(CAPABILITIES.TOURS_MEMBERS_WRITE)   // 團控
 *   const advancers    = useEmployeesWithCapability(CAPABILITIES.FINANCE_ADVANCE_PAYMENT_WRITE) // 代墊
 */

import { useMemo } from 'react'
import { useRoleCapabilities, useEmployeesSlim } from '@/data'

export function useEmployeesWithCapability(capabilityCode: string | readonly string[]) {
  const { items: roleCaps } = useRoleCapabilities()
  const { items: employees } = useEmployeesSlim({ all: true })

  // 穩定化 key、避免每次 render 新陣列導致 useMemo 失效
  const codeKey = Array.isArray(capabilityCode) ? capabilityCode.join('|') : capabilityCode

  return useMemo(() => {
    const wanted = new Set(Array.isArray(capabilityCode) ? capabilityCode : [capabilityCode])
    const roleIdsWithCap = new Set(
      roleCaps
        .filter((rc) => wanted.has(rc.capability_code) && rc.enabled)
        .map((rc) => rc.role_id),
    )
    return employees.filter((emp) => {
      const roleId = (emp as { role_id?: string | null }).role_id
      return roleId != null && roleIdsWithCap.has(roleId)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleCaps, employees, codeKey])
}
