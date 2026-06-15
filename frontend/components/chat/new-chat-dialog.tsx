"use client"

import * as React from "react"
import { MessageSquarePlusIcon, CheckIcon } from "lucide-react"
import { useRouter } from "next/navigation"

import { useAuth } from "@/hooks/use-auth"
import { useProjects } from "@/hooks/use-projects"
import { useDocuments } from "@/hooks/use-documents"
import { useChat } from "@/hooks/use-chat"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { type DocumentItem } from "@/lib/api"
import { cn } from "@/lib/utils"

interface NewChatDialogProps {
  open: boolean
  onOpenChange: (value: boolean) => void
}

export function NewChatDialog({ open, onOpenChange }: NewChatDialogProps) {
  const { activeProjectId, projects } = useProjects()
  const { selectedDocumentIds } = useDocuments()
  const { user } = useAuth()
  const dialogKey = `${activeProjectId ?? "none"}:${user?.new_chat_scope_mode ?? "clear"}:${projects.map((p) => p.id).join(",")}`

  if (!open) return null

  return (
    <NewChatDialogBody
      key={dialogKey}
      activeProjectId={activeProjectId}
      initialScopeMode={user?.new_chat_scope_mode ?? "clear"}
      projects={projects}
      selectedDocumentIds={selectedDocumentIds}
      onOpenChange={onOpenChange}
    />
  )
}

function NewChatDialogBody({
  activeProjectId,
  initialScopeMode,
  projects,
  selectedDocumentIds,
  onOpenChange,
}: {
  activeProjectId: string | null
  initialScopeMode: "clear" | "remember" | "all-completed"
  projects: { id: string; name: string }[]
  selectedDocumentIds: string[]
  onOpenChange: (value: boolean) => void
}) {
  const router = useRouter()
  const { listProjectDocuments } = useDocuments()
  const { prepareNewChat: onPrepareNewChat } = useChat()

  const [projectId, setProjectId] = React.useState(activeProjectId ?? projects[0]?.id ?? "")
  const [scopeMode, setScopeMode] = React.useState<"clear" | "remember" | "all-completed">(
    initialScopeMode
  )
  const [documents, setDocuments] = React.useState<DocumentItem[]>([])
  const [isLoadingDocuments, setIsLoadingDocuments] = React.useState(false)
  const [checkedDocumentIds, setCheckedDocumentIds] = React.useState<string[]>([])

  React.useEffect(() => {
    if (!projectId) return

    let isCancelled = false
    async function loadDocuments() {
      setIsLoadingDocuments(true)
      const items = await listProjectDocuments(projectId)
      if (isCancelled) return
      const completed = items.filter((item) => item.status === "completed")
      setDocuments(completed)

      if (scopeMode === "remember" && projectId === activeProjectId) {
        setCheckedDocumentIds(
          selectedDocumentIds.filter((id) => completed.some((d) => d.id === id))
        )
        return
      }
      if (scopeMode === "all-completed") {
        setCheckedDocumentIds(completed.map((d) => d.id))
        return
      }
      setCheckedDocumentIds([])
    }

    void loadDocuments().finally(() => {
      if (!isCancelled) setIsLoadingDocuments(false)
    })

    return () => { isCancelled = true }
  }, [activeProjectId, listProjectDocuments, projectId, scopeMode, selectedDocumentIds])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!projectId) return

    await onPrepareNewChat({ projectId, documentIds: checkedDocumentIds })
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
                  <TabsTrigger value="clear" className="text-xs">Clear</TabsTrigger>
                  <TabsTrigger value="remember" className="text-xs">Remember</TabsTrigger>
                  <TabsTrigger value="all-completed" className="text-xs">All</TabsTrigger>
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
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="px-6">
              Cancel
            </Button>
            <Button type="submit" disabled={!projectId} className="px-6 shadow-lg shadow-primary/10">
              <MessageSquarePlusIcon className="mr-2 size-4" />
              Open Draft
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
