import * as React from 'react'
import { cn } from '@/lib/utils'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-[38px] w-full rounded-input border border-line bg-card px-3 text-body text-ink transition-colors duration-150 placeholder:text-ink-faint hover:border-[#D3D8E3] focus:border-accent focus:outline-none',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'w-full rounded-input border border-line bg-card p-3 text-body text-ink transition-colors duration-150 placeholder:text-ink-faint hover:border-[#D3D8E3] focus:border-accent focus:outline-none',
      className,
    )}
    {...props}
  />
))
Textarea.displayName = 'Textarea'

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('flex items-center gap-1 text-faint font-semibold text-ink', className)} {...props} />
}

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null
  return <p className="text-chip font-semibold text-chip-danger-fg">{children}</p>
}
