"use client"

import * as React from "react"
import { PlusIcon, PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react"
import { usePathname } from "next/navigation"

import { useAuth } from "@/hooks/use-auth"
import { useProjects } from "@/hooks/use-projects"
import { useDocuments } from "@/hooks/use-documents"
import { useChat } from "@/hooks/use-chat"
import { Logo } from "@/components/shared/logo"
import { SidebarUserMenu } from "@/components/app/sidebar-user-menu"
import { Button } from "@/components/ui/button"
import { CreateProjectDialog } from "@/components/app/create-project-dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { ProjectItem } from "@/components/sidebar/project-item"
import { ConversationItem } from "@/components/sidebar/conversation-item"
import { NavSection } from "@/components/sidebar/nav-section"
import { WORKFLOWS_BY_SECTION } from "@/lib/workflows"
import { cn } from "@/lib/utils"

interface SidebarProps {
  mobile?: boolean
  onNavigate?: () => void
}

export function Sidebar({ mobile = false, onNavigate }: SidebarProps) {
  const { user, updateUserSettings } = useAuth()
  const { projects, activeProjectId, selectProject } = useProjects()
  const { documentsTotal } = useDocuments()
  const { conversationsTotal, conversations, activeConversationId, openConversation } = useChat()

  const isCollapsed = !mobile && Boolean(user?.sidebar_collapsed)

  const getProjectSubtitle = (project: { id: string; name: string }, isActive: boolean) => {
    if (isActive) {
      const sourcesStr = documentsTotal === 1 ? "source" : "sources"
      const chatsStr = conversationsTotal === 1 ? "chat" : "chats"
      return `${documentsTotal} ${sourcesStr} · ${conversationsTotal} ${chatsStr}`
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
        {(!isCollapsed || mobile) && <Logo />}
        {!mobile && (
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            className="hover:bg-sidebar-accent text-muted-foreground hover:text-sidebar-accent-foreground"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() =>
              void updateUserSettings({ sidebar_collapsed: !user?.sidebar_collapsed })
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

      {/* Navigation sections from workflow registry */}
      {WORKFLOWS_BY_SECTION.workspace && (
        <NavSection
          title="Workspace"
          items={WORKFLOWS_BY_SECTION.workspace}
          isCollapsed={isCollapsed && !mobile}
          onNavigate={onNavigate}
        />
      )}

      {WORKFLOWS_BY_SECTION.tools && (
        <>
          <div className="px-5 shrink-0">
            <Separator className="bg-sidebar-border" />
          </div>
          <NavSection
            title="Tools"
            items={WORKFLOWS_BY_SECTION.tools}
            isCollapsed={isCollapsed && !mobile}
            onNavigate={onNavigate}
          />
        </>
      )}

      {WORKFLOWS_BY_SECTION.settings && (
        <>
          <div className="px-5 shrink-0">
            <Separator className="bg-sidebar-border" />
          </div>
          <NavSection
            title="Settings"
            items={WORKFLOWS_BY_SECTION.settings}
            isCollapsed={isCollapsed && !mobile}
            onNavigate={onNavigate}
          />
        </>
      )}

      {/* Projects scroll area */}
      <div className="px-5 shrink-0">
        <Separator className="bg-sidebar-border" />
      </div>

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

      <div className="p-3 shrink-0 bg-sidebar border-t border-sidebar-border">
        <SidebarUserMenu isCollapsed={isCollapsed && !mobile} />
      </div>
    </aside>
  )
}
