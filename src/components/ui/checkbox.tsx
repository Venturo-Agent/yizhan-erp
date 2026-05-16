'use client'

import * as React from 'react'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> & { indeterminate?: boolean }
>(({ className, indeterminate, ...props }, ref) => {
  const checkboxRef = React.useRef<HTMLButtonElement>(null)

  React.useImperativeHandle(ref, () => checkboxRef.current!)

  React.useEffect(() => {
    if (checkboxRef.current) {
      const element = checkboxRef.current as HTMLButtonElement & { indeterminate?: boolean }
      element.indeterminate = indeterminate ?? false
    }
  }, [indeterminate])

  return (
    <CheckboxPrimitive.Root
      ref={checkboxRef}
      className={cn(
        'peer h-4 w-4 shrink-0 rounded-md border border-morandi-container ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-morandi-gold focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-morandi-gold data-[state=checked]:text-white',
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className={cn('flex items-center justify-center text-current')}>
        <Check className="h-4 w-4" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
})
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
