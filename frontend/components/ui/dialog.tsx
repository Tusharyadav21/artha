"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function Dialog({ children, open }: React.PropsWithChildren<{ open?: boolean }>) {
  if (!open) {
    return null
  }
  return <>{children}</>
}

function DialogContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div data-slot="dialog-content" className={cn("bg-card w-full max-w-lg rounded-xl border p-6 shadow-lg", className)} {...props} />
    </div>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-header" className={cn("flex flex-col gap-1.5", className)} {...props} />
}

function DialogTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return <h2 data-slot="dialog-title" className={cn("text-lg font-semibold", className)} {...props} />
}

export { Dialog, DialogContent, DialogHeader, DialogTitle }
