"use client"

import * as React from "react"
import {
  BotIcon,
  FolderPlusIcon,
  LibraryIcon,
  VideoIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  SettingsIcon,
} from "lucide-react"
import { usePathname, useRouter } from "next/navigation"

import { useWorkspace } from "@/components/app/workspace-provider"
import { Button } from "@/components/ui/button"
import { CreateProjectDialog } from "@/components/app/create-project-dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  {
    href: "/chat",
    label: "Chat",
    description: "Conversations and sources",
    icon: BotIcon,
  },
  {
    href: "/video",
    label: "Video Creator",
    description: "Create Videos",
    icon: VideoIcon,
  },
  {
    href: "/library",
    label: "Library",
    description: "Documents and project prompt",
    icon: LibraryIcon,
  },
  {
    href: "/settings",
    label: "Settings",
    description: "Profile and preferences",
    icon: SettingsIcon,
  },
] as const

interface SidebarProps {
  mobile?: boolean
  onNavigate?: () => void
}

export function Sidebar({
  mobile = false,
  onNavigate,
}: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const {
    user,
    projects,
    activeProjectId,
    selectProject,
    updateUserSettings,
  } = useWorkspace()



  const isCollapsed = !mobile && Boolean(user?.sidebar_collapsed)

  return (
    <aside
      className={cn(
        "flex h-full flex-col bg-sidebar/85 backdrop-blur",
        mobile ? "w-full" : isCollapsed ? "w-20" : "w-80"
      )}
    >
      <div className="flex items-center gap-3 px-4 py-4">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <BotIcon data-icon="inline-start" />
        </div>
        {!isCollapsed ? (
          <div className="min-w-0 flex-1">
            <p className="font-medium">Agentic RAG</p>
            <p className="truncate text-xs text-muted-foreground">
              Route-based workspace
            </p>
          </div>
        ) : null}
        {!mobile ? (
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() =>
              void updateUserSettings({
                sidebar_collapsed: !user?.sidebar_collapsed,
              })
            }
          >
            {isCollapsed ? (
              <PanelLeftOpenIcon data-icon="inline-start" />
            ) : (
              <PanelLeftCloseIcon data-icon="inline-start" />
            )}
          </Button>
        ) : null}
      </div>

      <div className="px-4">
        <CreateProjectDialog
          trigger={
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start gap-2 border-dashed",
                isCollapsed && !mobile ? "px-0 justify-center" : "px-3"
              )}
            >
              <FolderPlusIcon className="h-4 w-4" />
              {(!isCollapsed || mobile) && <span>New Project</span>}
            </Button>
          }
        />
      </div>

      <div className="flex flex-col gap-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = pathname.startsWith(item.href)

          return (
            <Button
              key={item.href}
              type="button"
              variant={isActive ? "secondary" : "ghost"}
              className={cn(
                "justify-start",
                isCollapsed && !mobile ? "px-0" : "px-3"
              )}
              onClick={() => {
                router.push(item.href)
                onNavigate?.()
              }}
            >
              <Icon data-icon="inline-start" />
              {!isCollapsed ? item.label : null}
            </Button>
          )
        })}
      </div>

      <Separator />

      <div className="px-4 py-3">
        {!isCollapsed ? (
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Projects
          </p>
        ) : null}
      </div>

      <ScrollArea className="flex-1 px-3 pb-4">
        <div className="flex flex-col gap-2">
          {projects.map((project) => (
            <button
              key={project.id}
              type="button"
              className={cn(
                "rounded-xl border px-3 py-3 text-left transition",
                project.id === activeProjectId
                  ? "border-primary/25 bg-primary/10"
                  : "border-transparent hover:border-border hover:bg-background/70",
                isCollapsed && !mobile
                  ? "flex items-center justify-center px-2"
                  : "flex flex-col gap-1"
              )}
              onClick={() => {
                void selectProject(project.id)
                onNavigate?.()
              }}
            >
              {isCollapsed && !mobile ? (
                <span className="text-sm font-semibold">
                  {project.name.slice(0, 1).toUpperCase()}
                </span>
              ) : (
                <>
                  <span className="font-medium">{project.name}</span>
                  <span className="line-clamp-2 text-xs text-muted-foreground">
                    {project.system_prompt || "Using the default agent prompt."}
                  </span>
                </>
              )}
            </button>
          ))}
          {!projects.length ? (
            <div className="rounded-xl border border-dashed px-3 py-4 text-sm text-muted-foreground">
              Create your first project to start using the workspace.
            </div>
          ) : null}
        </div>
      </ScrollArea>

      <Separator />

      <div className="px-4 py-4">
        {!isCollapsed ? (
          <>
            <p className="truncate text-sm font-medium">
              {user?.display_name || "Workspace owner"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {user?.email}
            </p>
          </>
        ) : (
          <div className="flex items-center justify-center rounded-full border bg-background/60 py-2 text-xs font-medium">
            {user?.email?.slice(0, 1).toUpperCase() || "?"}
          </div>
        )}
      </div>
    </aside>
  )
}
