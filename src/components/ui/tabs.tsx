import React, { createContext, useContext, useState } from 'react'
import { cn } from '../../lib/utils'

interface TabsContextValue {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = createContext<TabsContextValue>({
  value: '',
  onValueChange: () => {},
})

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
}

export const Tabs: React.FC<TabsProps> = ({
  defaultValue = '',
  value: controlledValue,
  onValueChange,
  className,
  children,
  ...props
}) => {
  const [internalValue, setInternalValue] = useState(defaultValue)
  const currentVal = controlledValue !== undefined ? controlledValue : internalValue

  const handleValueChange = (val: string) => {
    if (controlledValue === undefined) setInternalValue(val)
    onValueChange?.(val)
  }

  return (
    <TabsContext.Provider value={{ value: currentVal, onValueChange: handleValueChange }}>
      <div className={cn('flex flex-col', className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

export const TabsList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'inline-flex h-9 items-center justify-center rounded-lg bg-slate-900/80 p-1 text-slate-400 border border-slate-800',
        className
      )}
      {...props}
    />
  )
)
TabsList.displayName = 'TabsList'

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
}

export const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, ...props }, ref) => {
    const { value: activeVal, onValueChange } = useContext(TabsContext)
    const isActive = activeVal === value

    return (
      <button
        ref={ref}
        type="button"
        onClick={() => onValueChange(value)}
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium ring-offset-background transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
          isActive
            ? 'bg-slate-950 text-white shadow font-semibold'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50',
          className
        )}
        {...props}
      />
    )
  }
)
TabsTrigger.displayName = 'TabsTrigger'

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

export const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, children, ...props }, ref) => {
    const { value: activeVal } = useContext(TabsContext)
    if (activeVal !== value) return null

    return (
      <div
        ref={ref}
        className={cn('mt-2 ring-offset-background focus-visible:outline-none animate-in fade-in-50 duration-100', className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
TabsContent.displayName = 'TabsContent'

