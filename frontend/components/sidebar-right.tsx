"use client"

import * as React from "react"
import { FileTextIcon, SaveIcon, UploadIcon } from "lucide-react"

import { type Conversation, type DocumentItem, type Source } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { ConversationsCard } from "@/components/conversations-card"

interface SidebarRightProps {
  activeProjectId: string | null
  systemPrompt: string
  setSystemPrompt: (prompt: string) => void
  isSavingProject: boolean
  updateProjectSettings: (e: React.FormEvent<HTMLFormElement>) => void
  documents: DocumentItem[]
  selectedDocumentIds: string[]
  toggleDocumentScope: (id: string) => void
  documentsTotal: number
  isLoadingMoreDocs: boolean
  loadDocuments: (id: string, skip: number) => Promise<void>
  isUploading: boolean
  uploadDocument: (e: React.ChangeEvent<HTMLInputElement>) => void
  statusVariant: (status: DocumentItem["status"]) => "default" | "destructive" | "secondary"
  conversations: Conversation[]
  conversationsTotal: number
  activeConversationId: string | null
  searchConversationQuery: string
  setSearchConversationQuery: (q: string) => void
  isConversationsCollapsed: boolean
  setIsConversationsCollapsed: (open: boolean) => void
  filteredConversations: Conversation[]
  loadConversation: (id: string) => void
  isLoadingMoreConvos: boolean
  loadConversations: (id: string, skip: number) => Promise<void>
  sources: Source[]
  isMobileDocsOpen: boolean
  setIsMobileDocsOpen: (open: boolean) => void
}

export function SidebarRight({
  activeProjectId,
  systemPrompt,
  setSystemPrompt,
  isSavingProject,
  updateProjectSettings,
  documents,
  selectedDocumentIds,
  toggleDocumentScope,
  documentsTotal,
  isLoadingMoreDocs,
  loadDocuments,
  isUploading,
  uploadDocument,
  statusVariant,
  conversations,
  conversationsTotal,
  activeConversationId,
  searchConversationQuery,
  setSearchConversationQuery,
  isConversationsCollapsed,
  setIsConversationsCollapsed,
  filteredConversations,
  loadConversation,
  isLoadingMoreConvos,
  loadConversations,
  sources,
  isMobileDocsOpen,
  setIsMobileDocsOpen,
}: SidebarRightProps) {
  const renderContent = (isMobile = false) => (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Project Prompt</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3" onSubmit={updateProjectSettings}>
            <Textarea
              value={systemPrompt}
              onChange={(event) => setSystemPrompt(event.target.value)}
              placeholder="e.g. You are a helpful financial assistant..."
              disabled={!activeProjectId || isSavingProject}
            />
            <Button
              type="submit"
              className="w-full text-xs"
              disabled={!activeProjectId || isSavingProject}
            >
              <SaveIcon className="mr-2 h-3 w-3" />
              {isSavingProject ? "Saving..." : "Save Instructions"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="flex max-h-[30%] min-h-0 flex-col">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Documents</CardTitle>
          <label className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border hover:bg-muted">
            <UploadIcon className="h-4 w-4" />
            <input
              type="file"
              className="hidden"
              disabled={!activeProjectId || isUploading}
              onChange={uploadDocument}
            />
          </label>
        </CardHeader>
        <CardContent className="min-h-0 flex-1">
          <ScrollArea className="h-full">
            <div className="flex flex-col gap-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center gap-2 rounded-lg border p-2">
                  <input
                    type="checkbox"
                    checked={selectedDocumentIds.includes(doc.id)}
                    disabled={doc.status !== "completed"}
                    onChange={() => toggleDocumentScope(doc.id)}
                  />
                  <span className="min-w-0 flex-1 truncate text-xs">{doc.filename}</span>
                  {!isMobile && (
                    <Badge variant={statusVariant(doc.status)}>
                      {doc.status}
                    </Badge>
                  )}
                </div>
              ))}
              {documents.length < documentsTotal && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 h-8 w-full text-xs"
                  disabled={isLoadingMoreDocs}
                  onClick={async () => {
                    if (!activeProjectId) return
                    await loadDocuments(activeProjectId, documents.length)
                  }}
                >
                  {isLoadingMoreDocs ? "Loading..." : "Load more"}
                </Button>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <ConversationsCard
        conversations={conversations}
        conversationsTotal={conversationsTotal}
        activeConversationId={activeConversationId}
        searchConversationQuery={searchConversationQuery}
        setSearchConversationQuery={setSearchConversationQuery}
        isConversationsCollapsed={isConversationsCollapsed}
        setIsConversationsCollapsed={setIsConversationsCollapsed}
        filteredConversations={filteredConversations}
        loadConversation={(id) => {
          loadConversation(id)
          if (isMobile) {
            setIsMobileDocsOpen(false)
          }
        }}
        isLoadingMoreConvos={isLoadingMoreConvos}
        loadConversations={loadConversations}
        activeProjectId={activeProjectId}
      />

      <Card className="flex min-h-0 flex-1 flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Retrieved Sources</CardTitle>
        </CardHeader>
        <CardContent className="min-h-0 flex-1">
          <ScrollArea className="h-full">
            <div className="flex flex-col gap-3">
              {sources.map((source, index) => (
                <div
                  id={`source-card-${index}`}
                  key={`${source.document_id}-${index}`}
                  className="rounded-lg border bg-card p-3 shadow-sm transition-all duration-300"
                >
                  <p className="flex items-center gap-2 text-xs font-medium">
                    <FileTextIcon className="h-3 w-3 text-muted-foreground" />
                    [{index + 1}] <span className="truncate">{source.filename}</span>
                  </p>
                  <p className="mt-2 line-clamp-4 text-[11px] leading-relaxed text-muted-foreground">
                    {source.content}
                  </p>
                </div>
              ))}
              {!sources.length ? (
                <div className="flex h-20 items-center justify-center rounded-lg border border-dashed">
                  <p className="text-xs text-muted-foreground">Sources appear during chat.</p>
                </div>
              ) : null}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </>
  )

  return (
    <>
      {/* Desktop Static Right Sidebar */}
      <aside className="hidden lg:flex flex-col gap-5 border-l border-border bg-card/40 p-4">
        {renderContent(false)}
      </aside>

      {/* Mobile Documents & History Sheet */}
      {isMobileDocsOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/40" onClick={() => setIsMobileDocsOpen(false)} />
          <Sheet open={isMobileDocsOpen}>
            <SheetContent className="w-80 h-full flex flex-col gap-5 border-l border-border bg-background p-4 fixed right-0 left-auto top-0">
              <SheetHeader className="flex flex-row items-center justify-between">
                <SheetTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Documents & Chat History
                </SheetTitle>
                <Button variant="ghost" size="icon-sm" onClick={() => setIsMobileDocsOpen(false)}>
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
