    "use client"

    import * as React from "react"
    import * as DialogPrimitive from "@radix-ui/react-dialog"
    import { X } from "lucide-react"

    import { cn } from "@/lib/utils"

    const Dialog = DialogPrimitive.Root

    const DialogTrigger = DialogPrimitive.Trigger

    const DialogPortal = DialogPrimitive.Portal

    const DialogClose = DialogPrimitive.Close

    const DialogOverlay = React.forwardRef<
      React.ElementRef<typeof DialogPrimitive.Overlay>,
      React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
    >(({ className, ...props }, ref) => (
      <DialogPrimitive.Overlay
        ref={ref}
        className={cn(
          "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          className
        )}
        {...props}
      />
    ))
    DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

    const DialogContent = React.forwardRef<
      React.ElementRef<typeof DialogPrimitive.Content>,
      React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
    >(({ className, children, ...props }, ref) => (
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          ref={ref}
          className={cn(
            "fixed left-[50%] top-[50%] z-50 grid w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] gap-4 border-2 border-border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-lg max-h-[90vh] overflow-y-auto",
            // 手機版優化
            "p-4 sm:p-6 mx-2 sm:mx-0",
            // 在手機上使用全寬，在平板和桌面使用最大寬度
            "max-w-[calc(100vw-1rem)] sm:max-w-lg md:max-w-xl lg:max-w-2xl",
            // 手機版高度優化
            "max-h-[95vh] sm:max-h-[90vh]",
            className
          )}
          {...props}
        >
          {children}
          <DialogPrimitive.Close className="absolute right-2 top-2 sm:right-4 sm:top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-5 w-5 sm:h-4 sm:w-4" />
            <span className="sr-only">關閉</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPortal>
    ))
    DialogContent.displayName = DialogPrimitive.Content.displayName

    const DialogHeader = ({
      className,
      ...props
    }: React.HTMLAttributes<HTMLDivElement>) => (
      <div
        className={cn(
          "flex flex-col space-y-1.5 text-center sm:text-left pb-4 border-b border-border",
          className
        )}
        {...props}
      />
    )
    DialogHeader.displayName = "DialogHeader"

    const DialogFooter = ({
      className,
      ...props
    }: React.HTMLAttributes<HTMLDivElement>) => (
      <div
        className={cn(
          "flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-0 sm:space-x-2 pt-4 border-t border-border",
          // 手機版按鈕間距
          "[&>*]:w-full sm:[&>*]:w-auto",
          className
        )}
        {...props}
      />
    )
    DialogFooter.displayName = "DialogFooter"

    const DialogTitle = React.forwardRef<
      React.ElementRef<typeof DialogPrimitive.Title>,
      React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
    >(({ className, ...props }, ref) => (
      <DialogPrimitive.Title
        ref={ref}
        className={cn(
          "text-xl sm:text-2xl font-bold flex items-center gap-2 sm:gap-3 leading-tight",
          className
        )}
        {...props}
      />
    ))
    DialogTitle.displayName = DialogPrimitive.Title.displayName

    const DialogDescription = React.forwardRef<
      React.ElementRef<typeof DialogPrimitive.Description>,
      React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
    >(({ className, ...props }, ref) => (
      <DialogPrimitive.Description
        ref={ref}
        className={cn("text-sm text-muted-foreground", className)}
        {...props}
      />
    ))
    DialogDescription.displayName = DialogPrimitive.Description.displayName

    export {
      Dialog,
      DialogPortal,
      DialogOverlay,
      DialogClose,
      DialogTrigger,
      DialogContent,
      DialogHeader,
      DialogFooter,
      DialogTitle,
      DialogDescription,
    }
    