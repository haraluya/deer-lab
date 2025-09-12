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
            // 基本定位和動畫
            "fixed left-1/2 top-1/2 z-50 grid -translate-x-1/2 -translate-y-1/2 gap-4 border-2 border-border bg-background shadow-lg duration-200",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
            "rounded-lg overflow-y-auto",
            // 響應式寬度 - 手機版更小
            "w-[calc(100vw-32px)] sm:w-[calc(100vw-64px)] md:w-auto",
            "max-w-[calc(100vw-32px)] sm:max-w-[480px] md:max-w-[600px] lg:max-w-[700px] xl:max-w-[800px] 2xl:max-w-[900px]",
            // 響應式高度
            "max-h-[calc(100vh-32px)] sm:max-h-[calc(100vh-64px)] md:max-h-[85vh]",
            // 內邊距
            "p-4 sm:p-5 md:p-6",
            className
          )}
          {...props}
        >
          {children}
          <DialogPrimitive.Close className="absolute right-2 top-2 sm:right-3 sm:top-3 md:right-4 md:top-4 z-10 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground p-1">
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
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
          "flex flex-col space-y-1.5 text-center sm:text-left pb-3 sm:pb-4 border-b border-border pr-8 sm:pr-12",
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
          "text-lg sm:text-xl md:text-2xl font-bold flex items-center gap-2 sm:gap-3 leading-tight break-words",
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
    