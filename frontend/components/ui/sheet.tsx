"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function Sheet({ children, open }: React.PropsWithChildren<{ open?: boolean }>) {
  if (!open) {
    return null
  }
  return <>{children}</>
}

function SheetContent({ className, ...props }: React.ComponentProps<"aside">) {
  return (
    <aside
      data-slot="sheet-content"
      className={cn("bg-background fixed inset-y-0 left-0 w-80 border-r p-4 shadow-lg", className)}
      {...props}
    />
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sheet-header" className={cn("flex flex-col gap-1.5", className)} {...props} />
}

function SheetTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return <h2 data-slot="sheet-title" className={cn("text-lg font-semibold", className)} {...props} />
}

export { Sheet, SheetContent, SheetHeader, SheetTitle }
