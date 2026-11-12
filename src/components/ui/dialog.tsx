import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

const DialogContext = React.createContext<{
  open: boolean
  onOpenChange: (open: boolean) => void
}>({
  open: false,
  onOpenChange: () => {},
})

export const Dialog: React.FC<DialogProps> = ({ open = false, onOpenChange = () => {}, children }) => {
  return <DialogContext.Provider value={{ open, onOpenChange }}>{children}</DialogContext.Provider>
}

export const DialogPortal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { open } = React.useContext(DialogContext)
  const [mounted, setMounted] = React.useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!mounted || !open) return null

  // Teleport langsung ke document.body agar tidak terjebak dalam Card / CSS Transform / Container
  return createPortal(children, document.body)
}

export const DialogOverlay = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'fixed inset-0 z-50 bg-black/80 backdrop-blur-sm animate-in fade-in-0 duration-150',
        className
      )}
      {...props}
    />
  )
})
DialogOverlay.displayName = 'DialogOverlay'

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  showCloseButton?: boolean
}

export const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, showCloseButton = true, ...props }, ref) => {
    const { onOpenChange } = React.useContext(DialogContext)

    // Lock scroll pada body saat modal terbuka
    useEffect(() => {
      const originalStyle = window.getComputedStyle(document.body).overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalStyle
      }
    }, [])

    return (
      <DialogPortal>
        <DialogOverlay onClick={() => onOpenChange(false)} />
        <div
          ref={ref}
          className={cn(
            'fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%]',
            'w-full max-w-lg border border-slate-800 bg-slate-900 text-slate-100 shadow-2xl rounded-2xl',
            'duration-200 animate-in fade-in-0 zoom-in-95',
            className
          )}
          {...props}
        >
          {children}
          {showCloseButton && (
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="absolute right-4 top-4 rounded-sm text-slate-400 opacity-70 transition-opacity hover:opacity-100 hover:text-white focus:outline-none cursor-pointer"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          )}
        </div>
      </DialogPortal>
    )
  }
)
DialogContent.displayName = 'DialogContent'

export const DialogHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => (
  <div className={cn('flex flex-col space-y-1.5 p-6 pb-4', className)} {...props} />
)
DialogHeader.displayName = 'DialogHeader'

export const DialogFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => (
  <div
    className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 p-6 pt-4 border-t border-slate-800', className)}
    {...props}
  />
)
DialogFooter.displayName = 'DialogFooter'

export const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight text-white', className)}
    {...props}
  />
))
DialogTitle.displayName = 'DialogTitle'

export const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-slate-400', className)} {...props} />
))
DialogDescription.displayName = 'DialogDescription'

