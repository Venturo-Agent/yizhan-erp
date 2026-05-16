'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'

interface TooltipContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const TooltipContext = React.createContext<TooltipContextValue>({
  open: false,
  setOpen: () => {},
})

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function Tooltip({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)

  return (
    <TooltipContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-flex">{children}</div>
    </TooltipContext.Provider>
  )
}

export function TooltipTrigger({
  children,
  asChild = false,
}: {
  children: React.ReactNode
  asChild?: boolean
}) {
  const { setOpen } = React.useContext(TooltipContext)

  const handleMouseEnter = () => setOpen(true)
  const handleMouseLeave = () => setOpen(false)

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(
      children as React.ReactElement<{
        onMouseEnter?: () => void
        onMouseLeave?: () => void
      }>,
      {
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
      }
    )
  }

  return (
    <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {children}
    </div>
  )
}

export function TooltipContent({
  children,
  className,
  side = 'bottom',
  ...props
}: {
  children: React.ReactNode
  className?: string
  side?: 'top' | 'bottom'
}) {
  const { open } = React.useContext(TooltipContext)

  if (!open) return null

  // 統一顯示在下方，帶箭頭
  const positionClasses =
    side === 'top'
      ? 'bottom-full left-1/2 -translate-x-1/2 mb-2'
      : 'top-full left-1/2 -translate-x-1/2 mt-2'

  const arrowClasses =
    side === 'top'
      ? 'top-full left-1/2 -translate-x-1/2 border-t-morandi-primary border-l-transparent border-r-transparent border-b-transparent'
      : 'bottom-full left-1/2 -translate-x-1/2 border-b-morandi-primary border-l-transparent border-r-transparent border-t-transparent'

  return (
    <div
      className={cn(
        'absolute z-[9999] whitespace-nowrap rounded-md bg-morandi-primary px-2.5 py-1 text-xs text-white shadow-lg',
        'animate-in fade-in-0 zoom-in-95 duration-150',
        positionClasses,
        className
      )}
      {...props}
    >
      {children}
      {/* 箭頭 */}
      <div className={cn('absolute w-0 h-0 border-[0.3125rem]', arrowClasses)} />
    </div>
  )
}
