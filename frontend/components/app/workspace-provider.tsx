"use client"

import * as React from "react"
import { useTheme } from "next-themes"

import { toast } from "@/components/ui/toast"
import { ACTIVE_PROJECT_KEY, TOKEN_KEY } from "@/lib/app-storage"
import {
  apiFetch,
  apiUrl,
  type ChatRequest,
  type Conversation,
  type DocumentItem,
  type FeedbackRequest,
  type Message,
  type PaginatedResponse,
  type Project,
  type Source,
  type User,
  type UserSettingsUpdate,
} from "@/lib/api"

const PAGE_SIZE = 10

interface StreamEvent {
  event: string
  data: string
}

type FeedbackRating = FeedbackRequest["rating"]

interface WorkspaceContextValue {
  token: string | null
  user: User | null
  projects: Project[]
  activeProjectId: string | null
  activeProject: Project | undefined
  documents: DocumentItem[]
  documentsTotal: number
  conversations: Conversation[]
  conversationsTotal: number
  activeConversationId: string | null
  messages: Message[]
  sources: Source[]
  selectedDocumentIds: string[]
  feedbackByMessageId: Record<string, FeedbackRating>
  pendingFeedbackId: string | null
  isLoadingSession: boolean
  isLoadingMessages: boolean
  isStreaming: boolean
  isUploading: boolean
  isSavingProject: boolean
  isSavingSettings: boolean
  isCreatingProject: boolean
  isLoadingMoreDocs: boolean
  isLoadingMoreConversations: boolean
  scopedDocumentIds: string[]
  hasScopedDocuments: boolean
  signOut: () => void
  refreshSession: () => Promise<void>
  createProject: (name: string) => Promise<void>
  selectProject: (
    projectId: string,
    options?: { documentIds?: string[] }
  ) => Promise<void>
  loadMoreDocuments: () => Promise<void>
  loadMoreConversations: () => Promise<void>
  listProjectDocuments: (projectId: string) => Promise<DocumentItem[]>
  uploadDocument: (file: File) => Promise<void>
  openConversation: (conversationId: string) => Promise<void>
  prepareNewChat: (config: {
    projectId: string
    documentIds: string[]
  }) => Promise<void>
  submitMessage: (question: string) => Promise<boolean>
  toggleDocumentScope: (documentId: string) => void
  clearDocumentScope: () => void
  sendFeedback: (messageId: string, rating: FeedbackRating) => Promise<void>
  updateProjectSettings: (systemPrompt: string | null) => Promise<void>
  updateUserSettings: (updates: UserSettingsUpdate) => Promise<User | null>
}

const WorkspaceContext = React.createContext<WorkspaceContextValue | null>(null)

function parseSseEvents(buffer: string): {
  events: StreamEvent[]
  rest: string
} {
  const chunks = buffer.split("\n\n")
  const rest = chunks.pop() ?? ""
  const events = chunks
    .map((chunk) => {
      let event = "message"
      const data: string[] = []

      for (const line of chunk.split("\n")) {
        if (line.startsWith("event:")) {
          event = line.slice("event:".length).trim()
        }
        if (line.startsWith("data:")) {
          data.push(line.slice("data:".length).trimStart())
        }
      }

      return { event, data: data.join("\n") }
    })
    .filter((event) => event.data)

  return { events, rest }
}

function getStoredFeedback(message: Message): FeedbackRating | null {
  const feedback = message.metadata_?.feedback
  if (
    typeof feedback === "object" &&
    feedback !== null &&
    "rating" in feedback &&
    ((feedback as { rating: unknown }).rating === "up" ||
      (feedback as { rating: unknown }).rating === "down")
  ) {
    return (feedback as { rating: FeedbackRating }).rating
  }
  return null
}

function readStoredToken() {
  if (typeof window === "undefined") {
    return null
  }
  return window.localStorage.getItem(TOKEN_KEY)
}

function readStoredProjectId() {
  if (typeof window === "undefined") {
    return null
  }
  return window.localStorage.getItem(ACTIVE_PROJECT_KEY)
}

export function WorkspaceProvider({
  children,
}: React.PropsWithChildren) {
  const { setTheme } = useTheme()
  const [token, setToken] = React.useState<string | null>(readStoredToken)
  const [user, setUser] = React.useState<User | null>(null)
  const [projects, setProjects] = React.useState<Project[]>([])
  const [activeProjectId, setActiveProjectId] = React.useState<string | null>(
    null
  )
  const [documents, setDocuments] = React.useState<DocumentItem[]>([])
  const [documentsTotal, setDocumentsTotal] = React.useState(0)
  const [conversations, setConversations] = React.useState<Conversation[]>([])
  const [conversationsTotal, setConversationsTotal] = React.useState(0)
  const [activeConversationId, setActiveConversationId] = React.useState<
    string | null
  >(null)
  const [messages, setMessages] = React.useState<Message[]>([])
  const [sources, setSources] = React.useState<Source[]>([])
  const [selectedDocumentIds, setSelectedDocumentIds] = React.useState<
    string[]
  >([])
  const [feedbackByMessageId, setFeedbackByMessageId] = React.useState<
    Record<string, FeedbackRating>
  >({})
  const [pendingFeedbackId, setPendingFeedbackId] = React.useState<
    string | null
  >(null)
  const [isLoadingSession, setIsLoadingSession] = React.useState(
    Boolean(token)
  )
  const [isLoadingMessages, setIsLoadingMessages] = React.useState(false)
  const [isStreaming, setIsStreaming] = React.useState(false)
  const [isUploading, setIsUploading] = React.useState(false)
  const [isSavingProject, setIsSavingProject] = React.useState(false)
  const [isSavingSettings, setIsSavingSettings] = React.useState(false)
  const [isCreatingProject, setIsCreatingProject] = React.useState(false)
  const [isLoadingMoreDocs, setIsLoadingMoreDocs] = React.useState(false)
  const [isLoadingMoreConversations, setIsLoadingMoreConversations] =
    React.useState(false)

  const activeProject = projects.find((project) => project.id === activeProjectId)
  const completedDocumentIds = new Set(
    documents
      .filter((document) => document.status === "completed")
      .map((document) => document.id)
  )
  const scopedDocumentIds = selectedDocumentIds.filter((id) =>
    completedDocumentIds.has(id)
  )
  const hasScopedDocuments = scopedDocumentIds.length > 0

  const clearWorkspaceState = React.useCallback(() => {
    setUser(null)
    setProjects([])
    setActiveProjectId(null)
    setDocuments([])
    setDocumentsTotal(0)
    setConversations([])
    setConversationsTotal(0)
    setActiveConversationId(null)
    setMessages([])
    setSources([])
    setSelectedDocumentIds([])
    setFeedbackByMessageId({})
    setPendingFeedbackId(null)
  }, [])

  const clearSession = React.useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(TOKEN_KEY)
      window.localStorage.removeItem(ACTIVE_PROJECT_KEY)
    }
    setToken(null)
    clearWorkspaceState()
  }, [clearWorkspaceState])

  const authedFetch = React.useCallback(
    async <T,>(path: string, init?: RequestInit) =>
      apiFetch<T>(path, token, init),
    [token]
  )

  const loadDocuments = React.useCallback(
    async (projectId: string, skip: number = 0) => {
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

  const loadConversations = React.useCallback(
    async (projectId: string, skip: number = 0) => {
      const response = await authedFetch<PaginatedResponse<Conversation>>(
        `/api/projects/${projectId}/conversations?skip=${skip}&limit=${PAGE_SIZE}`
      )
      if (skip === 0) {
        setConversations(response.items)
      } else {
        setConversations((current) => [...current, ...response.items])
      }
      setConversationsTotal(response.total)
      return response
    },
    [authedFetch]
  )

  const refreshProjectData = React.useCallback(
    async (projectId: string) => {
      const [documentResponse, conversationResponse] = await Promise.all([
        loadDocuments(projectId),
        loadConversations(projectId),
      ])
      return {
        documents: documentResponse.items,
        conversations: conversationResponse.items,
      }
    },
    [loadConversations, loadDocuments]
  )

  const listProjectDocuments = React.useCallback(
    async (projectId: string) => {
      const response = await authedFetch<PaginatedResponse<DocumentItem>>(
        `/api/projects/${projectId}/documents?skip=0&limit=100`
      )
      return response.items
    },
    [authedFetch]
  )

  const refreshSession = React.useCallback(async () => {
    const storedToken = readStoredToken()
    if (!storedToken) {
      clearWorkspaceState()
      setToken(null)
      setIsLoadingSession(false)
      return
    }

    setToken(storedToken)
    setIsLoadingSession(true)

    try {
      const [nextUser, nextProjects] = await Promise.all([
        apiFetch<User>("/api/auth/me", storedToken),
        apiFetch<Project[]>("/api/projects", storedToken),
      ])

      setUser(nextUser)
      setProjects(nextProjects)

      const storedProjectId = readStoredProjectId()
      const nextProjectId =
        nextProjects.find((project) => project.id === storedProjectId)?.id ??
        nextProjects[0]?.id ??
        null

      setActiveProjectId(nextProjectId)

      if (nextProjectId) {
        await refreshProjectData(nextProjectId)
      } else {
        setDocuments([])
        setDocumentsTotal(0)
        setConversations([])
        setConversationsTotal(0)
      }
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : "Could not load account"
      )
      clearSession()
    } finally {
      setIsLoadingSession(false)
    }
  }, [clearSession, clearWorkspaceState, refreshProjectData])

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshSession()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [refreshSession])

  React.useEffect(() => {
    if (!user?.theme_preference) {
      return
    }
    setTheme(user.theme_preference)
  }, [setTheme, user?.theme_preference])

  React.useEffect(() => {
    const hasProcessingDocuments = documents.some((document) =>
      document.status === "pending" || document.status === "processing"
    )

    if (!activeProjectId || !hasProcessingDocuments) {
      return
    }

    const interval = window.setInterval(() => {
      const limit = Math.max(documents.length, PAGE_SIZE)
      void authedFetch<PaginatedResponse<DocumentItem>>(
        `/api/projects/${activeProjectId}/documents?skip=0&limit=${limit}`
      )
        .then((response) => {
          setDocuments(response.items)
          setDocumentsTotal(response.total)
        })
        .catch((caught) => {
          console.error("Polling error", caught)
        })
    }, 2000)

    return () => window.clearInterval(interval)
  }, [activeProjectId, authedFetch, documents])

  const selectProject = React.useCallback(
    async (projectId: string, options?: { documentIds?: string[] }) => {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(ACTIVE_PROJECT_KEY, projectId)
      }

      React.startTransition(() => {
        setActiveProjectId(projectId)
        setActiveConversationId(null)
        setMessages([])
        setSources([])
        setFeedbackByMessageId({})
      })

      const { documents: nextDocuments } = await refreshProjectData(projectId)
      const completedIds = new Set(
        nextDocuments
          .filter((document) => document.status === "completed")
          .map((document) => document.id)
      )

      setSelectedDocumentIds(
        (options?.documentIds ?? []).filter((id) => completedIds.has(id))
      )
    },
    [refreshProjectData]
  )

  const createProject = React.useCallback(
    async (name: string) => {
      const trimmedName = name.trim()
      if (!trimmedName) {
        return
      }

      setIsCreatingProject(true)
      try {
        const project = await authedFetch<Project>("/api/projects", {
          method: "POST",
          body: JSON.stringify({ name: trimmedName }),
        })

        setProjects((current) => [project, ...current])
        await selectProject(project.id)
        toast.success("Project created")
      } catch (caught) {
        toast.error(
          caught instanceof Error ? caught.message : "Could not create project"
        )
      } finally {
        setIsCreatingProject(false)
      }
    },
    [authedFetch, selectProject]
  )

  const uploadDocument = React.useCallback(
    async (file: File) => {
      if (!activeProjectId) {
        return
      }

      setIsUploading(true)
      try {
        const formData = new FormData()
        formData.set("file", file)
        const document = await authedFetch<DocumentItem>(
          `/api/projects/${activeProjectId}/documents`,
          {
            method: "POST",
            body: formData,
          }
        )
        setDocuments((current) => [document, ...current])
        setDocumentsTotal((total) => total + 1)
        toast.success("Document uploaded successfully")
      } catch (caught) {
        toast.error(caught instanceof Error ? caught.message : "Upload failed")
      } finally {
        setIsUploading(false)
      }
    },
    [activeProjectId, authedFetch]
  )

  const openConversation = React.useCallback(
    async (conversationId: string) => {
      if (!activeProjectId) {
        return
      }

      setIsLoadingMessages(true)
      setActiveConversationId(conversationId)
      setMessages([])
      setSources([])

      try {
        const conversation = await authedFetch<{ messages: Message[] }>(
          `/api/projects/${activeProjectId}/conversations/${conversationId}`
        )
        setMessages(conversation.messages)
        setFeedbackByMessageId(
          Object.fromEntries(
            conversation.messages
              .map((message) => [message.id, getStoredFeedback(message)] as const)
              .filter((entry): entry is [string, FeedbackRating] =>
                Boolean(entry[0] && entry[1])
              )
          )
        )
      } catch (caught) {
        toast.error(
          caught instanceof Error
            ? caught.message
            : "Could not load conversation"
        )
      } finally {
        setIsLoadingMessages(false)
      }
    },
    [activeProjectId, authedFetch]
  )

  const prepareNewChat = React.useCallback(
    async (config: { projectId: string; documentIds: string[] }) => {
      await selectProject(config.projectId, {
        documentIds: config.documentIds,
      })
      setActiveConversationId(null)
      setMessages([])
      setSources([])
      setFeedbackByMessageId({})
    },
    [selectProject]
  )

  const submitMessage = React.useCallback(
    async (question: string) => {
      if (!question.trim() || !activeProjectId || isStreaming || !token) {
        return false
      }

      const userQuestion = question.trim()
      setIsStreaming(true)
      setSources([])
      setMessages((current) => [
        ...current,
        { role: "user", content: userQuestion } as Message,
        { role: "assistant", content: "" } as Message,
      ])

      try {
        const request: ChatRequest = {
          conversation_id: activeConversationId,
          message: userQuestion,
          document_ids: hasScopedDocuments ? scopedDocumentIds : null,
        }

        const response = await fetch(apiUrl(`/api/projects/${activeProjectId}/chat`), {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(request),
        })

        if (!response.ok || !response.body) {
          let message = "Chat failed"
          try {
            const payload = JSON.parse(await response.text()) as {
              detail?: string
            }
            message = payload.detail || message
          } catch {
            // Keep the generic message if the backend did not return JSON.
          }
          throw new Error(message)
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""

        while (true) {
          const { value, done } = await reader.read()
          if (done) {
            break
          }

          buffer += decoder.decode(value, { stream: true })
          const parsed = parseSseEvents(buffer)
          buffer = parsed.rest

          for (const eventChunk of parsed.events) {
            if (eventChunk.event === "conversation") {
              const conversation = JSON.parse(eventChunk.data) as Conversation
              setActiveConversationId(conversation.id)
            }
            if (eventChunk.event === "sources") {
              setSources(JSON.parse(eventChunk.data) as Source[])
            }
            if (eventChunk.event === "token") {
              const tokenChunk = JSON.parse(eventChunk.data) as string
              setMessages((current) => {
                const next = [...current]
                const last = next[next.length - 1]
                next[next.length - 1] = {
                  ...last,
                  content: `${last.content}${tokenChunk}`,
                }
                return next
              })
            }
            if (eventChunk.event === "final") {
              const payload = JSON.parse(eventChunk.data) as {
                message_id: string
                content: string
              }
              setMessages((current) => {
                const next = [...current]
                const last = next[next.length - 1]
                next[next.length - 1] = {
                  ...last,
                  id: payload.message_id,
                  content: payload.content,
                }
                return next
              })
            }
            if (eventChunk.event === "error") {
              const payload = JSON.parse(eventChunk.data) as { detail: string }
              throw new Error(payload.detail)
            }
          }
        }

        await loadConversations(activeProjectId)
        return true
      } catch (caught) {
        toast.error(caught instanceof Error ? caught.message : "Chat failed")
        setMessages((current) => current.slice(0, Math.max(0, current.length - 1)))
        return false
      } finally {
        setIsStreaming(false)
      }
    },
    [
      activeConversationId,
      activeProjectId,
      hasScopedDocuments,
      isStreaming,
      loadConversations,
      scopedDocumentIds,
      token,
    ]
  )

  const toggleDocumentScope = React.useCallback((documentId: string) => {
    setSelectedDocumentIds((current) => {
      if (current.includes(documentId)) {
        return current.filter((id) => id !== documentId)
      }
      return [...current, documentId]
    })
  }, [])

  const clearDocumentScope = React.useCallback(() => {
    setSelectedDocumentIds([])
  }, [])

  const sendFeedback = React.useCallback(
    async (messageId: string, rating: FeedbackRating) => {
      if (!activeProjectId) {
        return
      }

      setPendingFeedbackId(messageId)
      try {
        await authedFetch<{ status: string }>(
          `/api/projects/${activeProjectId}/chat/messages/${messageId}/feedback`,
          {
            method: "POST",
            body: JSON.stringify({ rating } satisfies FeedbackRequest),
          }
        )
        setFeedbackByMessageId((current) => ({ ...current, [messageId]: rating }))
        setMessages((current) =>
          current.map((message) => {
            if (message.id !== messageId) {
              return message
            }
            return {
              ...message,
              metadata_: {
                ...message.metadata_,
                feedback: { rating, comment: null },
              },
            }
          })
        )
        toast.success("Feedback saved")
      } catch (caught) {
        toast.error(
          caught instanceof Error ? caught.message : "Could not save feedback"
        )
      } finally {
        setPendingFeedbackId(null)
      }
    },
    [activeProjectId, authedFetch]
  )

  const updateProjectSettings = React.useCallback(
    async (systemPrompt: string | null) => {
      if (!activeProjectId) {
        return
      }

      setIsSavingProject(true)
      try {
        const project = await authedFetch<Project>(
          `/api/projects/${activeProjectId}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              system_prompt: systemPrompt?.trim() || null,
            }),
          }
        )

        setProjects((current) =>
          current.map((item) => (item.id === project.id ? project : item))
        )
        toast.success("Project prompt saved")
      } catch (caught) {
        toast.error(
          caught instanceof Error
            ? caught.message
            : "Could not save project prompt"
        )
      } finally {
        setIsSavingProject(false)
      }
    },
    [activeProjectId, authedFetch]
  )

  const updateUserSettings = React.useCallback(
    async (updates: UserSettingsUpdate) => {
      if (!token) {
        return null
      }

      setIsSavingSettings(true)
      try {
        if (updates.theme_preference) {
          setTheme(updates.theme_preference)
        }

        const nextUser = await authedFetch<User>("/api/auth/me", {
          method: "PATCH",
          body: JSON.stringify(updates),
        })
        setUser(nextUser)
        toast.success("Settings saved")
        return nextUser
      } catch (caught) {
        toast.error(
          caught instanceof Error ? caught.message : "Could not save settings"
        )
        return null
      } finally {
        setIsSavingSettings(false)
      }
    },
    [authedFetch, setTheme, token]
  )

  const loadMoreDocuments = React.useCallback(async () => {
    if (!activeProjectId || documents.length >= documentsTotal) {
      return
    }

    setIsLoadingMoreDocs(true)
    try {
      await loadDocuments(activeProjectId, documents.length)
    } catch {
      toast.error("Failed to load more documents")
    } finally {
      setIsLoadingMoreDocs(false)
    }
  }, [activeProjectId, documents.length, documentsTotal, loadDocuments])

  const loadMoreConversations = React.useCallback(async () => {
    if (!activeProjectId || conversations.length >= conversationsTotal) {
      return
    }

    setIsLoadingMoreConversations(true)
    try {
      await loadConversations(activeProjectId, conversations.length)
    } catch {
      toast.error("Failed to load more conversations")
    } finally {
      setIsLoadingMoreConversations(false)
    }
  }, [
    activeProjectId,
    conversations.length,
    conversationsTotal,
    loadConversations,
  ])

  const signOut = React.useCallback(() => {
    clearSession()
  }, [clearSession])

  const value = React.useMemo<WorkspaceContextValue>(
    () => ({
      token,
      user,
      projects,
      activeProjectId,
      activeProject,
      documents,
      documentsTotal,
      conversations,
      conversationsTotal,
      activeConversationId,
      messages,
      sources,
      selectedDocumentIds,
      feedbackByMessageId,
      pendingFeedbackId,
      isLoadingSession,
      isLoadingMessages,
      isStreaming,
      isUploading,
      isSavingProject,
      isSavingSettings,
      isCreatingProject,
      isLoadingMoreDocs,
      isLoadingMoreConversations,
      scopedDocumentIds,
      hasScopedDocuments,
      signOut,
      refreshSession,
      createProject,
      selectProject,
      loadMoreDocuments,
      loadMoreConversations,
      listProjectDocuments,
      uploadDocument,
      openConversation,
      prepareNewChat,
      submitMessage,
      toggleDocumentScope,
      clearDocumentScope,
      sendFeedback,
      updateProjectSettings,
      updateUserSettings,
    }),
    [
      token,
      user,
      projects,
      activeProjectId,
      activeProject,
      documents,
      documentsTotal,
      conversations,
      conversationsTotal,
      activeConversationId,
      messages,
      sources,
      selectedDocumentIds,
      feedbackByMessageId,
      pendingFeedbackId,
      isLoadingSession,
      isLoadingMessages,
      isStreaming,
      isUploading,
      isSavingProject,
      isSavingSettings,
      isCreatingProject,
      isLoadingMoreDocs,
      isLoadingMoreConversations,
      scopedDocumentIds,
      hasScopedDocuments,
      signOut,
      refreshSession,
      createProject,
      selectProject,
      loadMoreDocuments,
      loadMoreConversations,
      listProjectDocuments,
      uploadDocument,
      openConversation,
      prepareNewChat,
      submitMessage,
      toggleDocumentScope,
      clearDocumentScope,
      sendFeedback,
      updateProjectSettings,
      updateUserSettings,
    ]
  )

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const value = React.useContext(WorkspaceContext)
  if (!value) {
    throw new Error("useWorkspace must be used inside WorkspaceProvider")
  }
  return value
}
