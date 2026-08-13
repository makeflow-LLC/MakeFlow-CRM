'use client'

import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '@/lib/utils'

export const Tabs = TabsPrimitive.Root

export function TabsList({ className, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn('inline-flex items-center gap-1 rounded-input border border-line bg-card p-1', className)}
      {...props}
    />
  )
}

export function TabsTrigger({ className, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'rounded-[6px] px-4 py-2 text-sm font-semibold text-ink-muted transition-all duration-150 hover:text-ink data-[state=active]:bg-accent data-[state=active]:text-white',
        className,
      )}
      {...props}
    />
  )
}

export const TabsContent = TabsPrimitive.Content
