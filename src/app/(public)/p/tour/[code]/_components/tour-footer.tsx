'use client'

/**
 * 公開行程頁面 - Footer（業務名片 + 公司資訊）
 */

import { Phone, Mail, User } from 'lucide-react'
import type { EmployeeInfo, CompanyInfo } from './tour-types'

interface TourFooterProps {
  employee: EmployeeInfo | null
  companyInfo: CompanyInfo
}

export function TourFooter({ employee, companyInfo }: TourFooterProps) {
  return (
    <footer className="bg-morandi-container/50 border-t border-border py-12 mt-24">
      <div className="max-w-7xl mx-auto px-8">
        {/* Employee Card */}
        {employee && (
          <div className="bg-card rounded-2xl p-8 shadow-sm border border-border mb-8 max-w-xl mx-auto">
            <div className="text-center mb-6">
              <span className="text-xs font-bold text-morandi-secondary uppercase tracking-widest">
                您的專屬顧問
              </span>
            </div>
            <div className="flex items-center gap-6">
              {employee.avatar_url ? (
                <img
                  src={employee.avatar_url}
                  alt={employee.display_name || ''}
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-public-primary flex items-center justify-center">
                  <User className="w-8 h-8 text-white" />
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-xl font-bold text-public-primary">
                  {employee.display_name || '專屬顧問'}
                </h3>
                {employee.employee_number && (
                  <p className="text-sm text-morandi-secondary mb-2">
                    員工編號：{employee.employee_number}
                  </p>
                )}
                {employee.email && (
                  <a
                    href={`mailto:${employee.email}`}
                    className="flex items-center gap-2 text-sm text-public-secondary hover:underline mt-3"
                  >
                    <Mail className="w-4 h-4" />
                    {employee.email}
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Company Info */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-lg font-bold text-public-primary">{companyInfo.name}</div>
          {companyInfo.phone && (
            <a
              href={`tel:${companyInfo.phone}`}
              className="flex items-center gap-2 text-morandi-secondary hover:text-public-primary"
            >
              <Phone className="w-4 h-4" />
              {companyInfo.phone}
            </a>
          )}
          <div className="text-morandi-muted text-xs">
            © {new Date().getFullYear()} {companyInfo.name}. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  )
}
