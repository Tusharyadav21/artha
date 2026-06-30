"use client"

import { usePathname, useRouter } from "next/navigation"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { type WorkflowDef } from "@/lib/workflows"
import { cn } from "@/lib/utils"
import { Button } from "../ui/button"

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
      {!isCollapsed && title.toUpperCase() !== "WORKSPACE" && (
        <p className="px-2 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground/60 select-none">
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
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => { router.push(item.href); onNavigate?.() }}
                    className={cn(
                      "w-full flex items-center justify-center p-2 h-10 rounded-xl transition-all duration-200",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    )}
                  >
                    <Icon className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            )
          }
          return (
            <Button
              variant="ghost"
              key={item.id}
              type="button"
              onClick={() => { router.push(item.href); onNavigate?.() }}
              className={cn(
                "w-full h-auto flex items-center justify-start gap-3 px-2 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span>{item.label}</span>
            </Button>
          )
        })}
      </div>
    </div>
  )
}
