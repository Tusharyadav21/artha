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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/app/ui-tooltip"
import { Avatar, AvatarFallback } from "@/components/app/ui-avatar"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { stagger, fadeIn, fadeUp } from "@/lib/motion"

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
        "flex h-full flex-col bg-sidebar/85 backdrop-blur transition-[width] duration-200 ease-in-out border-r border-sidebar-border",
        mobile ? "w-full" : isCollapsed ? "w-20" : "w-80"
      )}
    >
      <div className="flex items-center gap-3 px-4 py-4">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <BotIcon data-icon="inline-start" />
        </div>
        {!isCollapsed || mobile ? (
          <div className="min-w-0 flex-1">
            <p className="font-medium">Agentic RAG</p>
            <p className="truncate text-xs text-muted-foreground">
              Premium AI Workspace
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
              variant="ghost"
              className={cn(
                "w-full justify-start gap-2 border border-dashed border-border/50 hover:border-primary/50",
                isCollapsed && !mobile ? "px-0 justify-center" : "px-3"
              )}
            >
              <FolderPlusIcon className="h-4 w-4" />
              {(!isCollapsed || mobile) && <span>New Project</span>}
            </Button>
          }
        />
      </div>

      <motion.div 
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-1 px-3 py-4"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = pathname.startsWith(item.href)

          const button = (
            <Button
              type="button"
              variant="ghost"
              className={cn(
                "w-full justify-start relative",
                isCollapsed && !mobile ? "px-0 justify-center" : "px-3",
                isActive && "bg-primary/10 text-primary"
              )}
              onClick={() => {
                router.push(item.href)
                onNavigate?.()
              }}
            >
              <Icon data-icon="inline-start" className={cn(isActive && "text-primary")} />
              {(!isCollapsed || mobile) && <span className="flex-1">{item.label}</span>}
              {isActive && !isCollapsed && (
                <motion.div 
                  layoutId="sidebar-active-indicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 bg-primary rounded-full"
                />
              )}
            </Button>
          )

          return (
            <motion.div key={item.href} variants={fadeUp}>
              {isCollapsed && !mobile ? (
                <Tooltip>
                  <TooltipTrigger>
                    {button}
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              ) : (
                button
              )}
            </motion.div>
          )
        })}
      </motion.div>

      <Separator />

      <div className="px-4 py-3">
        {!isCollapsed ? (
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Projects
          </p>
        ) : null}
      </div>

      <ScrollArea className="flex-1 px-3 pb-4">
        <motion.div 
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-2"
        >
          {projects.map((project) => {
            const isActive = project.id === activeProjectId
            const btn = (
              <button
                type="button"
                className={cn(
                  "rounded-xl border px-3 py-3 text-left transition relative overflow-hidden group/project",
                  isActive
                    ? "border-primary/25 bg-primary/10"
                    : "border-transparent hover:border-border hover:bg-background/70",
                  isCollapsed && !mobile
                    ? "flex items-center justify-center px-2 h-10"
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
                    <span className="font-medium text-sm truncate max-w-[calc(100%-1rem)]">
                      {project.name}
                    </span>
                    <span className="line-clamp-1 text-xs text-muted-foreground opacity-70 group-hover/project:opacity-100 transition-opacity">
                      {project.system_prompt || "Default assistant prompt"}
                    </span>
                  </>
                )}
              </button>
            )

            return (
              <motion.div key={project.id} variants={fadeIn}>
                {isCollapsed && !mobile ? (
                  <Tooltip>
                    <TooltipTrigger>{btn}</TooltipTrigger>
                    <TooltipContent side="right">{project.name}</TooltipContent>
                  </Tooltip>
                ) : (
                  btn
                )}
              </motion.div>
            )
          })}
          {!projects.length ? (
            <div className="rounded-xl border border-dashed px-3 py-4 text-xs text-muted-foreground text-center">
              No projects yet.
            </div>
          ) : null}
        </motion.div>
      </ScrollArea>

      <Separator />

      <div className="px-4 py-4 border-t border-border/50">
        <div className={cn(
          "flex items-center gap-3",
          isCollapsed && !mobile && "justify-center"
        )}>
          <Avatar size={isCollapsed && !mobile ? "sm" : "default"}>
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {user?.email?.slice(0, 1).toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed || mobile ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {user?.display_name || "Workspace owner"}
              </p>
              <p className="truncate text-xs text-muted-foreground opacity-70">
                {user?.email}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  )
}
