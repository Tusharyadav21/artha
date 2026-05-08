"use client"

import * as React from "react"
import {
  ArrowUpIcon,
  BotIcon,
  CheckIcon,
  FileTextIcon,
  FolderPlusIcon,
  LibraryIcon,
  LogOutIcon,
  MessageSquarePlusIcon,
  SaveIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  UploadIcon,
} from "lucide-react"
import { toast } from "sonner"

import {
  apiUrl,
  apiFetch,
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"

const TOKEN_KEY = "agentic-rag-token"
const PAGE_SIZE = 10

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

export default function Page() {
  const [token, setToken] = React.useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null
    }
    return window.localStorage.getItem(TOKEN_KEY)
  })
  const [user, setUser] = React.useState<User | null>(null)
  const [email, setEmail] = React.useState("demo@example.com")
  const [password, setPassword] = React.useState("local-first-rag")
  const [isRegistering, setIsRegistering] = React.useState(false)

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

    const interval = window.setInterval(() => {
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

    return () => window.clearInterval(interval)
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
        window.localStorage.removeItem(TOKEN_KEY)
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
      window.localStorage.setItem(TOKEN_KEY, response.access_token)
      setToken(response.access_token)
      setUser(response.user)
      toast.success(
        isRegistering
          ? "Account created successfully"
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

    try {
      const request: ChatRequest = {
        conversation_id: activeConversationId,
        message: userQuestion,
        document_ids: hasScopedDocuments ? scopedDocumentIds : null,
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
    window.localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
    setProjects([])
    setActiveProjectId(null)
    setSelectedDocumentIds([])
    setFeedbackByMessageId({})
  }

  function renderFeedbackActions(messageId: string) {
    return (
      <div className="flex items-center gap-1">
        <Button
          type="button"
          size="icon-sm"
          variant={
            feedbackByMessageId[messageId] === "up" ? "default" : "ghost"
          }
          disabled={pendingFeedbackId === messageId}
          aria-label="Mark answer helpful"
          onClick={() => void sendFeedback(messageId, "up")}
        >
          {feedbackByMessageId[messageId] === "up" ? (
            <CheckIcon data-icon="inline-start" />
          ) : (
            <ThumbsUpIcon data-icon="inline-start" />
          )}
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant={
            feedbackByMessageId[messageId] === "down" ? "destructive" : "ghost"
          }
          disabled={pendingFeedbackId === messageId}
          aria-label="Mark answer unhelpful"
          onClick={() => void sendFeedback(messageId, "down")}
        >
          <ThumbsDownIcon data-icon="inline-start" />
        </Button>
      </div>
    )
  }

  if (!token || !user) {
    return (
      <main className="min-h-svh bg-[radial-gradient(circle_at_top_left,var(--color-primary)/12,transparent_32rem)] p-6">
        <div className="mx-auto flex min-h-[calc(100svh-3rem)] max-w-6xl items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-2xl">Agentic RAG</CardTitle>
              <CardDescription>
                Sign in to create local-first project workspaces, upload files,
                and chat with them.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="flex flex-col gap-3" onSubmit={handleAuth}>
                <Input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email"
                />
                <Input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password"
                  type="password"
                />
                <Button disabled={isLoading} type="submit">
                  {isLoading
                    ? "Please wait..."
                    : isRegistering
                      ? "Create account"
                      : "Sign in"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsRegistering((current) => !current)}
                >
                  {isRegistering
                    ? "Use existing account"
                    : "Create a new account"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-svh bg-background">
      <div className="grid min-h-svh grid-cols-1 lg:grid-cols-[320px_1fr_360px]">
        <aside className="flex flex-col gap-5 border-r border-border bg-sidebar/70 p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">Signed in as</p>
              <p className="truncate text-sm font-medium">{user.email}</p>
            </div>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={logout}
              aria-label="Log out"
            >
              <LogOutIcon data-icon="inline-start" />
            </Button>
          </div>

          <form className="flex gap-2" onSubmit={createProject}>
            <Input
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              placeholder="New project"
            />
            <Button size="icon" type="submit" aria-label="Create project">
              <FolderPlusIcon data-icon="inline-start" />
            </Button>
          </form>

          <ScrollArea className="flex-1">
            <div className="flex flex-col gap-2">
              {projects.map((project) => (
                <button
                  key={project.id}
                  className={`rounded-lg border p-3 text-left text-sm transition ${
                    project.id === activeProjectId
                      ? "bg-card shadow-sm"
                      : "hover:bg-muted"
                  }`}
                  onClick={() => {
                    React.startTransition(() => {
                      setActiveProjectId(project.id)
                      setSystemPrompt(project.system_prompt ?? "")
                      setActiveConversationId(null)
                      setMessages([])
                      setSources([])
                      setSelectedDocumentIds([])
                      setFeedbackByMessageId({})
                    })
                    void refreshProjectData(project.id).catch((caught) => {
                      toast.error(
                        caught instanceof Error
                          ? caught.message
                          : "Could not load project"
                      )
                    })
                  }}
                >
                  <span className="flex items-center gap-2 font-medium">
                    <LibraryIcon data-icon="inline-start" />
                    {project.name}
                  </span>
                </button>
              ))}
              {!projects.length && !isLoading ? (
                <p className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">
                  Create your first project to start.
                </p>
              ) : null}
              {isLoading ? (
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : null}
            </div>
          </ScrollArea>
        </aside>

        <section className="flex min-h-svh flex-col">
          <header className="flex items-center justify-between border-b border-border p-4">
            <div>
              <h1 className="text-xl font-semibold">
                {activeProject?.name ?? "No project selected"}
              </h1>
              <p className="text-sm text-muted-foreground">
                Upload project files, then ask questions with cited retrieval
                context.
              </p>
            </div>
            <Button
              variant="outline"
              disabled={!activeProjectId || isLoadingMessages || isStreaming}
              onClick={() => {
                setActiveConversationId(null)
                setMessages([])
                setSources([])
                setFeedbackByMessageId({})
              }}
            >
              <MessageSquarePlusIcon data-icon="inline-start" />
              New chat
            </Button>
          </header>

          <ScrollArea className="flex-1 p-4">
            <div className="mx-auto flex max-w-3xl flex-col gap-4">
              {!messages.length && !isLoadingMessages ? (
                <Card className="border-dashed bg-muted/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <BotIcon
                        data-icon="inline-start"
                        className="text-primary"
                      />
                      Ready when your documents are.
                    </CardTitle>
                    <CardDescription>
                      Ask a question after uploading a TXT, Markdown, CSV, JSON,
                      PDF, or DOCX file. The assistant streams its response and
                      shows retrieved snippets in the side panel.
                    </CardDescription>
                  </CardHeader>
                </Card>
              ) : null}

              {isLoadingMessages ? (
                <div className="flex w-full flex-col gap-4">
                  <div className="flex justify-end">
                    <Skeleton className="h-12 w-3/4 rounded-2xl rounded-tr-none" />
                  </div>
                  <div className="flex justify-start">
                    <Skeleton className="h-24 w-3/4 rounded-2xl rounded-tl-none" />
                  </div>
                  <div className="flex justify-end">
                    <Skeleton className="h-12 w-1/2 rounded-2xl rounded-tr-none" />
                  </div>
                </div>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className="flex max-w-[84%] flex-col gap-1">
                      <div
                        className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                          message.role === "user"
                            ? "rounded-tr-none bg-primary text-primary-foreground"
                            : "rounded-tl-none border bg-muted shadow-sm"
                        }`}
                      >
                        {message.content ||
                          (message.role === "assistant" && isStreaming ? (
                            <span className="flex h-5 items-center gap-1">
                              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/50 [animation-delay:-0.3s]"></span>
                              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/50 [animation-delay:-0.15s]"></span>
                              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/50"></span>
                            </span>
                          ) : (
                            ""
                          ))}
                      </div>
                      {message.role === "assistant" && message.id
                        ? renderFeedbackActions(message.id)
                        : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          <form
            className="border-t border-border bg-background p-4"
            onSubmit={sendMessage}
          >
            <div className="mx-auto flex max-w-3xl flex-col gap-2">
              {hasScopedDocuments ? (
                <div>
                  <Badge variant="secondary">
                    {scopedDocumentIds.length} scoped document(s)
                  </Badge>
                </div>
              ) : null}
              <div className="flex gap-3">
                <Textarea
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      if (
                        !(!activeProjectId || isStreaming || !question.trim())
                      ) {
                        void submitMessage()
                      }
                    }
                  }}
                  placeholder={
                    activeProjectId
                      ? "Ask about this project..."
                      : "Create a project first"
                  }
                  disabled={
                    !activeProjectId || isStreaming || isLoadingMessages
                  }
                  className="min-h-12 resize-none shadow-sm"
                />
                <Button
                  size="icon-lg"
                  type="submit"
                  disabled={
                    !activeProjectId ||
                    isStreaming ||
                    !question.trim() ||
                    isLoadingMessages
                  }
                >
                  <ArrowUpIcon data-icon="inline-start" />
                </Button>
              </div>
            </div>
          </form>
        </section>

        <aside className="flex flex-col gap-5 border-l border-border bg-card/40 p-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Project Prompt</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="flex flex-col gap-3"
                onSubmit={updateProjectSettings}
              >
                <Textarea
                  value={systemPrompt}
                  onChange={(event) => setSystemPrompt(event.target.value)}
                  disabled={!activeProjectId || isSavingProject}
                  placeholder="Custom system prompt"
                  className="min-h-24 resize-none text-xs"
                  maxLength={4000}
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!activeProjectId || isSavingProject}
                  className="self-end"
                >
                  <SaveIcon data-icon="inline-start" />
                  {isSavingProject ? "Saving..." : "Save"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="flex max-h-[35%] min-h-[30%] flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-sm">Documents</CardTitle>
                {hasScopedDocuments ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedDocumentIds([])}
                  >
                    Clear scope
                  </Button>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
              <label
                className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border p-3 text-sm transition-colors ${isUploading ? "opacity-50" : "hover:bg-muted"}`}
              >
                <UploadIcon data-icon="inline-start" className="h-4 w-4" />
                {isUploading ? "Uploading..." : "Upload file"}
                <input
                  className="sr-only"
                  type="file"
                  onChange={uploadDocument}
                  disabled={!activeProjectId || isUploading}
                />
              </label>
              <ScrollArea className="flex-1">
                <div className="flex flex-col gap-2">
                  {documents.map((document) => (
                    <div
                      key={document.id}
                      className="rounded-lg border bg-card p-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p
                            className="truncate text-xs font-medium"
                            title={document.filename}
                          >
                            {document.filename}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {Math.ceil(document.file_size / 1024)} KB
                          </p>
                        </div>
                        <Badge
                          variant={statusVariant(document.status)}
                          className="h-4 px-1.5 py-0 text-[10px]"
                        >
                          {document.status}
                        </Badge>
                      </div>
                      {document.status === "completed" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant={
                            selectedDocumentIds.includes(document.id)
                              ? "default"
                              : "outline"
                          }
                          className="mt-2 h-7 w-full text-[11px]"
                          aria-pressed={selectedDocumentIds.includes(
                            document.id
                          )}
                          onClick={() => toggleDocumentScope(document.id)}
                        >
                          {selectedDocumentIds.includes(document.id)
                            ? "Scoped"
                            : "Use in chat"}
                        </Button>
                      ) : null}
                      {document.error_message ? (
                        <p className="mt-1 text-[10px] leading-tight text-destructive">
                          {document.error_message}
                        </p>
                      ) : null}
                    </div>
                  ))}
                  {documents.length < documentsTotal && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-1 h-8 w-full text-xs"
                      disabled={isLoadingMoreDocs}
                      onClick={async () => {
                        if (!activeProjectId) {
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
                      }}
                    >
                      {isLoadingMoreDocs ? "Loading..." : "Load more"}
                    </Button>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="flex max-h-[35%] min-h-0 flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Conversations</CardTitle>
            </CardHeader>
            <CardContent className="min-h-0 flex-1">
              <ScrollArea className="h-full">
                <div className="flex flex-col gap-2">
                  {conversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      className={`rounded-lg border p-2.5 text-left text-xs transition-colors ${
                        activeConversationId === conversation.id
                          ? "border-primary/30 bg-primary/10 font-medium"
                          : "bg-card hover:bg-muted"
                      }`}
                      onClick={() => void loadConversation(conversation.id)}
                    >
                      <span className="line-clamp-2">
                        {conversation.title ?? "Untitled conversation"}
                      </span>
                    </button>
                  ))}
                  {conversations.length < conversationsTotal && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-1 h-8 w-full text-xs"
                      disabled={isLoadingMoreConvos}
                      onClick={async () => {
                        if (!activeProjectId) {
                          return
                        }
                        setIsLoadingMoreConvos(true)
                        try {
                          await loadConversations(
                            activeProjectId,
                            conversations.length
                          )
                        } catch {
                          toast.error("Failed to load more conversations")
                        } finally {
                          setIsLoadingMoreConvos(false)
                        }
                      }}
                    >
                      {isLoadingMoreConvos ? "Loading..." : "Load more"}
                    </Button>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="flex min-h-0 flex-1 flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Retrieved Sources</CardTitle>
            </CardHeader>
            <CardContent className="min-h-0 flex-1">
              <ScrollArea className="h-full">
                <div className="flex flex-col gap-3">
                  {sources.map((source, index) => (
                    <div
                      key={`${source.document_id}-${index}`}
                      className="rounded-lg border bg-card p-3 shadow-sm"
                    >
                      <p className="flex items-center gap-2 text-xs font-medium">
                        <FileTextIcon
                          data-icon="inline-start"
                          className="h-3 w-3 text-muted-foreground"
                        />
                        [{index + 1}]{" "}
                        <span className="truncate">{source.filename}</span>
                      </p>
                      <p className="mt-2 line-clamp-4 text-[11px] leading-relaxed text-muted-foreground">
                        {source.content}
                      </p>
                    </div>
                  ))}
                  {!sources.length ? (
                    <div className="flex h-20 items-center justify-center rounded-lg border border-dashed">
                      <p className="text-xs text-muted-foreground">
                        Sources appear during chat.
                      </p>
                    </div>
                  ) : null}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  )
}
