"use client"

import * as React from "react"
import {
  LogOutIcon,
  MenuIcon,
  MessageSquarePlusIcon,
  MonitorIcon,
  MoonStarIcon,
  SettingsIcon,
  SunMediumIcon,
} from "lucide-react"
import { usePathname, useRouter } from "next/navigation"

import { useWorkspace, WorkspaceProvider } from "@/components/app/workspace-provider"
import { Sidebar } from "@/components/app/sidebar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { type DocumentItem } from "@/lib/api"
import { cn } from "@/lib/utils"

function nextThemePreference(current: "system" | "light" | "dark") {
  if (current === "system") {
    return "light"
  }
  if (current === "light") {
    return "dark"
  }
  return "system"
}

function themeLabel(current: "system" | "light" | "dark") {
  if (current === "system") {
    return "System"
  }
  if (current === "light") {
    return "Light"
  }
  return "Dark"
}

function pageMeta(pathname: string) {
  if (pathname.startsWith("/library")) {
    return {
      title: "Project library",
      description: "Manage documents, browse conversations, and tune project prompts.",
    }
  }
  if (pathname.startsWith("/settings")) {
    return {
      title: "Personal settings",
      description: "Control your profile, appearance, and default chat behavior.",
    }
  }
  return {
    title: "Chat workspace",
    description: "Ask questions, review sources, and keep project conversations flowing.",
  }
}

function NewChatDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (value: boolean) => void
}) {
  const {
    activeProjectId,
    selectedDocumentIds,
    user,
    projects,
    listProjectDocuments,
    prepareNewChat,
  } = useWorkspace()
  const dialogKey = `${activeProjectId ?? "none"}:${user?.new_chat_scope_mode ?? "clear"}:${projects.map((project) => project.id).join(",")}`

  if (!open) {
    return null
  }

  return (
    <NewChatDialogBody
      key={dialogKey}
      activeProjectId={activeProjectId}
      initialScopeMode={user?.new_chat_scope_mode ?? "clear"}
      listProjectDocuments={listProjectDocuments}
      onOpenChange={onOpenChange}
      prepareNewChat={prepareNewChat}
      projects={projects}
      selectedDocumentIds={selectedDocumentIds}
    />
  )
}

function NewChatDialogBody({
  activeProjectId,
  initialScopeMode,
  listProjectDocuments,
  onOpenChange,
  prepareNewChat,
  projects,
  selectedDocumentIds,
}: {
  activeProjectId: string | null
  initialScopeMode: "clear" | "remember" | "all-completed"
  listProjectDocuments: (projectId: string) => Promise<DocumentItem[]>
  onOpenChange: (value: boolean) => void
  prepareNewChat: (config: {
    projectId: string
    documentIds: string[]
  }) => Promise<void>
  projects: { id: string; name: string }[]
  selectedDocumentIds: string[]
}) {
  const router = useRouter()
  const [projectId, setProjectId] = React.useState(
    activeProjectId ?? projects[0]?.id ?? ""
  )
  const [scopeMode, setScopeMode] = React.useState<
    "clear" | "remember" | "all-completed"
  >(initialScopeMode)
  const [documents, setDocuments] = React.useState<DocumentItem[]>([])
  const [isLoadingDocuments, setIsLoadingDocuments] = React.useState(false)
  const [checkedDocumentIds, setCheckedDocumentIds] = React.useState<string[]>([])

  React.useEffect(() => {
    if (!projectId) {
      return
    }

    let isCancelled = false
    async function loadDocuments() {
      setIsLoadingDocuments(true)
      const items = await listProjectDocuments(projectId)
      if (isCancelled) {
        return
      }
      const completed = items.filter((item) => item.status === "completed")
      setDocuments(completed)

      if (scopeMode === "remember" && projectId === activeProjectId) {
        setCheckedDocumentIds(
          selectedDocumentIds.filter((id) =>
            completed.some((document) => document.id === id)
          )
        )
        return
      }
      if (scopeMode === "all-completed") {
        setCheckedDocumentIds(completed.map((document) => document.id))
        return
      }
      setCheckedDocumentIds([])
    }

    void loadDocuments().finally(() => {
      if (!isCancelled) {
        setIsLoadingDocuments(false)
      }
    })

    return () => {
      isCancelled = true
    }
  }, [
    activeProjectId,
    listProjectDocuments,
    projectId,
    scopeMode,
    selectedDocumentIds,
  ])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!projectId) {
      return
    }

    await prepareNewChat({
      projectId,
      documentIds: checkedDocumentIds,
    })
    onOpenChange(false)
    router.push("/chat")
  }

  return (
    <Dialog open>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Start a new chat</DialogTitle>
          <CardDescription>
            Choose the project and document scope that should seed the next chat
            draft. The backend conversation will still be created on your first
            message.
          </CardDescription>
        </DialogHeader>
        <form className="mt-5 flex flex-col gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Project</label>
              <Select
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Scope preset</label>
              <Select
                value={scopeMode}
                onChange={(event) =>
                  setScopeMode(
                    event.target.value as "clear" | "remember" | "all-completed"
                  )
                }
              >
                <option value="clear">Start with no scoped documents</option>
                <option value="remember">Reuse the current scoped set</option>
                <option value="all-completed">
                  Preselect every completed document
                </option>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Document scope</label>
              <p className="text-xs text-muted-foreground">
                {checkedDocumentIds.length} selected
              </p>
            </div>
            <Card>
              <CardContent className="pt-5">
                {isLoadingDocuments ? (
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : documents.length ? (
                  <div className="grid gap-2">
                    {documents.map((document) => {
                      const isChecked = checkedDocumentIds.includes(document.id)
                      return (
                        <button
                          key={document.id}
                          type="button"
                          className={cn(
                            "rounded-xl border px-3 py-3 text-left transition",
                            isChecked
                              ? "border-primary/30 bg-primary/10"
                              : "hover:bg-muted"
                          )}
                          onClick={() =>
                            setCheckedDocumentIds((current) =>
                              current.includes(document.id)
                                ? current.filter((id) => id !== document.id)
                                : [...current, document.id]
                            )
                          }
                        >
                          <p className="truncate text-sm font-medium">
                            {document.filename}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {Math.ceil(document.file_size / 1024)} KB
                          </p>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    This project has no completed documents yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!projectId}>
              <MessageSquarePlusIcon data-icon="inline-start" />
              Open draft chat
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function WorkspaceFrame({ children }: React.PropsWithChildren) {
  const router = useRouter()
  const pathname = usePathname()
  const {
    token,
    user,
    activeProject,
    isLoadingSession,
    signOut,
    updateUserSettings,
  } = useWorkspace()
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = React.useState(false)
  const [isNewChatOpen, setIsNewChatOpen] = React.useState(false)
  const meta = pageMeta(pathname)



  if (isLoadingSession || !user) {
    return (
      <main className="min-h-svh bg-background p-6">
        <div className="grid min-h-[calc(100svh-3rem)] gap-6 lg:grid-cols-[280px_1fr]">
          <Card>
            <CardContent className="flex flex-col gap-3 pt-5">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col gap-4 pt-5">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-svh bg-[radial-gradient(circle_at_top_left,var(--color-primary)/10,transparent_28rem)]">
      <div className="flex min-h-svh">
        <div className="hidden border-r border-sidebar-border lg:block">
          <Sidebar />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-border bg-background/85 px-4 py-3 backdrop-blur">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="lg:hidden"
                  aria-label="Open navigation"
                  onClick={() => setIsMobileSidebarOpen(true)}
                >
                  <MenuIcon data-icon="inline-start" />
                </Button>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-primary">
                    {activeProject?.name || "No project selected"}
                  </p>
                  <h1 className="font-heading text-2xl font-semibold">
                    {meta.title}
                  </h1>
                  <p className="max-w-2xl text-sm text-muted-foreground">
                    {meta.description}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsNewChatOpen(true)}
                >
                  <MessageSquarePlusIcon data-icon="inline-start" />
                  New chat
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    void updateUserSettings({
                      theme_preference: nextThemePreference(
                        user.theme_preference
                      ),
                    })
                  }
                >
                  {user.theme_preference === "system" ? (
                    <MonitorIcon data-icon="inline-start" />
                  ) : user.theme_preference === "light" ? (
                    <SunMediumIcon data-icon="inline-start" />
                  ) : (
                    <MoonStarIcon data-icon="inline-start" />
                  )}
                  {themeLabel(user.theme_preference)}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.push("/settings")}
                >
                  <SettingsIcon data-icon="inline-start" />
                  Settings
                </Button>
                <Button type="button" variant="ghost" onClick={signOut}>
                  <LogOutIcon data-icon="inline-start" />
                  Sign out
                </Button>
              </div>
            </div>
          </header>

          <div className="flex-1 p-4 lg:p-6">{children}</div>
        </div>
      </div>

      <Sheet open={isMobileSidebarOpen}>
        <SheetContent className="w-80 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Workspace navigation</SheetTitle>
          </SheetHeader>
          <Sidebar mobile onNavigate={() => setIsMobileSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      <NewChatDialog open={isNewChatOpen} onOpenChange={setIsNewChatOpen} />
    </main>
  )
}

export function WorkspaceShell({ children }: React.PropsWithChildren) {
  return (
    <WorkspaceProvider>
      <WorkspaceFrame>{children}</WorkspaceFrame>
    </WorkspaceProvider>
  )
}
