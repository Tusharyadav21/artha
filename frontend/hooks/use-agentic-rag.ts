"use client"

import * as React from "react"
import { toast } from "sonner"
import {
  apiUrl,
  apiFetch,
  type ChangePasswordRequest,
  type ChatRequest,
  type Conversation,
  type DocumentItem,
  type FeedbackRequest,
  type Message,
  type PaginatedResponse,
  type Project,
  type Source,
  type TokenResponse,
  type User,
} from "@/lib/api"

const TOKEN_KEY = "agentic-rag-token"
const OLLAMA_SETTINGS_KEY = "agentic-rag-ollama-config"
const PAGE_SIZE = 10

export interface OllamaSettings {
  mode: "local" | "cloud"
  localModel: string
  cloudModel: string
  embedModel: string
  numCtx: number
  numPredict: number
}

export const DEFAULT_OLLAMA_SETTINGS: OllamaSettings = {
  mode: "local",
  localModel: "qwen2.5:3b",
  cloudModel: "qwen3-coder-next:cloud",
  embedModel: "nomic-embed-text",
  numCtx: 4096,
  numPredict: 512,
}

interface StreamEvent {
  event: string
  data: string
}

type FeedbackRating = FeedbackRequest["rating"]

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

function statusVariant(status: DocumentItem["status"]) {
  if (status === "completed") {
    return "default"
  }
  if (status === "failed") {
    return "destructive"
  }
  return "secondary"
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

export function useAgenticRag() {
  const [token, setToken] = React.useState<string | null>(() => {
    if (typeof window === "undefined" || !window.localStorage) {
      return null
    }
    return window.localStorage.getItem(TOKEN_KEY)
  })

  const [ollamaSettings, setOllamaSettings] = React.useState<OllamaSettings>(() => {
    if (typeof window === "undefined" || !window.localStorage) {
      return DEFAULT_OLLAMA_SETTINGS
    }
    const stored = window.localStorage.getItem(OLLAMA_SETTINGS_KEY)
    if (!stored) return DEFAULT_OLLAMA_SETTINGS
    try {
      return { ...DEFAULT_OLLAMA_SETTINGS, ...JSON.parse(stored) }
    } catch {
      return DEFAULT_OLLAMA_SETTINGS
    }
  })

  React.useEffect(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(OLLAMA_SETTINGS_KEY, JSON.stringify(ollamaSettings))
    }
  }, [ollamaSettings])

  const [user, setUser] = React.useState<User | null>(null)
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [isRegistering, setIsRegistering] = React.useState(false)
  const [isForgotPassword, setIsForgotPassword] = React.useState(false)

  const [projects, setProjects] = React.useState<Project[]>([])
  const [activeProjectId, setActiveProjectId] = React.useState<string | null>(
    null
  )
  const [projectName, setProjectName] = React.useState("")
  const [systemPrompt, setSystemPrompt] = React.useState("")

  const [documents, setDocuments] = React.useState<DocumentItem[]>([])
  const [documentsTotal, setDocumentsTotal] = React.useState(0)
  const [selectedDocumentIds, setSelectedDocumentIds] = React.useState<
    string[]
  >([])

  const [conversations, setConversations] = React.useState<Conversation[]>([])
  const [conversationsTotal, setConversationsTotal] = React.useState(0)

  const [activeConversationId, setActiveConversationId] = React.useState<
    string | null
  >(null)
  const [messages, setMessages] = React.useState<Message[]>([])
  const [sources, setSources] = React.useState<Source[]>([])
  const [question, setQuestion] = React.useState("")
  const [searchConversationQuery, setSearchConversationQuery] = React.useState("")
  const [isConversationsCollapsed, setIsConversationsCollapsed] = React.useState(false)
  const [copiedMessageId, setCopiedMessageId] = React.useState<string | null>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const [isMobileProjectsOpen, setIsMobileProjectsOpen] = React.useState(false)
  const [isMobileDocsOpen, setIsMobileDocsOpen] = React.useState(false)

  const [isLoading, setIsLoading] = React.useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = React.useState(false)
  const [isStreaming, setIsStreaming] = React.useState(false)
  const [isUploading, setIsUploading] = React.useState(false)
  const [isLoadingMoreDocs, setIsLoadingMoreDocs] = React.useState(false)
  const [isLoadingMoreConvos, setIsLoadingMoreConvos] = React.useState(false)
  const [isSavingProject, setIsSavingProject] = React.useState(false)
  const [feedbackByMessageId, setFeedbackByMessageId] = React.useState<
    Record<string, FeedbackRating>
  >({})
  const [pendingFeedbackId, setPendingFeedbackId] = React.useState<
    string | null
  >(null)

  const activeProject = projects.find(
    (project) => project.id === activeProjectId
  )
  const completedDocumentIds = new Set(
    documents
      .filter((document) => document.status === "completed")
      .map((document) => document.id)
  )
  const scopedDocumentIds = selectedDocumentIds.filter((id) =>
    completedDocumentIds.has(id)
  )
  const hasScopedDocuments = scopedDocumentIds.length > 0

  const selectedDocsData = React.useMemo(() => {
    const scoped = documents.filter((doc) => scopedDocumentIds.includes(doc.id))
    const totalKB = scoped.reduce((sum, doc) => sum + Math.ceil(doc.file_size / 1024), 0)
    const estTokens = totalKB * 250
    return { count: scoped.length, totalKB, estTokens }
  }, [documents, scopedDocumentIds])

  const totalDocumentsSizeData = React.useMemo(() => {
    const completed = documents.filter((doc) => doc.status === "completed")
    const totalKB = completed.reduce((sum, doc) => sum + Math.ceil(doc.file_size / 1024), 0)
    const estTokens = totalKB * 250
    return { count: completed.length, totalKB, estTokens }
  }, [documents])

  const filteredConversations = React.useMemo(() => {
    if (!searchConversationQuery.trim()) {
      return conversations
    }
    const query = searchConversationQuery.toLowerCase()
    return conversations.filter((c) =>
      (c.title ?? "Untitled conversation").toLowerCase().includes(query)
    )
  }, [conversations, searchConversationQuery])

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
    },
    [authedFetch]
  )

  const refreshProjectData = React.useCallback(
    async (projectId: string) => {
      await Promise.all([
        loadDocuments(projectId),
        loadConversations(projectId),
      ])
    },
    [loadDocuments, loadConversations]
  )

  React.useEffect(() => {
    const hasProcessingDocuments = documents.some((document) =>
      ["pending", "processing"].includes(document.status)
    )
    if (!activeProjectId || !hasProcessingDocuments) {
      return
    }

    const interval = globalThis.setInterval(() => {
      const limit = Math.max(documents.length, PAGE_SIZE)
      void authedFetch<PaginatedResponse<DocumentItem>>(
        `/api/projects/${activeProjectId}/documents?skip=0&limit=${limit}`
      )
        .then((res) => {
          setDocuments(res.items)
          setDocumentsTotal(res.total)
        })
        .catch((caught) => {
          console.error("Polling error", caught)
        })
    }, 2000)

    return () => globalThis.clearInterval(interval)
  }, [activeProjectId, authedFetch, documents])

  React.useEffect(() => {
    if (!token) {
      return
    }

    async function load() {
      setIsLoading(true)
      try {
        const [nextUser, nextProjects] = await Promise.all([
          apiFetch<User>("/api/auth/me", token),
          apiFetch<Project[]>("/api/projects", token),
        ])
        setUser(nextUser)
        setProjects(nextProjects)
        const firstProjectId = nextProjects[0]?.id ?? null
        setActiveProjectId(firstProjectId)
        setSystemPrompt(nextProjects[0]?.system_prompt ?? "")
        if (firstProjectId) {
          await refreshProjectData(firstProjectId)
        }
      } catch (caught) {
        toast.error(
          caught instanceof Error ? caught.message : "Could not load account"
        )
        globalThis.localStorage.removeItem(TOKEN_KEY)
        setToken(null)
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [refreshProjectData, token])

  async function handleAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    try {
      const path = isRegistering ? "/api/auth/register" : "/api/auth/login"
      const response = await apiFetch<TokenResponse>(path, null, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      })
      globalThis.localStorage.setItem(TOKEN_KEY, response.access_token)
      setToken(response.access_token)
      setUser(response.user)
      setPassword("")  // clear password from memory after successful auth
      if (isRegistering) {
        // After registration, switch to login mode with email pre-filled
        // so the user doesn't have to re-enter their email
        setIsRegistering(false)
      }
      toast.success(
        isRegistering
          ? "Account created — you're now signed in"
          : "Signed in successfully"
      )
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : "Authentication failed"
      )
    } finally {
      setIsLoading(false)
    }
  }

  async function handleForgotPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    try {
      await apiFetch("/api/auth/forgot-password", null, {
        method: "POST",
        body: JSON.stringify({ email }),
      })
      toast.success("Reset link sent! Check the server console (development mode).")
      setIsForgotPassword(false)
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Failed to send reset link")
    } finally {
      setIsLoading(false)
    }
  }

  async function createProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!projectName.trim()) {
      return
    }
    try {
      const project = await authedFetch<Project>("/api/projects", {
        method: "POST",
        body: JSON.stringify({ name: projectName }),
      })
      setProjects((current) => [project, ...current])
      setActiveProjectId(project.id)
      setProjectName("")
      setSystemPrompt(project.system_prompt ?? "")
      setDocuments([])
      setDocumentsTotal(0)
      setConversations([])
      setConversationsTotal(0)
      setActiveConversationId(null)
      setMessages([])
      setSources([])
      setSelectedDocumentIds([])
      toast.success("Project created")
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : "Could not create project"
      )
    }
  }

  async function updateProjectSettings(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()
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
            system_prompt: systemPrompt.trim() || null,
          }),
        }
      )
      setProjects((current) =>
        current.map((item) => (item.id === project.id ? project : item))
      )
      setSystemPrompt(project.system_prompt ?? "")
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
  }

  function toggleDocumentScope(documentId: string) {
    setSelectedDocumentIds((current) => {
      if (current.includes(documentId)) {
        return current.filter((id) => id !== documentId)
      }
      return [...current, documentId]
    })
  }

  async function uploadDocument(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !activeProjectId) {
      return
    }
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.set("file", file)
      const document = await authedFetch<DocumentItem>(
        `/api/projects/${activeProjectId}/documents?embed_model=${encodeURIComponent(
          ollamaSettings.embedModel
        )}`,
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
      event.target.value = ""
    }
  }

  async function loadConversation(conversationId: string) {
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
        caught instanceof Error ? caught.message : "Could not load conversation"
      )
    } finally {
      setIsLoadingMessages(false)
    }
  }

  async function submitMessage() {
    if (!question.trim() || !activeProjectId || isStreaming) {
      return
    }

    const userQuestion = question.trim()
    setQuestion("")
    setIsStreaming(true)
    setSources([])
    setMessages((current) => [
      ...current,
      { role: "user", content: userQuestion } as Message,
      { role: "assistant", content: "" } as Message,
    ])

    let partialContent = ""  // Track streamed tokens to preserve them on error
    try {
      const request: ChatRequest = {
        conversation_id: activeConversationId,
        message: userQuestion,
        document_ids: hasScopedDocuments ? scopedDocumentIds : null,
        model: ollamaSettings.mode === "cloud" ? ollamaSettings.cloudModel : ollamaSettings.localModel,
        num_ctx: ollamaSettings.numCtx,
        num_predict: ollamaSettings.numPredict,
      }
      const response = await fetch(
        apiUrl(`/api/projects/${activeProjectId}/chat`),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(request),
        }
      )
      if (!response.ok || !response.body) {
        let msg = "Chat failed"
        try {
          const payload = JSON.parse(await response.text()) as {
            detail?: string
          }
          msg = payload.detail || msg
        } catch {
          // Keep the generic message if the backend did not return JSON.
        }
        throw new Error(msg)
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
            if (!activeConversationId) {
              setActiveConversationId(conversation.id)
            }
          }
          if (eventChunk.event === "sources") {
            setSources(JSON.parse(eventChunk.data) as Source[])
          }
          if (eventChunk.event === "token") {
            const tokenChunk = JSON.parse(eventChunk.data) as string
            partialContent += tokenChunk
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
    } catch (caught) {
      // If we already received some tokens, keep them visible and mark the
      // message as truncated rather than discarding everything the user saw.
      setMessages((current) => {
        const next = [...current]
        const last = next[next.length - 1]
        if (last?.role === "assistant") {
          if (partialContent.trim()) {
            // Preserve the partial response — append a truncation notice
            next[next.length - 1] = {
              ...last,
              content: partialContent + "\n\n*[Response interrupted]*",
            }
          } else {
            // Nothing was received — remove the ghost placeholder entirely
            next.splice(-1, 1)
          }
        }
        return next
      })
      toast.error(caught instanceof Error ? caught.message : "Chat failed")
    } finally {
      setIsStreaming(false)
    }
  }

  function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void submitMessage()
  }

  async function sendFeedback(messageId: string, rating: FeedbackRating) {
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
  }

  function logout() {
    globalThis.localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
    setProjects([])
    setActiveProjectId(null)
    setSelectedDocumentIds([])
    setFeedbackByMessageId({})
  }

  async function changePassword(payload: ChangePasswordRequest): Promise<boolean> {
    try {
      await authedFetch<void>("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify(payload),
      })
      toast.success("Password changed successfully")
      return true
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Failed to change password")
      return false
    }
  }

  const exportChatAsJson = () => {
    if (!activeConversationId || !messages.length) return
    const activeConvo = conversations.find(c => c.id === activeConversationId)
    const title = activeConvo?.title || "conversation"
    const dataStr = JSON.stringify({ title, messages, exportedAt: new Date().toISOString() }, null, 2)
    const blob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_export.json`
    link.click()
    URL.revokeObjectURL(url)
    toast.success("Conversation exported as JSON")
  }

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        event.preventDefault()
        textareaRef.current?.focus()
      }
      if (event.key === "Escape") {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur()
        }
      }
    }
    globalThis.addEventListener("keydown", handleKeyDown)
    return () => globalThis.removeEventListener("keydown", handleKeyDown)
  }, [])

  return {
    token,
    setToken,
    user,
    setUser,
    email,
    setEmail,
    password,
    setPassword,
    isRegistering,
    setIsRegistering,
    isForgotPassword,
    setIsForgotPassword,
    handleForgotPassword,
    projects,
    setProjects,
    activeProjectId,
    setActiveProjectId,
    projectName,
    setProjectName,
    systemPrompt,
    setSystemPrompt,
    documents,
    setDocuments,
    documentsTotal,
    setDocumentsTotal,
    selectedDocumentIds,
    setSelectedDocumentIds,
    conversations,
    setConversations,
    conversationsTotal,
    setConversationsTotal,
    activeConversationId,
    setActiveConversationId,
    messages,
    setMessages,
    sources,
    setSources,
    question,
    setQuestion,
    searchConversationQuery,
    setSearchConversationQuery,
    isConversationsCollapsed,
    setIsConversationsCollapsed,
    copiedMessageId,
    setCopiedMessageId,
    textareaRef,
    isMobileProjectsOpen,
    setIsMobileProjectsOpen,
    isMobileDocsOpen,
    setIsMobileDocsOpen,
    isLoading,
    setIsLoading,
    isLoadingMessages,
    setIsLoadingMessages,
    isStreaming,
    setIsStreaming,
    isUploading,
    setIsUploading,
    isLoadingMoreDocs,
    setIsLoadingMoreDocs,
    isLoadingMoreConvos,
    setIsLoadingMoreConvos,
    isSavingProject,
    setIsSavingProject,
    feedbackByMessageId,
    setFeedbackByMessageId,
    pendingFeedbackId,
    setPendingFeedbackId,
    activeProject,
    completedDocumentIds,
    scopedDocumentIds,
    hasScopedDocuments,
    selectedDocsData,
    totalDocumentsSizeData,
    filteredConversations,
    authedFetch,
    loadDocuments,
    loadConversations,
    refreshProjectData,
    loadConversation,
    submitMessage,
    sendMessage,
    sendFeedback,
    uploadDocument,
    updateProjectSettings,
    toggleDocumentScope,
    createProject,
    handleAuth,
    logout,
    changePassword,
    exportChatAsJson,
    statusVariant,
    ollamaSettings,
    setOllamaSettings,
  }
}
