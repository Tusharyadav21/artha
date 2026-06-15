"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { type WorkflowDef } from "@/lib/workflows"
import { cn } from "@/lib/utils"

interface NavSectionProps {
  title: string
  items: WorkflowDef[]
  isCollapsed: boolean
  onNavigate?: () => void
}

export function NavSection({ title, items, isCollapsed, onNavigate }: NavSectionProps) {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <div className="px-2 pb-2">
      {!isCollapsed && (
        <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 select-none">
          {title}
        </p>
      )}
      <div className="flex flex-col gap-0.5">
        {items.map((item) => {
          const isActive = pathname.startsWith(item.href)
          const Icon = item.icon
          if (isCollapsed) {
            return (
              <Tooltip key={item.id}>
                <TooltipTrigger className="w-full">
                  <button
                    type="button"
                    onClick={() => { router.push(item.href); onNavigate?.() }}
                    className={cn(
                      "w-full flex items-center justify-center p-2 h-10 rounded-xl transition-all duration-200",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    )}
                  >
                    <Icon className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            )
          }
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => { router.push(item.href); onNavigate?.() }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-medium transition-all duration-200",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
