"use client"

import { PlusIcon, PanelLeftCloseIcon, PanelLeftOpenIcon, ChevronDownIcon } from "lucide-react"

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
import { useState } from "react"

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

  const [expandedProjects, setExpandedProjects] = useState<string[]>([])
  const [isProjectsSectionExpanded, setIsProjectsSectionExpanded] = useState(true)

  const toggleProjectExpand = (projectId: string) => {
    setExpandedProjects((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId]
    )
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
          <NavSection
            title="Settings"
            items={WORKFLOWS_BY_SECTION.settings}
            isCollapsed={isCollapsed && !mobile}
            onNavigate={onNavigate}
          />
        </>
      )}

      <ScrollArea className="flex-1 px-2 pb-4">
        <div className="flex flex-col gap-1">
          <div className="pb-2">
            {!isCollapsed && (
              <Button
                variant="ghost"
                onClick={() => setIsProjectsSectionExpanded(!isProjectsSectionExpanded)}
                className="w-full h-auto flex items-center justify-between px-2 pb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground/60 select-none hover:text-foreground transition-colors group"
              >
                <span>Projects</span>
                <ChevronDownIcon className={cn("size-3 transition-transform duration-200", !isProjectsSectionExpanded && "-rotate-90")} />
              </Button>
            )}
            
            <div className={cn("flex flex-col gap-0.5 mt-0.5", !isProjectsSectionExpanded && !isCollapsed && "hidden")}>
              {projects.map((project) => {
            const isActive = project.id === activeProjectId
            const subtitle = getProjectSubtitle(project, isActive)
            const isExpanded = expandedProjects.includes(project.id)
            const projectChats = conversations.filter(c => c.project_id === project.id)
            return (
              <div key={project.id} className="flex flex-col gap-0.5">
                <ProjectItem
                  project={project}
                  isActive={isActive}
                  isCollapsed={isCollapsed && !mobile}
                  isExpanded={isExpanded}
                  subtitle={subtitle}
                  hasChildren={projectChats.length > 0}
                  onToggle={() => toggleProjectExpand(project.id)}
                  onSelect={() => {
                    void selectProject(project.id)
                    if (!isExpanded) toggleProjectExpand(project.id)
                    onNavigate?.()
                  }}
                />

                {/* Nested Chats */}
                {isExpanded && (!isCollapsed || mobile) && projectChats.length > 0 && (
                  <div className="flex flex-col gap-0.5 pl-6 mt-0.5 border-l border-sidebar-border ml-3">
                    {projectChats.map((chat) => (
                      <ConversationItem
                        key={chat.id}
                        conversation={chat}
                        isActive={chat.id === activeConversationId}
                        isCollapsed={false}
                        onOpen={() => {
                          void openConversation(chat.id)
                          onNavigate?.()
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {(!isCollapsed || mobile) && (
            <CreateProjectDialog
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full h-auto flex items-center gap-3 px-2 py-2 mt-1 rounded-xl text-left text-xs font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 border border-dashed border-border transition duration-200"
                >
                  <div className="size-5 rounded-md bg-muted/80 flex items-center justify-center shrink-0 border border-border">
                    <PlusIcon className="size-3 text-muted-foreground" />
                  </div>
                  <span>New project</span>
                </Button>
              }
            />
          )}
          </div>
        </div>
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
