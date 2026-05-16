import { Loader2 } from 'lucide-react'

export function ModuleLoading({
  fullscreen = false,
  className = '',
}: { fullscreen?: boolean; className?: string } = {}) {
  return (
    <div
      className={`w-full flex items-center justify-center ${
        fullscreen ? 'min-h-screen' : 'h-full min-h-[25rem]'
      } ${className}`}
    >
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )
}
