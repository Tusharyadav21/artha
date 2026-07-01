"use client"

import { memo } from "react"
import { MessageSquareIcon } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { Button } from "../ui/button"

interface ConversationItemProps {
  conversation: { id: string; title: string | null }
  isActive: boolean
  isCollapsed: boolean
  onOpen: () => void
}

export const ConversationItem = memo(function ConversationItem({
  conversation,
  isActive,
  isCollapsed,
  onOpen,
}: ConversationItemProps) {
  const btn = (
    <Button
      type="button"
      variant="ghost"
      onClick={onOpen}
      className={cn(
        "w-full h-auto flex items-center gap-3 rounded-xl transition-all duration-200 group/thread",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "hover:bg-sidebar-accent/50 text-sidebar-foreground/70 hover:text-sidebar-foreground",
        isCollapsed
          ? "justify-center p-2 h-10"
          : "px-2 py-2"
      )}
    >
      <div className={cn(
        "shrink-0 flex items-center justify-center",
        isActive ? "text-primary" : "text-muted-foreground group-hover/thread:text-foreground"
      )}>
        <MessageSquareIcon className="size-3.5" />
      </div>
      {!isCollapsed && (
        <div className="min-w-0 flex-1 leading-normal text-left">
          <p className={cn(
            "text-sm truncate font-medium",
            isActive ? "text-foreground font-semibold" : ""
          )}>
            {conversation.title || "Untitled conversation"}
          </p>
        </div>
      )}
    </Button>
  )

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger className="w-full">{btn}</TooltipTrigger>
        <TooltipContent side="right">{conversation.title || "Untitled"}</TooltipContent>
      </Tooltip>
    )
  }

  return btn
})
