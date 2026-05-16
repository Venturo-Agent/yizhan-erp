import { cn } from '@/lib/utils'

interface ContentContainerProps {
  children: React.ReactNode
  className?: string
}

export function ContentContainer({ children, className }: ContentContainerProps) {
  return (
    <div className={cn('bg-card rounded-xl shadow-sm border border-border p-6', className)}>
      {children}
    </div>
  )
}
