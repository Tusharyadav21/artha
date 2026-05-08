"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function Tabs({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="tabs" className={cn("flex flex-col gap-2", className)} {...props} />
}

function TabsList({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="tabs-list"
      className={cn("bg-muted text-muted-foreground inline-flex h-10 items-center rounded-lg p-1", className)}
      {...props}
    />
  )
}

interface TabsTriggerProps extends React.ComponentProps<"button"> {
  active?: boolean
}

function TabsTrigger({ active, className, ...props }: TabsTriggerProps) {
  return (
    <button
      data-slot="tabs-trigger"
      data-active={active}
      className={cn(
        "data-[active=true]:bg-background data-[active=true]:text-foreground rounded-md px-3 py-1.5 text-sm font-medium transition",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="tabs-content" className={cn("mt-2", className)} {...props} />
}

export { Tabs, TabsContent, TabsList, TabsTrigger }
