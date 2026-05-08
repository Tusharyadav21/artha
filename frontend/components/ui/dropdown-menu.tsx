"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function DropdownMenu({ children }: React.PropsWithChildren) {
  return <div data-slot="dropdown-menu" className="relative inline-block">{children}</div>
}

function DropdownMenuTrigger({ className, ...props }: React.ComponentProps<"button">) {
  return <button data-slot="dropdown-menu-trigger" className={cn(className)} {...props} />
}

function DropdownMenuContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dropdown-menu-content"
      className={cn("bg-popover text-popover-foreground absolute right-0 mt-2 min-w-40 rounded-md border p-1 shadow-md", className)}
      {...props}
    />
  )
}

function DropdownMenuItem({ className, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      data-slot="dropdown-menu-item"
      className={cn("hover:bg-accent flex w-full rounded-sm px-2 py-1.5 text-left text-sm", className)}
      {...props}
    />
  )
}

export { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger }
