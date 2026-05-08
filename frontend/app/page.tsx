"use client"

import * as React from "react"
import {
  ArrowUpIcon,
  BotIcon,
  FileTextIcon,
  FolderPlusIcon,
  LibraryIcon,
  LogOutIcon,
  MessageSquarePlusIcon,
  UploadIcon,
} from "lucide-react"

import {
  API_URL,
  apiFetch,
  type Conversation,
  type DocumentItem,
  type Message,
  type Project,
  type Source,
  type TokenResponse,
  type User,
} from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"

const TOKEN_KEY = "agentic-rag-token"

interface StreamEvent {
  event: string
  data: string
}

function parseSseEvents(buffer: string): { events: StreamEvent[]; rest: string } {
  const chunks = buffer.split("\n\n")
  const rest = chunks.pop() ?? ""
  const events = chunks
    .map((chunk) => {
      const event = chunk.match(/^event: (.*)$/m)?.[1] ?? "message"
      const data = chunk.match(/^data: (.*)$/m)?.[1] ?? ""
      return { event, data }
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
  const [activeProjectId, setActiveProjectId] = React.useState<string | null>(null)
  const [projectName, setProjectName] = React.useState("Research workspace")
  const [documents, setDocuments] = React.useState<DocumentItem[]>([])
  const [conversations, setConversations] = React.useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = React.useState<string | null>(null)
  const [messages, setMessages] = React.useState<Message[]>([])
  const [sources, setSources] = React.useState<Source[]>([])
  const [question, setQuestion] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [isStreaming, setIsStreaming] = React.useState(false)
  const activeProject = projects.find((project) => project.id === activeProjectId)

  const authedFetch = React.useCallback(
    async <T,>(path: string, init?: RequestInit) => apiFetch<T>(path, token, init),
    [token]
  )

  const refreshProjectData = React.useCallback(
    async (projectId: string) => {
      const [nextDocuments, nextConversations] = await Promise.all([
        authedFetch<DocumentItem[]>(`/api/projects/${projectId}/documents`),
        authedFetch<Conversation[]>(`/api/projects/${projectId}/conversations`),
      ])
      setDocuments(nextDocuments)
      setConversations(nextConversations)
    },
    [authedFetch]
  )

  React.useEffect(() => {
    if (!activeProjectId || !documents.some((document) => ["pending", "processing"].includes(document.status))) {
      return
    }

    const interval = window.setInterval(() => {
      void authedFetch<DocumentItem[]>(`/api/projects/${activeProjectId}/documents`)
        .then(setDocuments)
        .catch((caught) => {
          setError(caught instanceof Error ? caught.message : "Could not refresh documents")
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
      setError(null)
      try {
        const [nextUser, nextProjects] = await Promise.all([
          apiFetch<User>("/api/auth/me", token),
          apiFetch<Project[]>("/api/projects", token),
        ])
        setUser(nextUser)
        setProjects(nextProjects)
        const firstProjectId = nextProjects[0]?.id ?? null
        setActiveProjectId(firstProjectId)
        if (firstProjectId) {
          const [nextDocuments, nextConversations] = await Promise.all([
            apiFetch<DocumentItem[]>(`/api/projects/${firstProjectId}/documents`, token),
            apiFetch<Conversation[]>(`/api/projects/${firstProjectId}/conversations`, token),
          ])
          setDocuments(nextDocuments)
          setConversations(nextConversations)
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not load account")
        window.localStorage.removeItem(TOKEN_KEY)
        setToken(null)
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [token])

  async function handleAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)
    try {
      const path = isRegistering ? "/api/auth/register" : "/api/auth/login"
      const response = await apiFetch<TokenResponse>(path, null, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      })
      window.localStorage.setItem(TOKEN_KEY, response.access_token)
      setToken(response.access_token)
      setUser(response.user)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Authentication failed")
    } finally {
      setIsLoading(false)
    }
  }

  async function createProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!projectName.trim()) {
      return
    }
    const project = await authedFetch<Project>("/api/projects", {
      method: "POST",
      body: JSON.stringify({ name: projectName }),
    })
    setProjects((current) => [project, ...current])
    setActiveProjectId(project.id)
    setProjectName("")
  }

  async function uploadDocument(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !activeProjectId) {
      return
    }
    setError(null)
    try {
      const formData = new FormData()
      formData.set("file", file)
      const document = await authedFetch<DocumentItem>(`/api/projects/${activeProjectId}/documents`, {
        method: "POST",
        body: formData,
      })
      setDocuments((current) => [document, ...current])
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Upload failed")
    } finally {
      event.target.value = ""
    }
  }

  async function loadConversation(conversationId: string) {
    if (!activeProjectId) {
      return
    }
    const conversation = await authedFetch<{ messages: Message[] }>(
      `/api/projects/${activeProjectId}/conversations/${conversationId}`
    )
    setActiveConversationId(conversationId)
    setMessages(conversation.messages)
    setSources([])
  }

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!question.trim() || !activeProjectId || isStreaming) {
      return
    }

    const userQuestion = question.trim()
    setQuestion("")
    setError(null)
    setIsStreaming(true)
    setSources([])
    setMessages((current) => [
      ...current,
      { role: "user", content: userQuestion },
      { role: "assistant", content: "" },
    ])

    try {
      const response = await fetch(`${API_URL}/api/projects/${activeProjectId}/chat`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversation_id: activeConversationId,
          message: userQuestion,
        }),
      })
      if (!response.ok || !response.body) {
        throw new Error(await response.text())
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
              next[next.length - 1] = { ...last, content: `${last.content}${tokenChunk}` }
              return next
            })
          }
          if (eventChunk.event === "error") {
            const payload = JSON.parse(eventChunk.data) as { detail: string }
            throw new Error(payload.detail)
          }
        }
      }

      await refreshProjectData(activeProjectId)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Chat failed")
    } finally {
      setIsStreaming(false)
    }
  }

  function logout() {
    window.localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
    setProjects([])
    setActiveProjectId(null)
  }

  if (!token || !user) {
    return (
      <main className="min-h-svh bg-[radial-gradient(circle_at_top_left,var(--color-primary)/12,transparent_32rem)] p-6">
        <div className="mx-auto flex min-h-[calc(100svh-3rem)] max-w-6xl items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-2xl">Agentic RAG</CardTitle>
              <CardDescription>
                Sign in to create local-first project workspaces, upload files, and chat with them.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="flex flex-col gap-3" onSubmit={handleAuth}>
                <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" />
                <Input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password"
                  type="password"
                />
                {error ? <p className="text-destructive text-sm">{error}</p> : null}
                <Button disabled={isLoading} type="submit">
                  {isRegistering ? "Create account" : "Sign in"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsRegistering((current) => !current)}
                >
                  {isRegistering ? "Use existing account" : "Create a new account"}
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
        <aside className="border-border bg-sidebar/70 flex flex-col gap-5 border-r p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs">Signed in as</p>
              <p className="truncate text-sm font-medium">{user.email}</p>
            </div>
            <Button size="icon-sm" variant="ghost" onClick={logout} aria-label="Log out">
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
                    project.id === activeProjectId ? "bg-card shadow-sm" : "hover:bg-muted"
                  }`}
                  onClick={() => {
                    setActiveProjectId(project.id)
                    setActiveConversationId(null)
                    setMessages([])
                    setSources([])
                    void refreshProjectData(project.id).catch((caught) => {
                      setError(caught instanceof Error ? caught.message : "Could not load project")
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
                <p className="text-muted-foreground rounded-lg border p-3 text-sm">
                  Create your first project to start.
                </p>
              ) : null}
              {isLoading ? <Skeleton className="h-16" /> : null}
            </div>
          </ScrollArea>
        </aside>

        <section className="flex min-h-svh flex-col">
          <header className="border-border flex items-center justify-between border-b p-4">
            <div>
              <h1 className="text-xl font-semibold">{activeProject?.name ?? "No project selected"}</h1>
              <p className="text-muted-foreground text-sm">
                Upload project files, then ask questions with cited retrieval context.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setActiveConversationId(null)
                setMessages([])
                setSources([])
              }}
            >
              <MessageSquarePlusIcon data-icon="inline-start" />
              New chat
            </Button>
          </header>

          <ScrollArea className="flex-1 p-4">
            <div className="mx-auto flex max-w-3xl flex-col gap-4">
              {!messages.length ? (
                <Card className="border-dashed">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BotIcon data-icon="inline-start" />
                      Ready when your documents are.
                    </CardTitle>
                    <CardDescription>
                      Ask a question after uploading a TXT, Markdown, CSV, JSON, PDF, or DOCX file. The assistant
                      streams its response and shows retrieved snippets in the side panel.
                    </CardDescription>
                  </CardHeader>
                </Card>
              ) : null}

              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[84%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}
                  >
                    {message.content || (message.role === "assistant" && isStreaming ? "Thinking..." : "")}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <form className="border-border bg-background border-t p-4" onSubmit={sendMessage}>
            <div className="mx-auto flex max-w-3xl gap-3">
              <Textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder={activeProjectId ? "Ask about this project..." : "Create a project first"}
                disabled={!activeProjectId || isStreaming}
                className="min-h-12 resize-none"
              />
              <Button
                size="icon-lg"
                type="submit"
                disabled={!activeProjectId || isStreaming || !question.trim()}
              >
                <ArrowUpIcon data-icon="inline-start" />
              </Button>
            </div>
            {error ? <p className="text-destructive mx-auto mt-2 max-w-3xl text-sm">{error}</p> : null}
          </form>
        </section>

        <aside className="border-border bg-card/40 flex flex-col gap-5 border-l p-4">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>Files are processed by Redis workers and embedded with Ollama.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <label className="border-border hover:bg-muted flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed p-4 text-sm">
                <UploadIcon data-icon="inline-start" />
                Upload file
                <input className="sr-only" type="file" onChange={uploadDocument} disabled={!activeProjectId} />
              </label>
              <div className="flex flex-col gap-2">
                {documents.map((document) => (
                  <div key={document.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{document.filename}</p>
                        <p className="text-muted-foreground text-xs">{Math.ceil(document.file_size / 1024)} KB</p>
                      </div>
                      <Badge variant={statusVariant(document.status)}>{document.status}</Badge>
                    </div>
                    {document.error_message ? (
                      <p className="text-destructive mt-2 text-xs">{document.error_message}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="flex min-h-0 flex-1 flex-col">
            <CardHeader>
              <CardTitle>Conversations</CardTitle>
              <CardDescription>Resume any thread in this project.</CardDescription>
            </CardHeader>
            <CardContent className="min-h-0">
              <ScrollArea className="max-h-52">
                <div className="flex flex-col gap-2">
                  {conversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      className={`rounded-lg border p-3 text-left text-sm ${
                        activeConversationId === conversation.id ? "bg-muted" : "hover:bg-muted"
                      }`}
                      onClick={() => void loadConversation(conversation.id)}
                    >
                      {conversation.title ?? "Untitled conversation"}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
            <Separator />
            <CardHeader>
              <CardTitle>Retrieved Sources</CardTitle>
              <CardDescription>Snippets used for the latest answer.</CardDescription>
            </CardHeader>
            <CardContent className="min-h-0">
              <ScrollArea className="max-h-72">
                <div className="flex flex-col gap-3">
                  {sources.map((source, index) => (
                    <div key={`${source.document_id}-${index}`} className="rounded-lg border p-3">
                      <p className="flex items-center gap-2 text-sm font-medium">
                        <FileTextIcon data-icon="inline-start" />
                        [{index + 1}] {source.filename}
                      </p>
                      <p className="text-muted-foreground mt-2 line-clamp-5 text-xs leading-relaxed">
                        {source.content}
                      </p>
                    </div>
                  ))}
                  {!sources.length ? (
                    <p className="text-muted-foreground text-sm">Sources appear after a chat response starts.</p>
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
