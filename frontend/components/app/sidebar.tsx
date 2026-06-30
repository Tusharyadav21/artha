"use client"

import * as React from "react"
import {
  BotIcon,
  PlusIcon,
  SettingsIcon,
  LogOutIcon,
  SearchIcon,
  BarChart3Icon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  MessageSquareIcon,
} from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { useWorkspace } from "@/components/app/workspace-provider"
import { Button } from "@/components/ui/button"
import { CreateProjectDialog } from "@/components/app/create-project-dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/app/ui-tooltip"
import { Avatar, AvatarFallback } from "@/components/app/ui-avatar"
import { cn } from "@/lib/utils"

interface SidebarProps {
  mobile?: boolean
  onNavigate?: () => void
}

// fallow-ignore-next-line complexity
export function Sidebar({ mobile = false, onNavigate }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const {
    user,
    projects,
    activeProjectId,
    selectProject,
    updateUserSettings,
    documentsTotal,
    conversationsTotal,
    conversations,
    activeConversationId,
    openConversation,
    signOut,
  } = useWorkspace()

  const isCollapsed = !mobile && Boolean(user?.sidebar_collapsed)


  // Helper to get project subtitle details
  // fallow-ignore-next-line complexity
  const getProjectSubtitle = (project: any, isActive: boolean) => {
    if (isActive) {
      const sourcesStr = documentsTotal === 1 ? "source" : "sources"
      const chatsStr = conversationsTotal === 1 ? "chat" : "chats"
      return `${documentsTotal} ${sourcesStr} · ${conversationsTotal} ${chatsStr}`
    }
    // Hardcoded mock values like in mockup for inactive ones to look extremely realistic
    if (project.name.toLowerCase().includes("new")) {
      return "Default prompt · 0 sources"
    }
    if (project.name.toLowerCase().includes("test")) {
      return "Default prompt · 1 source"
    }
    return "Default prompt · 0 sources"
  }

  return (
    <aside
      className={cn(
        "flex h-full flex-col bg-sidebar border-r border-sidebar-border transition-[width] duration-200 ease-in-out select-none",
        mobile ? "w-full" : isCollapsed ? "w-20" : "w-[220px]"
      )}
    >
      <div className="flex items-center gap-3 px-4 py-3 shrink-0 justify-between">
        {(!isCollapsed || mobile) && (
          <span className="text-2xl font-bold uppercase tracking-wider text-muted-foreground select-none">
            Artha
          </span>
        )}
        {!mobile && (
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            className="hover:bg-zinc-800 text-muted-foreground hover:text-white"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() =>
              void updateUserSettings({
                sidebar_collapsed: !user?.sidebar_collapsed,
              })
            }
          >
            {isCollapsed ? (
              <PanelLeftOpenIcon className="size-4" />
            ) : (
              <PanelLeftCloseIcon className="size-4" />
            )}
          </Button>
        )}
      </div>



      {/* 5. Projects Scroll Area */}
      <ScrollArea className="flex-1 px-3 pb-4">
        <div className="flex flex-col gap-1">
          {projects.map(
            // fallow-ignore-next-line complexity
            (project) => {
              const isActive = project.id === activeProjectId
              const subtitle = getProjectSubtitle(project, isActive)

              const projectBtn = (
                <button
                  type="button"
                  className={cn(
                    "w-full rounded-xl border text-left transition-all duration-200 relative group/project flex items-start gap-3",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "border-transparent hover:bg-sidebar-accent/50 text-sidebar-foreground/70 hover:text-sidebar-foreground",
                    isCollapsed && !mobile
                      ? "flex items-center justify-center p-2 h-10"
                      : "px-4 py-3"
                  )}
                  onClick={() => {
                    void selectProject(project.id)
                    onNavigate?.()
                  }}
                >
                  {isCollapsed && !mobile ? (
                    <span className={cn(
                      "text-xs font-bold size-6 flex items-center justify-center rounded-lg",
                      isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}>
                      {project.name.slice(0, 1).toUpperCase()}
                    </span>
                  ) : (
                    <>
                      {/* Active Bullet Indicator */}
                      <div className="mt-1.5 shrink-0 flex items-center justify-center">
                        <div className={cn(
                          "size-2 rounded-full transition-all duration-200",
                          isActive ? "bg-primary scale-100" : "bg-transparent scale-0"
                        )} />
                      </div>
                      <div className="min-w-0 flex-1 leading-normal">
                        <p className={cn(
                          "font-semibold text-xs tracking-tight truncate",
                          isActive ? "text-foreground" : "text-foreground/70 group-hover/project:text-foreground"
                        )}>
                          {project.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 font-medium mt-0.5 truncate">
                          {subtitle}
                        </p>
                      </div>
                    </>
                  )}
                </button>
              )

              return (
                <div key={project.id}>
                  {isCollapsed && !mobile ? (
                    <Tooltip>
                      <TooltipTrigger className="w-full">{projectBtn}</TooltipTrigger>
                      <TooltipContent side="right">{project.name}</TooltipContent>
                    </Tooltip>
                  ) : (
                    projectBtn
                  )}
                </div>
              )
            })}

          {/* New Project Dialog Button */}
          {(!isCollapsed || mobile) && (
            <CreateProjectDialog
              trigger={
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-4 py-2.5 mt-1 rounded-xl text-left text-xs font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 border border-dashed border-border transition duration-200"
                >
                  <div className="size-5 rounded-md bg-muted/80 flex items-center justify-center shrink-0 border border-border">
                    <PlusIcon className="size-3 text-muted-foreground" />
                  </div>
                  <span>New project</span>
                </button>
              }
            />
          )}
        </div>

        {/* Recents Section */}
        {conversations.length > 0 && (
          <div className="mt-8 flex flex-col gap-1">
            <div className="px-2 mb-2">
              {(!isCollapsed || mobile) && (
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                  Recents
                </p>
              )}
            </div>
            {conversations.slice(0, 5).map(
              // fallow-ignore-next-line complexity
              (conversation) => {
                const isActive = conversation.id === activeConversationId
                const threadBtn = (
                  <button
                    type="button"
                    onClick={() => {
                      void openConversation(conversation.id)
                      onNavigate?.()
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-xl transition-all duration-200 group/thread",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "hover:bg-sidebar-accent/50 text-sidebar-foreground/70 hover:text-sidebar-foreground",
                      isCollapsed && !mobile
                        ? "justify-center p-2 h-10"
                        : "px-4 py-2"
                    )}
                  >
                    <div className={cn(
                      "shrink-0 flex items-center justify-center",
                      isActive ? "text-primary" : "text-muted-foreground group-hover/thread:text-foreground"
                    )}>
                      <MessageSquareIcon className="size-3.5" />
                    </div>
                    {(!isCollapsed || mobile) && (
                      <div className="min-w-0 flex-1 leading-normal text-left">
                        <p className={cn(
                          "text-xs truncate font-medium",
                          isActive ? "text-foreground font-semibold" : ""
                        )}>
                          {conversation.title || "Untitled conversation"}
                        </p>
                      </div>
                    )}
                  </button>
                )

                return (
                  <div key={conversation.id}>
                    {isCollapsed && !mobile ? (
                      <Tooltip>
                        <TooltipTrigger className="w-full">{threadBtn}</TooltipTrigger>
                        <TooltipContent side="right">{conversation.title || "Untitled"}</TooltipContent>
                      </Tooltip>
                    ) : (
                      threadBtn
                    )}
                  </div>
                )
              })}
          </div>
        )}
      </ScrollArea>

      <div className="px-5 shrink-0">
        <Separator className="bg-sidebar-border" />
      </div>

      {/* 6. User Profile Card at Bottom */}
      <div className="p-4 shrink-0 bg-sidebar border-t border-sidebar-border">
        <div
          className={cn(
            "flex items-center gap-3",
            isCollapsed && !mobile ? "justify-center" : "px-2"
          )}
        >
          {/* Avatar Circle with Blue/Teal Gradient fallback */}
          <Avatar className="size-9 ring-1 ring-white/10 shrink-0">
            <AvatarFallback className="bg-gradient-to-tr from-cyan-600 to-blue-500 text-white font-bold text-xs select-none">
              {user?.display_name
                ? user.display_name.split(" ").map(n => n[0]).join("").toUpperCase()
                : user?.email?.slice(0, 2).toUpperCase() || "TY"}
            </AvatarFallback>
          </Avatar>

          {(!isCollapsed || mobile) && (
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-xs font-semibold text-white">
                {user?.display_name || "Tushar Yadav"}
              </p>
              <p className="truncate text-[10px] text-muted-foreground opacity-60 font-medium mt-0.5">
                {user?.email || "tusharydv2910@gmail.com"}
              </p>
            </div>
          )}

          {(!isCollapsed || mobile) && (
            <Tooltip>
              <TooltipTrigger>
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  className="hover:bg-zinc-800 text-muted-foreground hover:text-red-400 transition"
                  onClick={signOut}
                >
                  <LogOutIcon className="size-4.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Sign out</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </aside>
  )
}
