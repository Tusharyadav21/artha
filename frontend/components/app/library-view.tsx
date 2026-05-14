"use client"

import * as React from "react"
import { SaveIcon, UploadIcon } from "lucide-react"
import { useRouter } from "next/navigation"

import { useWorkspace } from "@/components/app/workspace-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

function statusVariant(status: "pending" | "processing" | "completed" | "failed") {
  if (status === "completed") {
    return "default"
  }
  if (status === "failed") {
    return "destructive"
  }
  return "secondary"
}

export function LibraryView() {
  const router = useRouter()
  const {
    activeProject,
    documents,
    documentsTotal,
    conversations,
    conversationsTotal,
    selectedDocumentIds,
    isUploading,
    isSavingProject,
    isLoadingMoreDocs,
    isLoadingMoreConversations,
    toggleDocumentScope,
    clearDocumentScope,
    uploadDocument,
    loadMoreDocuments,
    loadMoreConversations,
    openConversation,
    updateProjectSettings,
  } = useWorkspace()
  const [activeTab, setActiveTab] = React.useState("documents")

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-4">
      <TabsList className="w-fit">
        <TabsTrigger value="documents">
          Documents
        </TabsTrigger>
        <TabsTrigger value="conversations">
          Conversations
        </TabsTrigger>
        <TabsTrigger value="prompt">
          Project Prompt
        </TabsTrigger>
      </TabsList>

      <TabsContent value="documents">
        <Card>
          <CardHeader>
            <CardTitle>Documents</CardTitle>
            <CardDescription>
              Upload project files and choose which completed documents should be
              scoped into the next chat.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <label
              className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-4 text-sm transition-colors ${isUploading ? "opacity-50" : "hover:bg-muted"}`}
            >
              <UploadIcon data-icon="inline-start" />
              {isUploading ? "Uploading..." : "Upload file"}
              <input
                className="sr-only"
                type="file"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (!file) {
                    return
                  }
                  void uploadDocument(file)
                  event.target.value = ""
                }}
                disabled={!activeProject || isUploading}
              />
            </label>

            {selectedDocumentIds.length ? (
              <div className="flex items-center justify-between rounded-xl border bg-muted/40 px-3 py-3">
                <p className="text-sm text-muted-foreground">
                  {selectedDocumentIds.length} document(s) scoped for chat
                </p>
                <Button type="button" size="sm" variant="ghost" onClick={clearDocumentScope}>
                  Clear scope
                </Button>
              </div>
            ) : null}

            <ScrollArea className="max-h-[58svh]">
              <div className="grid gap-3">
                {documents.map((document) => (
                  <div
                    key={document.id}
                    className="rounded-xl border bg-card px-3 py-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium" title={document.filename}>
                          {document.filename}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {Math.ceil(document.file_size / 1024)} KB
                        </p>
                      </div>
                      <Badge variant={statusVariant(document.status)}>{document.status}</Badge>
                    </div>
                    {document.status === "completed" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant={
                          selectedDocumentIds.includes(document.id) ? "default" : "outline"
                        }
                        className="mt-3"
                        onClick={() => toggleDocumentScope(document.id)}
                      >
                        {selectedDocumentIds.includes(document.id)
                          ? "Scoped for chat"
                          : "Use in chat"}
                      </Button>
                    ) : null}
                    {document.error_message ? (
                      <p className="mt-2 text-xs leading-relaxed text-destructive">
                        {document.error_message}
                      </p>
                    ) : null}
                  </div>
                ))}
                {!documents.length ? (
                  <div className="rounded-xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
                    Upload a document to build retrieval context for this project.
                  </div>
                ) : null}
              </div>
            </ScrollArea>

            {documents.length < documentsTotal ? (
              <Button
                type="button"
                variant="ghost"
                disabled={isLoadingMoreDocs}
                onClick={() => void loadMoreDocuments()}
              >
                {isLoadingMoreDocs ? "Loading..." : "Load more documents"}
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="conversations">
        <Card>
          <CardHeader>
            <CardTitle>Conversation history</CardTitle>
            <CardDescription>
              Re-open any project conversation and jump back into the chat
              workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ScrollArea className="max-h-[58svh]">
              <div className="grid gap-3">
                {conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    className="rounded-xl border px-3 py-3 text-left transition hover:bg-muted"
                    onClick={() => {
                      void openConversation(conversation.id).then(() => {
                        router.push("/chat")
                      })
                    }}
                  >
                    <p className="line-clamp-2 text-sm font-medium">
                      {conversation.title ?? "Untitled conversation"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Intl.DateTimeFormat(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(conversation.updated_at))}
                    </p>
                  </button>
                ))}
                {!conversations.length ? (
                  <div className="rounded-xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
                    Your project conversations will appear here after the first chat.
                  </div>
                ) : null}
              </div>
            </ScrollArea>
            {conversations.length < conversationsTotal ? (
              <Button
                type="button"
                variant="ghost"
                disabled={isLoadingMoreConversations}
                onClick={() => void loadMoreConversations()}
              >
                {isLoadingMoreConversations ? "Loading..." : "Load more conversations"}
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="prompt">
        <Card>
          <CardHeader>
            <CardTitle>Project prompt</CardTitle>
            <CardDescription>
              Tune the system prompt that shapes retrieval and answer behavior for
              this project.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProjectPromptForm
              key={activeProject?.id ?? "no-project"}
              disabled={!activeProject || isSavingProject}
              initialPrompt={activeProject?.system_prompt ?? ""}
              onSave={updateProjectSettings}
            />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

function ProjectPromptForm({
  disabled,
  initialPrompt,
  onSave,
}: {
  disabled: boolean
  initialPrompt: string
  onSave: (systemPrompt: string | null) => Promise<void>
}) {
  const [systemPrompt, setSystemPrompt] = React.useState(initialPrompt)

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault()
        void onSave(systemPrompt)
      }}
    >
      <Textarea
        value={systemPrompt}
        onChange={(event) => setSystemPrompt(event.target.value)}
        disabled={disabled}
        placeholder="Custom system prompt"
        className="min-h-40 resize-none text-sm"
        maxLength={4000}
      />
      <div className="flex justify-end">
        <Button type="submit" disabled={disabled}>
          <SaveIcon data-icon="inline-start" />
          Save prompt
        </Button>
      </div>
    </form>
  )
}
