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
  CheckIcon,
  SearchIcon,
} from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { motion } from "framer-motion"

import { useWorkspace, WorkspaceProvider } from "@/components/app/workspace-provider"
import { Sidebar } from "@/components/app/sidebar"
import { CommandPalette } from "@/components/app/command-palette"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/app/ui-tooltip"
import { type DocumentItem } from "@/lib/api"
import { cn } from "@/lib/utils"
import { scaleIn } from "@/lib/motion"
import { Badge } from "../ui/badge"

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

// fallow-ignore-next-line complexity
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

// fallow-ignore-next-line complexity
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
  prepareNewChat: (config: { projectId: string; documentIds: string[] }) => Promise<void>
  projects: { id: string; name: string }[]
  selectedDocumentIds: string[]
}) {
  const router = useRouter()
  const [projectId, setProjectId] = React.useState(activeProjectId ?? projects[0]?.id ?? "")
  const [scopeMode, setScopeMode] = React.useState<"clear" | "remember" | "all-completed">(
    initialScopeMode
  )
  const [documents, setDocuments] = React.useState<DocumentItem[]>([])
  const [isLoadingDocuments, setIsLoadingDocuments] = React.useState(false)
  const [checkedDocumentIds, setCheckedDocumentIds] = React.useState<string[]>([])

  React.useEffect(() => {
    if (!projectId) {
      return
    }

    let isCancelled = false
    // fallow-ignore-next-line complexity
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
          selectedDocumentIds.filter((id) => completed.some((document) => document.id === id))
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
  }, [activeProjectId, listProjectDocuments, projectId, scopeMode, selectedDocumentIds])

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
          <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10">
            <MessageSquarePlusIcon className="size-6 text-primary" />
          </div>
          <DialogTitle className="text-2xl">Start a new chat</DialogTitle>
          <CardDescription className="text-sm">
            Choose the project and document scope that should seed the next chat draft.
          </CardDescription>
        </DialogHeader>
        <form className="mt-5 flex flex-col gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Select Project
              </label>
              <Select
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
                className="bg-muted/30"
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Scope Preset
              </label>
              <Tabs
                value={scopeMode}
                onValueChange={(val) => setScopeMode(val as "clear" | "remember" | "all-completed")}
                className="w-full"
              >
                <TabsList className="w-full bg-muted/30" variant="line">
                  <TabsTrigger value="clear" className="text-xs">
                    Clear
                  </TabsTrigger>
                  <TabsTrigger value="remember" className="text-xs">
                    Remember
                  </TabsTrigger>
                  <TabsTrigger value="all-completed" className="text-xs">
                    All
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Document Scope
              </label>
              <Badge variant="secondary" className="h-4 px-1.5 text-[9px]">
                {checkedDocumentIds.length} SELECTED
              </Badge>
            </div>
            <Card className="border-border/50 bg-muted/10">
              <CardContent className="p-2">
                {isLoadingDocuments ? (
                  <div className="flex flex-col gap-2 p-2">
                    <Skeleton className="h-10 w-full rounded-lg" />
                    <Skeleton className="h-10 w-full rounded-lg" />
                  </div>
                ) : documents.length ? (
                  <ScrollArea className="h-[200px]">
                    <div className="grid gap-1 p-1">
                      {documents.map((document) => {
                        const isChecked = checkedDocumentIds.includes(document.id)
                        return (
                          <button
                            key={document.id}
                            type="button"
                            className={cn(
                              "flex items-center justify-between rounded-lg px-3 py-2 text-left transition-all",
                              isChecked
                                ? "bg-primary text-primary-foreground shadow-sm"
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
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-medium">{document.filename}</p>
                            </div>
                            {isChecked && <CheckIcon className="ml-2 size-3 shrink-0" />}
                          </button>
                        )
                      })}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-xs text-muted-foreground">
                      No documents available for this project.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-3 border-t border-border/50 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="px-6"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!projectId}
              className="px-6 shadow-lg shadow-primary/10"
            >
              <MessageSquarePlusIcon className="mr-2 size-4" />
              Open Draft
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// fallow-ignore-next-line complexity
function WorkspaceFrame({ children }: React.PropsWithChildren) {
  const router = useRouter()
  const pathname = usePathname()
  const {
    user,
    isLoadingSession,
    signOut,
    updateUserSettings,
    activeProject,
    conversations,
    activeConversationId,
  } = useWorkspace()
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = React.useState(false)
  const [isNewChatOpen, setIsNewChatOpen] = React.useState(false)
  const meta = pageMeta(pathname)

  if (isLoadingSession || !user) {
    return (
      <main className="flex min-h-svh bg-background">
        <div className="hidden w-80 space-y-4 border-r border-sidebar-border p-4 lg:block">
          <Skeleton className="h-10 w-full rounded-xl" />
          <div className="space-y-2 pt-8">
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
          <div className="space-y-2 pt-12">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>
        <div className="flex flex-1 flex-col">
          <div className="flex h-14 items-center border-b border-border px-6">
            <Skeleton className="h-6 w-48" />
          </div>
          <div className="flex-1 space-y-6 p-8">
            <div className="flex justify-between">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-10 w-32" />
            </div>
            <Skeleton className="h-[400px] w-full rounded-2xl" />
          </div>
        </div>
      </main>
    )
  }

  const isWorkspaceView = pathname.startsWith("/chat") || pathname.startsWith("/analytics")

  const activeConversation = conversations.find((c) => c.id === activeConversationId)

  return (
    <main className="flex h-[100dvh] overflow-hidden bg-background text-foreground">
      <div className="hidden h-full shrink-0 border-r border-sidebar-border lg:block">
        <Sidebar />
      </div>

      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        {/* Breadcrumb Header */}
        <header className="z-20 flex h-14 shrink-0 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
              aria-label="Open navigation"
              onClick={() => setIsMobileSidebarOpen(true)}
            >
              <MenuIcon className="size-5" />
            </Button>
            <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
              <span className="max-w-[120px] truncate">{activeProject?.name || "Artha"}</span>
              <span className="text-muted-foreground/40">/</span>
              <span className="max-w-[200px] truncate text-foreground">
                {isWorkspaceView ? activeConversation?.title || "New Chat" : "Settings"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  onClick={() =>
                    void updateUserSettings({
                      theme_preference: nextThemePreference(user.theme_preference),
                    })
                  }
                >
                  {user.theme_preference === "system" ? (
                    <MonitorIcon className="size-4" />
                  ) : user.theme_preference === "light" ? (
                    <SunMediumIcon className="size-4" />
                  ) : (
                    <MoonStarIcon className="size-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Theme: {themeLabel(user.theme_preference)}</TooltipContent>
            </Tooltip>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">{children}</div>
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
      <CommandPalette />
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
