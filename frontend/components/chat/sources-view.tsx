"use client"

import * as React from "react"
import { ArrowLeftIcon, FileTextIcon, LibraryIcon, UploadIcon, Trash2Icon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { formatBytes, getDocumentTypeMeta } from "@/components/chat/message-utils"

interface Document {
  id: string
  filename: string
  file_size: number
  status: string
}

interface SourcesViewProps {
  documents: Document[]
  selectedDocumentIds: string[]
  activeInContextDocuments: Document[]
  isUploading: boolean
  onBack: () => void
  onUpload: () => void
  onToggleScope: (id: string) => void
  onDelete: (id: string) => void
}

export function SourcesView({
  documents,
  selectedDocumentIds,
  activeInContextDocuments,
  isUploading,
  onBack,
  onUpload,
  onToggleScope,
  onDelete,
}: SourcesViewProps) {
  return (
    <div className="flex-1 overflow-hidden min-h-0 p-6 bg-background">
      <div className="max-w-4xl mx-auto h-full flex flex-col gap-6">
        <div className="shrink-0">
          <Button variant="ghost" onClick={onBack} className="text-muted-foreground hover:text-foreground -ml-4">
            <ArrowLeftIcon className="size-4 mr-2" />
            Back to Chat
          </Button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0">
          <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="mb-4 shrink-0 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Active Context
                </h4>
                <p className="text-[11px] text-muted-foreground mt-1">Files currently scoped for chat</p>
              </div>
              <Badge variant="secondary" className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold">
                {activeInContextDocuments.length} files
              </Badge>
            </div>

            <ScrollArea className="flex-1">
              <div className="space-y-3 pr-3">
                {activeInContextDocuments.map((doc) => {
                  const meta = getDocumentTypeMeta(doc.filename, doc.file_size)
                  return (
                    <div
                      key={doc.id}
                      className="rounded-xl border border-border bg-background p-4 shadow-sm hover:border-muted-foreground/30 transition duration-150 flex items-start gap-4"
                    >
                      <div className={cn("size-10 rounded-lg flex items-center justify-center font-bold text-[11px] shrink-0 border", meta.bgClass)}>
                        {meta.label}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-foreground truncate mb-1" title={doc.filename}>
                          {doc.filename}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                          {formatBytes(doc.file_size)} <span className="opacity-50">•</span> {meta.pagesLabel}
                        </p>
                      </div>
                    </div>
                  )
                })}

                {!activeInContextDocuments.length && (
                  <div className="py-16 text-center select-none border border-dashed border-border rounded-xl bg-muted/50">
                    <FileTextIcon className="size-8 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-sm font-bold text-foreground mb-1">No active documents</p>
                    <p className="text-[11px] text-muted-foreground max-w-[200px] mx-auto leading-relaxed">
                      Scope a document from your Library to run targeted searches.
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="mb-4 shrink-0 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Project Library
                </h4>
                <p className="text-[11px] text-muted-foreground mt-1">Upload and manage all files</p>
              </div>
              <label
                onClick={onUpload}
                className={cn(
                  "bg-muted hover:bg-muted-foreground/20 text-foreground border border-border px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 shadow-sm",
                  isUploading && "opacity-50 pointer-events-none"
                )}
              >
                <UploadIcon className="size-3.5 text-primary" />
                {isUploading ? "Uploading..." : "Upload"}
              </label>
            </div>

            <ScrollArea className="flex-1">
              <div className="space-y-3 pr-3">
                {documents.map((doc) => {
                  const isSelected = selectedDocumentIds.includes(doc.id)
                  const isProcessing = doc.status === "pending" || doc.status === "processing"

                  return (
                    <div
                      key={doc.id}
                      className={cn(
                        "rounded-xl border p-3.5 flex flex-col transition duration-150 shadow-sm",
                        isSelected ? "border-primary/30 bg-primary/10" : "border-border bg-background hover:bg-muted"
                      )}
                    >
                      <div className="flex items-center justify-between gap-3 min-w-0">
                        <div className="min-w-0 flex-1 leading-normal">
                          <p className="text-[13px] font-semibold text-foreground truncate mb-0.5" title={doc.filename}>
                            {doc.filename}
                          </p>
                          <div className="flex items-center gap-2">
                            <p className="text-[11px] text-muted-foreground font-medium">{formatBytes(doc.file_size)}</p>
                            <span className="text-muted-foreground/30">•</span>
                            <div className="flex items-center gap-1.5">
                              {isProcessing && (
                                <>
                                  <div className="size-1.5 rounded-full bg-blue-500 animate-pulse" />
                                  <span className="text-[10px] font-semibold text-blue-400">Indexing</span>
                                </>
                              )}
                              {doc.status === "completed" && (
                                <>
                                  <div className="size-1.5 rounded-full bg-primary" />
                                  <span className="text-[10px] font-semibold text-primary">Ready</span>
                                </>
                              )}
                              {doc.status === "failed" && (
                                <>
                                  <div className="size-1.5 rounded-full bg-destructive" />
                                  <span className="text-[10px] font-semibold text-destructive">Failed</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {doc.status === "completed" && (
                            <Button
                              type="button"
                              size="xs"
                              variant={isSelected ? "default" : "outline"}
                              className={cn(
                                "h-7 px-3 text-[11px] font-bold rounded-lg shrink-0 transition-colors shadow-sm",
                                isSelected
                                  ? "bg-primary hover:bg-primary/90 text-primary-foreground border-transparent"
                                  : "bg-muted border-border text-foreground hover:bg-muted-foreground/20 hover:text-foreground"
                              )}
                              onClick={() => onToggleScope(doc.id)}
                            >
                              {isSelected ? "Unscope" : "Scope"}
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0"
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this document and its embeddings?")) {
                                onDelete(doc.id)
                              }
                            }}
                          >
                            <Trash2Icon className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {!documents.length && (
                  <div className="py-16 text-center select-none border border-dashed border-border rounded-xl bg-muted/50">
                    <LibraryIcon className="size-8 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-sm font-bold text-foreground mb-1">Library empty</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  )
}
