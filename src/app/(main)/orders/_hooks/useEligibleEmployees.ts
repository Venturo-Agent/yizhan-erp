'use client'

/**
 * useEligibleEmployees — 取有特定資格的員工清單
 *
 * 5/13 William 拍板：資格從 employee_eligibilities 讀、不再從 role_capabilities。
 *
 * 用法：
 *   const salesPersons = useEligibleEmployees('tours.as_sales')
 *   const assistants = useEligibleEmployees('tours.as_assistant')
 *   const controllers = useEligibleEmployees('tours.as_controller')
 *   const advancers = useEligibleEmployees('finance.advance_payment')
 */

import { useMemo } from 'react'
import { useEmployeeEligibilities, useEmployeesSlim } from '@/data'

export function useEligibleEmployees(eligibilityCode: string) {
  const { items: eligibilities } = useEmployeeEligibilities()
  const { items: employees } = useEmployeesSlim({ all: true })

  return useMemo(() => {
    const eligibleIds = new Set(
      (eligibilities || [])
        .filter((e) => e.eligibility_code === eligibilityCode)
        .map((e) => e.employee_id),
    )
    return (employees || []).filter((emp) => eligibleIds.has(emp.id))
  }, [eligibilities, employees, eligibilityCode])
}

export { ELIGIBILITY, type EligibilityCode } from '@/lib/eligibilities'
