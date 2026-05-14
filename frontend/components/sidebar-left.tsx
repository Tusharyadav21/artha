"use client"

import * as React from "react"
import { FolderPlusIcon, LibraryIcon, LogOutIcon, VideoIcon } from "lucide-react"
import { toast } from "sonner"

import { type Project, type User } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ChangePasswordDialog } from "@/components/change-password-dialog"

interface SidebarLeftProps {
  user: User
  logout: () => void
  projects: Project[]
  activeProjectId: string | null
  setActiveProjectId: (id: string | null) => void
  setSystemPrompt: (prompt: string) => void
  setMessages: (messages: any[]) => void
  setSources: (sources: any[]) => void
  setSelectedDocumentIds: (ids: string[]) => void
  setFeedbackByMessageId: (fb: any) => void
  refreshProjectData: (id: string) => Promise<void>
  projectName: string
  setProjectName: (name: string) => void
  createProject: (e: React.FormEvent<HTMLFormElement>) => void
  isLoading: boolean
  isMobileProjectsOpen: boolean
  setIsMobileProjectsOpen: (open: boolean) => void
  changePassword: (payload: { current_password: string; new_password: string }) => Promise<boolean>
}

export function SidebarLeft({
  user,
  logout,
  projects,
  activeProjectId,
  setActiveProjectId,
  setSystemPrompt,
  setMessages,
  setSources,
  setSelectedDocumentIds,
  setFeedbackByMessageId,
  refreshProjectData,
  projectName,
  setProjectName,
  createProject,
  isLoading,
  isMobileProjectsOpen,
  setIsMobileProjectsOpen,
  changePassword,
}: SidebarLeftProps) {
  const handleProjectClick = (project: Project, isMobile = false) => {
    React.startTransition(() => {
      setActiveProjectId(project.id)
      setSystemPrompt(project.system_prompt ?? "")
      setMessages([])
      setSources([])
      setSelectedDocumentIds([])
      setFeedbackByMessageId({})
      if (isMobile) {
        setIsMobileProjectsOpen(false)
      }
    })
    void refreshProjectData(project.id).catch((caught) => {
      toast.error(caught instanceof Error ? caught.message : "Could not load project")
    })
  }

  const renderContent = (isMobile = false) => (
    <>
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">Signed in as</p>
          <p className="truncate text-sm font-medium">{user.email}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <ChangePasswordDialog changePassword={changePassword} />
          <Button size="icon-sm" variant="ghost" onClick={logout} aria-label="Log out">
            <LogOutIcon className={isMobile ? "" : "data-icon=inline-start"} />
          </Button>
        </div>
      </div>

      <form className="flex gap-2" onSubmit={createProject}>
        <Input
          value={projectName}
          onChange={(event) => setProjectName(event.target.value)}
          placeholder="New project"
        />
        <Button size="icon" type="submit" aria-label="Create project">
          <FolderPlusIcon className={isMobile ? "" : "data-icon=inline-start"} />
        </Button>
      </form>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-2">
          <div className="my-2 border-t border-border" />

          {projects.map((project) => (
            <button
              key={project.id}
              className={`rounded-lg border p-3 text-left text-sm transition ${project.id === activeProjectId
                  ? "bg-card shadow-sm border-primary/30"
                  : "hover:bg-muted"
                }`}
              onClick={() => handleProjectClick(project, isMobile)}
            >
              <span className="flex items-center gap-2 font-medium">
                <LibraryIcon className={isMobile ? "h-4 w-4" : "data-icon=inline-start"} />
                {project.name}
              </span>
            </button>
          ))}
          {!projects.length && !isLoading ? (
            <p className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">
              Create your first project to start.
            </p>
          ) : null}
          {isLoading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : null}
        </div>
      </ScrollArea>
    </>
  )

  return (
    <>
      {/* Desktop Static Left Sidebar */}
      <aside className="hidden lg:flex flex-col gap-5 border-r border-border bg-sidebar/70 p-4">
        {renderContent(false)}
      </aside>

      {/* Mobile Projects Sheet */}
      {isMobileProjectsOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/40" onClick={() => setIsMobileProjectsOpen(false)} />
          <Sheet open={isMobileProjectsOpen}>
            <SheetContent className="w-80 h-full flex flex-col gap-5 border-r border-border bg-background p-4 fixed left-0 top-0">
              <SheetHeader className="flex flex-row items-center justify-between">
                <SheetTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Projects Workspace
                </SheetTitle>
                <Button variant="ghost" size="icon-sm" onClick={() => setIsMobileProjectsOpen(false)}>
                  ×
                </Button>
              </SheetHeader>
              {renderContent(true)}
            </SheetContent>
          </Sheet>
        </div>
      )}
    </>
  )
}
