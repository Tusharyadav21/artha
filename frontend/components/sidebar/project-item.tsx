"use client"

import { memo } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { ChevronRightIcon } from "lucide-react"
import { Button } from "../ui/button"

interface ProjectItemProps {
  project: { id: string; name: string }
  isActive: boolean
  isCollapsed: boolean
  subtitle: string
  isExpanded?: boolean
  hasChildren?: boolean
  onToggle?: () => void
  onSelect: () => void
}

export const ProjectItem = memo(function ProjectItem({
  project,
  isActive,
  isCollapsed,
  subtitle,
  isExpanded,
  hasChildren,
  onToggle,
  onSelect,
}: ProjectItemProps) {
  const btn = (
    <Button
      type="button"
      variant="ghost"
      className={cn(
        "w-full h-auto rounded-xl border text-left transition-all duration-200 relative group/project flex items-start gap-3",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "border-transparent hover:bg-sidebar-accent/50 text-sidebar-foreground/70 hover:text-sidebar-foreground",
        isCollapsed
          ? "flex items-center justify-center p-2 h-10"
          : "px-2 py-2"
      )}
      onClick={onSelect}
    >
      {isCollapsed ? (
        <span className={cn(
          "text-sm font-bold size-6 flex items-center justify-center rounded-lg",
          isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        )}>
          {project.name.slice(0, 1).toUpperCase()}
        </span>
      ) : (
        <>
          <div className="mt-1.5 shrink-0 flex items-center justify-center">
            <div className={cn(
              "size-2 rounded-full transition-all duration-200",
              isActive ? "bg-primary scale-100" : "bg-transparent scale-0"
            )} />
          </div>
          <div className="min-w-0 flex-1 leading-normal">
            <p className={cn(
              "font-semibold text-sm tracking-tight truncate",
              isActive ? "text-foreground" : "text-foreground/70 group-hover/project:text-foreground"
            )}>
              {project.name}
            </p>
            <p className="text-xs text-muted-foreground/60 font-medium mt-0.5 truncate">
              {subtitle}
            </p>
          </div>
          {hasChildren && onToggle && (
            <div
              className="shrink-0 p-1 rounded-md hover:bg-muted/80 text-muted-foreground"
              onClick={(e) => {
                e.stopPropagation()
                onToggle()
              }}
            >
              <ChevronRightIcon className={cn("size-3.5 transition-transform duration-200", isExpanded && "rotate-90")} />
            </div>
          )}
        </>
      )}
    </Button>
  )

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger className="w-full">{btn}</TooltipTrigger>
        <TooltipContent side="right">{project.name}</TooltipContent>
      </Tooltip>
    )
  }

  return btn
})
