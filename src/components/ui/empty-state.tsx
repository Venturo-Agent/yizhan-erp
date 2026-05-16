import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: LucideIcon
  message: string
  description?: string
  action?: React.ReactNode
  className?: string
  iconSize?: number
}

export function EmptyState({
  icon: Icon,
  message,
  description,
  action,
  className,
  iconSize = 48,
}: EmptyStateProps) {
  return (
    <div className={cn('text-center py-8 text-morandi-muted', className)}>
      {Icon && <Icon size={iconSize} className="mx-auto mb-4 opacity-50" />}
      <p className="text-sm">{message}</p>
      {description && <p className="mt-2 text-xs text-morandi-muted/80">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
