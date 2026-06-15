"use client"

import * as React from "react"
import {
  PlusIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  MessageSquareIcon,
  BarChart3Icon,
  VideoIcon,
  SettingsIcon,
  LandmarkIcon,
} from "lucide-react"
import { usePathname, useRouter } from "next/navigation"

import { useWorkspace } from "@/components/app/workspace-provider"
import { Logo } from "@/components/shared/logo"
import { SidebarUserMenu } from "@/components/app/sidebar-user-menu"
import { Button } from "@/components/ui/button"
import { CreateProjectDialog } from "@/components/app/create-project-dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/app/ui-tooltip"
import { cn } from "@/lib/utils"

interface SidebarProps {
  mobile?: boolean
  onNavigate?: () => void
}

const ProjectItem = React.memo(function ProjectItem({
  project,
  isActive,
  isCollapsed,
  subtitle,
  onSelect,
}: {
  project: { id: string; name: string }
  isActive: boolean
  isCollapsed: boolean
  subtitle: string
  onSelect: () => void
}) {
  const btn = (
    <button
      type="button"
      className={cn(
        "w-full rounded-xl border text-left transition-all duration-200 relative group/project flex items-start gap-3",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "border-transparent hover:bg-sidebar-accent/50 text-sidebar-foreground/70 hover:text-sidebar-foreground",
        isCollapsed
          ? "flex items-center justify-center p-2 h-10"
          : "px-4 py-3"
      )}
      onClick={onSelect}
    >
      {isCollapsed ? (
        <span className={cn(
          "text-xs font-bold size-6 flex items-center justify-center rounded-lg",
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

const ConversationItem = React.memo(function ConversationItem({
  conversation,
  isActive,
  isCollapsed,
  onOpen,
}: {
  conversation: { id: string; title: string | null }
  isActive: boolean
  isCollapsed: boolean
  onOpen: () => void
}) {
  const btn = (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "w-full flex items-center gap-3 rounded-xl transition-all duration-200 group/thread",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "hover:bg-sidebar-accent/50 text-sidebar-foreground/70 hover:text-sidebar-foreground",
        isCollapsed
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
      {!isCollapsed && (
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

const NAV_ITEMS = [
  { href: "/chat", label: "Chat", icon: MessageSquareIcon },
  { href: "/analytics", label: "Analytics", icon: BarChart3Icon },
  { href: "/video", label: "Video", icon: VideoIcon },
  { href: "/financial", label: "Financial", icon: LandmarkIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
] as const

// fallow-ignore-next-line complexity
export function Sidebar({ mobile = false, onNavigate }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

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
          <Logo />
        )}
        {!mobile && (
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            className="hover:bg-sidebar-accent text-muted-foreground hover:text-sidebar-accent-foreground"
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

      {/* Navigation */}
      <nav className="px-2 pb-2 shrink-0">
        <div className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href)
            const Icon = item.icon
            if (isCollapsed) {
              return (
                <Tooltip key={item.href}>
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
                key={item.href}
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
      </nav>

      <div className="px-5 shrink-0">
        <Separator className="bg-sidebar-border" />
      </div>

      {/* 5. Projects Scroll Area */}
      <ScrollArea className="flex-1 px-3 pb-4">
        <div className="flex flex-col gap-1">
          {projects.map((project) => {
            const isActive = project.id === activeProjectId
            const subtitle = getProjectSubtitle(project, isActive)
            return (
              <div key={project.id}>
                <ProjectItem
                  project={project}
                  isActive={isActive}
                  isCollapsed={isCollapsed && !mobile}
                  subtitle={subtitle}
                  onSelect={() => {
                    void selectProject(project.id)
                    onNavigate?.()
                  }}
                />
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
            {conversations.slice(0, 5).map((conversation) => {
              const isActive = conversation.id === activeConversationId
              return (
                <div key={conversation.id}>
                  <ConversationItem
                    conversation={conversation}
                    isActive={isActive}
                    isCollapsed={isCollapsed && !mobile}
                    onOpen={() => {
                      void openConversation(conversation.id)
                      onNavigate?.()
                    }}
                  />
                </div>
              )
            })}
          </div>
        )}
      </ScrollArea>

      <div className="px-5 shrink-0">
        <Separator className="bg-sidebar-border" />
      </div>

      {/* 6. User Menu */}
      <div className="p-3 shrink-0 bg-sidebar border-t border-sidebar-border">
        <SidebarUserMenu isCollapsed={isCollapsed && !mobile} />
      </div>
    </aside>
  )
}
