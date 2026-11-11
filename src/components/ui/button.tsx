import React from 'react'
import { cn } from '../../lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer'
    
    const variants = {
      default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90 bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900',
      destructive: 'bg-red-500 text-white shadow-sm hover:bg-red-600',
      outline: 'border border-slate-700 bg-transparent hover:bg-slate-800 hover:text-white',
      secondary: 'bg-slate-800 text-slate-100 shadow-sm hover:bg-slate-700',
      ghost: 'hover:bg-slate-800 hover:text-slate-100',
      link: 'text-primary underline-offset-4 hover:underline text-indigo-400',
    }

    const sizes = {
      default: 'h-9 px-4 py-2',
      sm: 'h-8 rounded-md px-3 text-xs',
      lg: 'h-10 rounded-md px-8',
      icon: 'h-9 w-9',
    }

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

