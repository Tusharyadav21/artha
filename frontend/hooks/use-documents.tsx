"use client"

import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useProjects } from "@/hooks/use-projects"
import { type DocumentItem, type PaginatedResponse } from "@/lib/api"
import { toast } from "@/components/ui/toast"

const PAGE_SIZE = 10

interface DocumentsContextValue {
  documents: DocumentItem[]
  documentsTotal: number
  selectedDocumentIds: string[]
  scopedDocumentIds: string[]
  hasScopedDocuments: boolean
  isUploading: boolean
  isLoadingMoreDocs: boolean
  uploadDocument: (file: File, projectId?: string) => Promise<void>
  deleteDocument: (documentId: string) => Promise<void>
  toggleDocumentScope: (documentId: string) => void
  clearDocumentScope: () => void
  loadMoreDocuments: () => Promise<void>
  listProjectDocuments: (projectId: string) => Promise<DocumentItem[]>
}

const DocumentsContext = createContext<DocumentsContextValue | null>(null)

export function DocumentsProvider({ children }: PropsWithChildren) {
  const { authedFetch } = useAuth()
  const { activeProjectId } = useProjects()

  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [documentsTotal, setDocumentsTotal] = useState(0)
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isLoadingMoreDocs, setIsLoadingMoreDocs] = useState(false)

  const completedDocumentIds = new Set(
    documents.filter((d) => d.status === "completed").map((d) => d.id)
  )
  const scopedDocumentIds = selectedDocumentIds.filter((id) => completedDocumentIds.has(id))
  const hasScopedDocuments = scopedDocumentIds.length > 0

  const loadDocuments = useCallback(
    async (projectId: string, skip = 0) => {
      const response = await authedFetch<PaginatedResponse<DocumentItem>>(
        `/api/projects/${projectId}/documents?skip=${skip}&limit=${PAGE_SIZE}`
      )
      if (skip === 0) {
        setDocuments(response.items)
      } else {
        setDocuments((current) => [...current, ...response.items])
      }
      setDocumentsTotal(response.total)
      return response
    },
    [authedFetch]
  )

  useEffect(() => {
    if (activeProjectId) {
      authedFetch<PaginatedResponse<DocumentItem>>(
        `/api/projects/${activeProjectId}/documents?skip=0&limit=${PAGE_SIZE}`
      ).then(response => {
        setDocuments(response.items)
        setDocumentsTotal(response.total)
      })
    }
  }, [activeProjectId, authedFetch])

  useEffect(() => {
    if (!activeProjectId) return

    const hasProcessing = documents.some(
      (d) => d.status === "pending" || d.status === "processing"
    )
    if (!hasProcessing) return

    const interval = window.setInterval(() => {
      const limit = Math.max(documents.length, PAGE_SIZE)
      void authedFetch<PaginatedResponse<DocumentItem>>(
        `/api/projects/${activeProjectId}/documents?skip=0&limit=${limit}`
      )
        .then((response) => {
          setDocuments(response.items)
          setDocumentsTotal(response.total)
        })
        .catch((err) => console.error("Polling error", err))
    }, 2000)

    return () => window.clearInterval(interval)
  }, [activeProjectId, authedFetch, documents])

  const uploadDocument = useCallback(
    async (file: File, projectId?: string) => {
      const targetProjectId = projectId || activeProjectId
      if (!targetProjectId) return

      setIsUploading(true)
      try {
        const formData = new FormData()
        formData.set("file", file)
        const document = await authedFetch<DocumentItem>(
          `/api/projects/${targetProjectId}/documents`,
          { method: "POST", body: formData }
        )
        if (targetProjectId === activeProjectId) {
          setDocuments((current) => {
            if (current.some((d) => d.id === document.id)) return current
            return [document, ...current]
          })
          setDocumentsTotal((total) => total) // We'll let polling correct the total if it actually changed
        }
        toast.success(`Uploaded ${file.name}`)
      } catch (caught) {
        toast.error(caught instanceof Error ? caught.message : "Upload failed")
      } finally {
        setIsUploading(false)
      }
    },
    [activeProjectId, authedFetch]
  )

  const deleteDocument = useCallback(
    async (documentId: string) => {
      if (!activeProjectId) return

      try {
        await authedFetch(
          `/api/projects/${activeProjectId}/documents/${documentId}`,
          { method: "DELETE" }
        )
        setDocuments((current) => current.filter((d) => d.id !== documentId))
        setDocumentsTotal((prev) => prev - 1)
        setSelectedDocumentIds((current) => current.filter((id) => id !== documentId))
        toast.success("Document deleted")
      } catch {
        toast.error("Failed to delete document")
      }
    },
    [activeProjectId, authedFetch]
  )

  const toggleDocumentScope = useCallback((documentId: string) => {
    setSelectedDocumentIds((current) => {
      if (current.includes(documentId)) return current.filter((id) => id !== documentId)
      return [...current, documentId]
    })
  }, [])

  const clearDocumentScope = useCallback(() => {
    setSelectedDocumentIds([])
  }, [])

  const loadMoreDocuments = useCallback(async () => {
    if (!activeProjectId || documents.length >= documentsTotal) return

    setIsLoadingMoreDocs(true)
    try {
      await loadDocuments(activeProjectId, documents.length)
    } catch {
      toast.error("Failed to load more documents")
    } finally {
      setIsLoadingMoreDocs(false)
    }
  }, [activeProjectId, documents.length, documentsTotal, loadDocuments])

  const listProjectDocuments = useCallback(
    async (projectId: string) => {
      const response = await authedFetch<PaginatedResponse<DocumentItem>>(
        `/api/projects/${projectId}/documents?skip=0&limit=100`
      )
      return response.items
    },
    [authedFetch]
  )

  const value = useMemo<DocumentsContextValue>(
    () => ({
      documents,
      documentsTotal,
      selectedDocumentIds,
      scopedDocumentIds,
      hasScopedDocuments,
      isUploading,
      isLoadingMoreDocs,
      uploadDocument,
      deleteDocument,
      toggleDocumentScope,
      clearDocumentScope,
      loadMoreDocuments,
      listProjectDocuments,
    }),
    [
      documents,
      documentsTotal,
      selectedDocumentIds,
      scopedDocumentIds,
      hasScopedDocuments,
      isUploading,
      isLoadingMoreDocs,
      uploadDocument,
      deleteDocument,
      toggleDocumentScope,
      clearDocumentScope,
      loadMoreDocuments,
      listProjectDocuments,
    ]
  )

  return <DocumentsContext.Provider value={value}>{children}</DocumentsContext.Provider>
}

export function useDocuments() {
  const value = useContext(DocumentsContext)
  if (!value) throw new Error("useDocuments must be used inside DocumentsProvider")
  return value
}
