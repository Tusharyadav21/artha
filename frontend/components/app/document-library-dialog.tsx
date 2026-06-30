"use client"

import { ChangeEvent, useMemo, useState } from "react"
import { UploadIcon, SaveIcon } from "lucide-react"

import { useProjects } from "@/hooks/use-projects"
import { useDocuments } from "@/hooks/use-documents"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

interface DocumentLibraryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode?: "upload" | "scope"
  onScopeSelect?: (documentIds: string[]) => void
  autoFocusAfterUpload?: boolean
}

// fallow-ignore-next-line complexity
export function DocumentLibraryDialog({
  open,
  onOpenChange,
  mode = "upload",
  onScopeSelect,
  autoFocusAfterUpload = true,
}: DocumentLibraryDialogProps) {
  const { activeProject } = useProjects()
  const {
    documents,
    selectedDocumentIds,
    isUploading,
    toggleDocumentScope,
    clearDocumentScope,
    uploadDocument,
  } = useDocuments()

  const [showScopedOnly] = useState(false)

  const filteredDocuments = useMemo(() => {
    if (showScopedOnly) {
      return documents.filter((doc) => selectedDocumentIds.includes(doc.id))
    }
    return documents
  }, [documents, selectedDocumentIds, showScopedOnly])

  const completedDocuments = useMemo(() => {
    return filteredDocuments.filter((doc) => doc.status === "completed")
  }, [filteredDocuments])

  // fallow-ignore-next-line complexity
  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !activeProject) {
      return
    }

    void uploadDocument(file, activeProject.id)

    if (autoFocusAfterUpload) {
      // Reset the input so same file can be uploaded again
      event.target.value = ""
    }
  }

  const handleScopeSelect = (documentId: string) => {
    toggleDocumentScope(documentId)
    if (mode === "scope" && onScopeSelect) {
      // If this is for chat scope, notify parent on each selection
      const updated = selectedDocumentIds.includes(documentId)
        ? [...selectedDocumentIds, documentId]
        : selectedDocumentIds.filter((id) => id !== documentId)
      onScopeSelect(updated)
    }
  }

  const handleClearScope = () => {
    clearDocumentScope()
    if (mode === "scope" && onScopeSelect) {
      onScopeSelect([])
    }
  }

  const formatFileSize = (bytes: number) => {
    return Math.ceil(bytes / 1024) + " KB"
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "upload" ? "Project Documents" : "Document Scope"}
          </DialogTitle>
          <DialogDescription>
            {mode === "upload"
              ? "Upload files to build retrieval context. Completed documents can be scoped into chats."
              : "Select completed documents that should be used for this chat session."}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {/* Upload Section */}
          <div className="rounded-xl border border-dashed border-border p-6 text-center hover:bg-muted/30 transition-colors">
            <label
              className={`flex cursor-pointer flex-col items-center justify-center gap-3 ${isUploading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className="rounded-full bg-primary/10 p-3">
                <UploadIcon className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {isUploading ? "Uploading..." : "Click to upload document"}
                </p>
                <p className="text-xs text-muted-foreground">
                  PDF, DOCX, TXT, MD (max 10MB)
                </p>
              </div>
              <input
                className="sr-only"
                type="file"
                onChange={handleFileUpload}
                disabled={!activeProject || isUploading}
              />
            </label>
          </div>

          {/* Scoped Documents Info */}
          {mode === "upload" && selectedDocumentIds.length > 0 && (
            <div className="flex items-center justify-between rounded-xl border bg-muted/40 px-4 py-3">
              <p className="text-sm text-muted-foreground">
                {selectedDocumentIds.length} document(s) scoped for chat
              </p>
              <Button type="button" size="sm" variant="ghost" onClick={handleClearScope}>
                Clear all
              </Button>
            </div>
          )}

          {/* Documents List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {mode === "upload" ? "Documents" : "Select documents"}
              </p>
              <div className="flex items-center gap-2">
                {mode === "upload" && showScopedOnly && (
                  <Badge variant="secondary">{selectedDocumentIds.length} scoped</Badge>
                )}
              </div>
            </div>

            <ScrollArea className="max-h-[400px] rounded-lg border">
              <div className="p-2">
                {completedDocuments.length > 0 ? (
                  <div className="space-y-2">
                    {completedDocuments.map(
                      // fallow-ignore-next-line complexity
                      (document) => {
                      const isSelected = selectedDocumentIds.includes(document.id)
                      return (
                        <div
                          key={document.id}
                          className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                            isSelected ? "border-primary/30 bg-primary/5" : "hover:bg-muted"
                          }`}
                          onClick={() =>
                            mode === "scope"
                              ? handleScopeSelect(document.id)
                              : toggleDocumentScope(document.id)
                          }
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {document.filename}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(document.file_size)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="default">{document.status}</Badge>
                            {mode === "scope" && (
                              <div
                                className={`h-5 w-5 rounded-full border flex items-center justify-center transition-colors ${
                                  isSelected
                                    ? "bg-primary border-primary text-primary-foreground"
                                    : "border-muted"
                                }`}
                              >
                                {isSelected && (
                                  <SaveIcon className="h-3 w-3" fill="currentColor" />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="rounded-full bg-muted p-3 mb-3">
                      <UploadIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {mode === "upload"
                        ? "No documents uploaded yet"
                        : "No completed documents available"}
                    </p>
                    {mode === "upload" && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Upload a file to get started
                      </p>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Actions */}
        {mode === "upload" && (
          <div className="flex justify-end">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
