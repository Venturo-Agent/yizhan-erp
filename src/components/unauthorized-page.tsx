import { ShieldAlert } from 'lucide-react'

export function UnauthorizedPage({ message = '無此頁面權限' }: { message?: string }) {
  return (
    <div className="p-8 text-center">
      <ShieldAlert className="h-12 w-12 mx-auto mb-4 text-status-danger" />
      <p className="text-morandi-secondary">{message}</p>
    </div>
  )
}
