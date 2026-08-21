import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 rounded-input text-body font-semibold transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-white hover:bg-accent-hover',
        soft: 'bg-accent-soft text-chip-accent-fg hover:bg-[#E4E0FA]',
        outline: 'border border-line bg-card text-ink hover:bg-[#F4F5F8]',
        ghost: 'text-ink-muted hover:bg-[#F4F5F8] hover:text-ink',
        danger: 'bg-chip-danger-bg text-chip-danger-fg hover:bg-[#FDD5D2]',
        success: 'bg-chip-success-bg text-chip-success-fg hover:bg-[#DCF7E7]',
      },
      size: {
        sm: 'h-[34px] px-3 text-faint',
        md: 'h-[38px] px-4',
        lg: 'h-[44px] px-6 text-body-lg',
        icon: 'h-[34px] w-[34px] px-0',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />
  },
)
Button.displayName = 'Button'
