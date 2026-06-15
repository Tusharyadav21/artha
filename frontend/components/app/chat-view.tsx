"use client"

import * as React from "react"
import {
  ArrowUpIcon,
  BotIcon,
  FileTextIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  UploadIcon,
  SaveIcon,
  LibraryIcon,
  GlobeIcon,
  HistoryIcon,
  SparklesIcon,
  ChevronDownIcon,
  ArrowLeftIcon,
  Loader2Icon,
  Trash2Icon
} from "lucide-react"
import { useSearchParams } from "next/navigation"

import { useWorkspace } from "@/components/app/workspace-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/app/ui-tooltip"
import { toast } from "@/components/ui/toast"
import { cn } from "@/lib/utils"
import { MAX_UPLOAD_SIZE, ACCEPTED_FILE_TYPES } from "@/lib/constants"
import { motion, AnimatePresence } from "framer-motion"

// Helper to format bytes nicely
function formatBytes(bytes: number, decimals = 1) {
  if (!bytes) return "0 KB"
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
}

// Helper for relative dates
function formatRelativeDate(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInHours = diffInMs / (1000 * 60 * 60)

  if (diffInHours < 24) {
    if (diffInHours < 1) {
      const mins = Math.floor(diffInMs / (1000 * 60))
      return `${mins}m ago`
    }
    return `${Math.floor(diffInHours)}h ago`
  }
  if (diffInHours < 48) return "Yesterday"
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date)
}

// Helper to derive document type icon styling
// fallow-ignore-next-line complexity
function getDocumentTypeMeta(filename: string, fileSize: number) {
  const ext = filename.split(".").pop()?.toLowerCase() || ""
  if (ext === "pdf") {
    return {
      label: "PDF",
      bgClass: "bg-red-950/40 text-red-400 border border-red-800/40",
      iconColor: "text-red-500",
      typeLabel: "PDF",
      pagesLabel: `${Math.max(1, Math.ceil(fileSize / 48000))} pages`,
      chunks: Math.max(12, Math.ceil(fileSize / 16000)),
    }
  }
  if (["xlsx", "xls", "csv"].includes(ext)) {
    return {
      label: "XLS",
      bgClass: "bg-emerald-950/40 text-emerald-400 border border-emerald-800/40",
      iconColor: "text-emerald-500",
      typeLabel: "sheets",
      pagesLabel: `${Math.max(1, Math.ceil(fileSize / 64000))} sheets`,
      chunks: Math.max(6, Math.ceil(fileSize / 12000)),
    }
  }
  if (["pptx", "ppt"].includes(ext)) {
    return {
      label: "PPT",
      bgClass: "bg-blue-950/40 text-blue-400 border border-blue-800/40",
      iconColor: "text-blue-500",
      typeLabel: "slides",
      pagesLabel: `${Math.max(4, Math.ceil(fileSize / 120000))} slides`,
      chunks: Math.max(15, Math.ceil(fileSize / 24000)),
    }
  }
  return {
    label: "TXT",
    bgClass: "bg-zinc-800/80 text-zinc-400 border border-zinc-700/50",
    iconColor: "text-zinc-400",
    typeLabel: "lines",
    pagesLabel: `${Math.max(1, Math.ceil(fileSize / 8000))} lines`,
    chunks: Math.max(2, Math.ceil(fileSize / 4000)),
  }
}

const nodeLabels: Record<string, string> = {
  analyze_query: "Analyzing query",
  retrieve: "Retrieving documents",
  rerank: "Reranking sources",
  quality_gate: "Evaluating context quality",
  hyde_expand: "Expanding query",
  compress: "Compressing context",
  compose_prompt: "Thinking",
}

// fallow-ignore-next-line complexity
export function ChatView() {
  const searchParams = useSearchParams()
  const searchQuery = searchParams?.get("search") || ""

  const {
    activeProject,
    conversations,
    activeConversationId,
    messages,
    sources,
    feedbackByMessageId,
    pendingFeedbackId,
    isLoadingMessages,
    isStreaming,
    executingNode,
    openConversation,
    submitMessage,
    sendFeedback,
    documents,
    documentsTotal,
    selectedDocumentIds,
    activeProjectId,
    conversationsTotal,
    isUploading,
    isSavingProject,
    toggleDocumentScope,
    uploadDocument,
    deleteDocument,
    updateProjectSettings,
  } = useWorkspace()

  // Center column tabs
  const [centerTab, setCenterTab] = React.useState<"chat" | "sources" | "history" | "prompts">("chat")

  const [isCanvasMode, setIsCanvasMode] = React.useState(false)
  const [expandedSourceId, setExpandedSourceId] = React.useState<string | null>(null)

  const [question, setQuestion] = React.useState("")
  const [webSearchEnabled, setWebSearchEnabled] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Filter conversations in history view based on search query in the URL
  const filteredConversations = React.useMemo(() => {
    if (!searchQuery.trim()) return conversations
    return conversations.filter((c) =>
      (c.title || "Untitled conversation").toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [conversations, searchQuery])

  // Get active documents in context (either scoped ones, or all completed if none scoped)
  const activeInContextDocuments = React.useMemo(() => {
    const completedDocs = documents.filter((doc) => doc.status === "completed")
    const scoped = completedDocs.filter((doc) => selectedDocumentIds.includes(doc.id))
    return scoped.length > 0 ? scoped : completedDocs
  }, [documents, selectedDocumentIds])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!question.trim()) return
    const currentQuestion = question
    setQuestion("")
    await submitMessage(currentQuestion)
    // Expand sources automatically for the new message if any citations are expected (mocked)
    setExpandedSourceId(null)
  }

  // Trigger file upload
  const handleAddSourceClick = () => {
    fileInputRef.current?.click()
  }

  // Handle uploaded file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_UPLOAD_SIZE) {
      toast.error("File exceeds the 10MB limit")
      e.target.value = ""
      return
    }
    void uploadDocument(file)
    e.target.value = ""
  }

  // Parse message content to add inline source pills
  const renderMessageContent = (content: string, messageId?: string) => {
    if (!content) return ""

    return content.split("\n").map((line, lineIdx) => {
      let elements: React.ReactNode[] = [line]

      documents.forEach((doc) => {
        const name = doc.filename
        const parts: React.ReactNode[] = []

        elements.forEach((el) => {
          if (typeof el !== "string") {
            parts.push(el)
            return
          }

          const regex = new RegExp(`(${name.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")}(?:\\s+p\\.\\d+)?)`, "g")
          const subparts = el.split(regex)
          subparts.forEach((sub, subIdx) => {
            if (regex.test(sub)) {
              parts.push(
                <Badge
                  key={`${doc.id}-${lineIdx}-${subIdx}`}
                  variant="secondary"
                  className="bg-blue-600/15 hover:bg-blue-600/30 text-blue-400 border border-blue-500/20 px-2 py-0.5 text-[11px] font-semibold inline-flex items-center gap-1 rounded mx-0.5 cursor-pointer"
                  onClick={() => {
                    if (messageId) setExpandedSourceId(messageId)
                  }}
                >
                  <FileTextIcon className="size-3 shrink-0" />
                  {sub}
                </Badge>
              )
            } else {
              parts.push(sub)
            }
          })
        })
        elements = parts
      })

      // Add dummy citation brackets [1] [2] rendering
      let finalElements: React.ReactNode[] = []
      elements.forEach(el => {
        if (typeof el !== "string") {
          finalElements.push(el)
          return
        }
        const citRegex = /(\[\d+\])/g
        const citParts = el.split(citRegex)
        citParts.forEach((part, partIdx) => {
          if (citRegex.test(part)) {
            finalElements.push(
              <sup
                key={`cit-${lineIdx}-${partIdx}`}
                className="cursor-pointer text-emerald-400 hover:text-emerald-300 mx-0.5 font-bold"
                onClick={() => {
                  if (messageId) setExpandedSourceId(messageId)
                }}
              >
                {part}
              </sup>
            )
          } else {
            finalElements.push(part)
          }
        })
      })

      return (
        <p key={lineIdx} className={cn("mb-2.5 last:mb-0 leading-relaxed font-sans text-[13.5px]", line === "" && "h-2")}>
          {finalElements}
        </p>
      )
    })
  }

  return (
    <div className="flex-1 flex overflow-hidden h-full bg-background min-h-0 relative">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept={ACCEPTED_FILE_TYPES}
      />

      {/* Main Center Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Tab View Container */}
        <div className="flex-1 overflow-hidden min-h-0 flex flex-col">

          {/* A. CHAT VIEW TAB */}
          {centerTab === "chat" && (
            <div className="flex-1 flex flex-col overflow-hidden min-h-0 relative bg-background">
              {isCanvasMode ? (
                <div className="flex-1 flex h-full">
                  <div className="w-1/2 border-r border-border h-full flex flex-col p-6">
                    <div className="flex-1 border border-dashed border-border rounded-xl flex items-center justify-center text-muted-foreground text-sm font-medium">
                      Conversation History
                    </div>
                  </div>
                  <div className="w-1/2 h-full flex flex-col p-6 bg-card">
                    <div className="flex-1 border border-border bg-muted rounded-xl flex items-center justify-center text-muted-foreground text-sm font-medium shadow-sm">
                      Generated Canvas Content
                    </div>
                  </div>
                </div>
              ) : (
                <ScrollArea className="flex-1 px-8 py-6">
                  <div className="max-w-3xl mx-auto space-y-6 pb-48 pr-2">
                    <AnimatePresence mode="popLayout">
                      {/* Welcome / Empty State */}
                      {!messages.length && !isLoadingMessages && (
                        <motion.div
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="py-16 text-left max-w-2xl mx-auto"
                        >
                          <h2 className="text-2xl font-semibold text-foreground tracking-tight mb-3">
                            Hello, {activeProject?.name || "Project"}
                          </h2>
                          <p className="text-sm text-muted-foreground leading-relaxed mb-8 max-w-lg">
                            Ask questions about your documents, analyze sources, or create summaries.
                          </p>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-4 rounded-xl border border-border bg-muted/50 hover:bg-muted transition cursor-pointer group">
                              <p className="text-xs font-semibold text-foreground group-hover:text-primary transition mb-1">Summarize Kubernetes</p>
                              <p className="text-[10px] text-muted-foreground">Give me a quick rundown of K8s networking.</p>
                            </div>
                            <div className="p-4 rounded-xl border border-border bg-muted/50 hover:bg-muted transition cursor-pointer group">
                              <p className="text-xs font-semibold text-foreground group-hover:text-primary transition mb-1">Explain RBAC</p>
                              <p className="text-[10px] text-muted-foreground">Detail how RoleBindings control access.</p>
                            </div>
                            <div className="p-4 rounded-xl border border-border bg-muted/50 hover:bg-muted transition cursor-pointer group">
                              <p className="text-xs font-semibold text-foreground group-hover:text-primary transition mb-1">Compare Deployments</p>
                              <p className="text-[10px] text-muted-foreground">Vs StatefulSets for DBs.</p>
                            </div>
                            <div className="p-4 rounded-xl border border-border bg-muted/50 hover:bg-muted transition cursor-pointer group">
                              <p className="text-xs font-semibold text-foreground group-hover:text-primary transition mb-1">Create Interview Questions</p>
                              <p className="text-[10px] text-muted-foreground">Based on the uploaded cheat sheet.</p>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Loader */}
                      {isLoadingMessages ? (
                        <div className="space-y-6 py-4">
                          <div className="flex justify-end w-full">
                            <div className="max-w-[75%] rounded-3xl p-4 bg-muted border border-transparent">
                              <Skeleton className="h-4 w-48 mb-2" />
                              <Skeleton className="h-4 w-32" />
                            </div>
                          </div>
                          <div className="flex justify-start w-full gap-3">
                            <Skeleton className="size-8 rounded-full" />
                            <div className="max-w-[75%] rounded-3xl p-4 bg-transparent border border-transparent">
                              <Skeleton className="h-4 w-64 mb-2" />
                              <Skeleton className="h-4 w-52 mb-2" />
                              <Skeleton className="h-4 w-40" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        // fallow-ignore-next-line complexity
                        messages.map((message, index) => {
                          const isUser = message.role === "user"
                          const hasSources = !isUser && index === messages.length - 1 && sources.length > 0

                          return (
                            <motion.div
                              layout
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              key={message.id || `${message.role}-${index}`}
                              className={cn(
                                "flex w-full gap-4",
                                isUser ? "justify-end" : "justify-start"
                              )}
                            >
                              {/* Assistant Avatar */}
                              {!isUser && (
                                <div className="size-8 rounded-full bg-transparent text-foreground flex items-center justify-center shrink-0 select-none mt-1">
                                  <SparklesIcon className="size-5 text-orange-400" />
                                </div>
                              )}

                              <div className="flex max-w-[85%] flex-col gap-1 w-full">

                                {/* AI Thought Process Accordion (Claude style) */}
                                {!isUser && hasSources && (
                                  <div className="mb-2">
                                    <button
                                      onClick={() => setExpandedSourceId(expandedSourceId === message.id ? null : message.id!)}
                                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                                    >
                                      <div className="size-6 rounded-full bg-muted flex items-center justify-center group-hover:bg-muted-foreground/20 transition-colors">
                                        <BotIcon className="size-3.5" />
                                      </div>
                                      <span className="font-medium">Analyzed {sources.length} sources and {documents.length} documents</span>
                                      <ChevronDownIcon className={cn("size-3.5 transition-transform duration-200", expandedSourceId === message.id && "rotate-180")} />
                                    </button>

                                    <AnimatePresence>
                                      {expandedSourceId === message.id && (
                                        <motion.div
                                          initial={{ height: 0, opacity: 0 }}
                                          animate={{ height: "auto", opacity: 1 }}
                                          exit={{ height: 0, opacity: 0 }}
                                          className="overflow-hidden ml-8 mt-2"
                                        >
                                          <div className="pt-2 pb-1 space-y-3 px-1 max-w-[95%]">
                                            {sources.map((source, idx) => (
                                              <div key={idx} className="rounded-xl border border-border bg-card p-4 shadow-sm text-left group transition hover:border-muted-foreground/50">
                                                <div className="flex items-center justify-between mb-3 select-none">
                                                  <div className="flex items-center gap-2">
                                                    <Badge variant="secondary" className="bg-muted text-[10px] px-2 py-0.5 border border-border font-bold text-foreground rounded-md">
                                                      [{idx + 1}]
                                                    </Badge>
                                                    <span className="text-[12px] font-semibold text-foreground truncate max-w-[300px]">
                                                      {source.filename}
                                                    </span>
                                                  </div>
                                                  {source.score !== undefined && (
                                                    <span className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md shrink-0">
                                                      {Math.round(source.score * 100)}% Match
                                                    </span>
                                                  )}
                                                </div>
                                                {source.image_caption && (
                                                  <div className="mb-3 rounded-lg overflow-hidden border border-border bg-muted">
                                                    <img
                                                      src={`/api/projects/${activeProjectId}/documents/${source.document_id}/file`}
                                                      alt={source.image_caption}
                                                      className="w-full h-auto max-h-64 object-contain"
                                                      loading="lazy"
                                                    />
                                                    <div className="px-3 py-2 text-[11px] text-muted-foreground bg-background/80 border-t border-border">
                                                      {source.image_caption}
                                                    </div>
                                                  </div>
                                                )}
                                                <div className="text-[12px] text-muted-foreground leading-relaxed font-sans bg-background border border-border p-3 rounded-lg italic">
                                                  &ldquo;{source.content.length > 400 ? `${source.content.slice(0, 400)}...` : source.content}&rdquo;
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                )}

                                <div
                                  className={cn(
                                    "px-5 py-3.5 leading-relaxed text-[15px] transition-all duration-200 inline-block w-fit",
                                    isUser
                                      ? "bg-muted text-foreground rounded-3xl self-end"
                                      : "bg-transparent text-foreground self-start max-w-full px-0"
                                  )}
                                >
                                  {renderMessageContent(message.content, message.id)}

                                  {/* Streaming skeletal text */}
                                  {!isUser && isStreaming && index === messages.length - 1 && !message.content && (
                                    <div className="flex flex-col gap-2">
                                      {executingNode && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium bg-muted/50 w-fit px-3 py-1.5 rounded-full border border-border">
                                          <Loader2Icon className="size-3.5 animate-spin text-primary" />
                                          {nodeLabels[executingNode] || "Processing"}...
                                        </div>
                                      )}
                                      <Skeleton className="h-4 w-64 animate-pulse opacity-50 bg-muted mt-2" />
                                    </div>
                                  )}
                                </div>

                                {/* Assistant Message Actions (Thumbs) */}
                                {!isUser && message.id && (
                                  <div className="flex items-center gap-2 mt-1 opacity-70 hover:opacity-100 transition-opacity">
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <Button
                                          type="button"
                                          size="icon-xs"
                                          variant={feedbackByMessageId[message.id] === "up" ? "default" : "ghost"}
                                          className={cn(
                                            "size-6 text-muted-foreground hover:text-foreground",
                                            feedbackByMessageId[message.id] === "up" && "bg-primary/10 text-primary"
                                          )}
                                          disabled={pendingFeedbackId === message.id}
                                          onClick={() => void sendFeedback(message.id!, "up")}
                                        >
                                          <ThumbsUpIcon className="size-3" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Helpful</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <Button
                                          type="button"
                                          size="icon-xs"
                                          variant={feedbackByMessageId[message.id] === "down" ? "destructive" : "ghost"}
                                          className={cn(
                                            "size-6 text-muted-foreground hover:text-foreground",
                                            feedbackByMessageId[message.id] === "down" && "bg-destructive/10 text-destructive"
                                          )}
                                          disabled={pendingFeedbackId === message.id}
                                          onClick={() => void sendFeedback(message.id!, "down")}
                                        >
                                          <ThumbsDownIcon className="size-3" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Not helpful</TooltipContent>
                                    </Tooltip>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )
                        })
                      )}
                    </AnimatePresence>

                    {/* Conversation insights footer */}
                    {messages.length > 0 && (
                      <div className="pt-4 pb-2 border-t border-border/40">
                        <div className="flex items-center gap-4 text-[11px] text-muted-foreground/60">
                          <span>{messages.length} message{messages.length !== 1 ? "s" : ""}</span>
                          <span className="size-1 rounded-full bg-muted-foreground/20" />
                          <span>{documents.length} document{documents.length !== 1 ? "s" : ""} in scope</span>
                          {sources.length > 0 && (
                            <>
                              <span className="size-1 rounded-full bg-muted-foreground/20" />
                              <span>{sources.length} source{sources.length !== 1 ? "s" : ""} retrieved</span>
                            </>
                          )}
                          <span className="size-1 rounded-full bg-muted-foreground/20" />
                          <span>{conversationsTotal} total conversation{conversationsTotal !== 1 ? "s" : ""}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}

              {/* Floating Chat Input Area */}
              {!isCanvasMode && (
                <div className="absolute bottom-6 left-0 right-0 px-8 pointer-events-none">
                  <div className="max-w-3xl mx-auto flex flex-col gap-2 pointer-events-auto">
                    {/* Context Chips directly above input */}
                    {activeInContextDocuments.length > 0 && (
                      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                        {activeInContextDocuments.map(doc => {
                          const meta = getDocumentTypeMeta(doc.filename, doc.file_size)
                          return (
                            <div key={doc.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-card border border-border shadow-sm shrink-0 hover:bg-muted transition cursor-pointer" onClick={() => setCenterTab("sources")}>
                              <FileTextIcon className="size-3 text-primary" />
                              <span className="text-[11px] font-medium text-foreground truncate max-w-[120px]">{doc.filename}</span>
                              <div className="size-1.5 rounded-full bg-primary shrink-0 ml-1" />
                            </div>
                          )
                        })}
                      </div>
                    )}

                    <form
                      onSubmit={handleSubmit}
                      className="flex flex-col gap-2 p-3 bg-muted rounded-3xl shadow-sm transition duration-200"
                    >
                      <Textarea
                        value={question}
                        onChange={(event) => setQuestion(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault()
                            void handleSubmit(event as unknown as React.FormEvent<HTMLFormElement>)
                          }
                        }}
                        placeholder="Ask anything... @sources"
                        disabled={!activeProject || isStreaming || isLoadingMessages}
                        className="min-h-12 max-h-48 w-full resize-none bg-transparent border-none outline-none shadow-none focus-visible:ring-0 p-1 px-2 text-[15px] text-foreground placeholder-muted-foreground/60"
                      />

                      {/* Input Actions Footer Bar */}
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-2">
                          {/* Attach button trigger */}
                          <Tooltip>
                            <TooltipTrigger>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="text-[11px] h-8 text-muted-foreground hover:text-foreground hover:bg-background/50 font-medium px-2 rounded-lg flex items-center gap-1.5 shrink-0"
                                onClick={() => {
                                  setCenterTab("sources")
                                }}
                              >
                                <LibraryIcon className="size-3.5" />
                                Library
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Manage sources</TooltipContent>
                          </Tooltip>

                          {/* Web Search toggle */}
                          <Tooltip>
                            <TooltipTrigger>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className={cn(
                                  "text-[11px] h-8 font-medium px-2 rounded-lg flex items-center gap-1.5 shrink-0 transition-colors",
                                  webSearchEnabled
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                                )}
                                onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                              >
                                <GlobeIcon className="size-3.5" />
                                Web
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Toggle Google search</TooltipContent>
                          </Tooltip>
                        </div>

                        {/* Send Button */}
                        <Button
                          size="icon-sm"
                          type="submit"
                          disabled={!activeProject || isStreaming || !question.trim() || isLoadingMessages}
                          className={cn(
                            "size-8 rounded-full flex items-center justify-center transition-all duration-200",
                            question.trim()
                              ? "bg-foreground text-background hover:bg-foreground/90 shadow-sm"
                              : "bg-background text-muted-foreground"
                          )}
                        >
                          <ArrowUpIcon className="size-4 shrink-0" />
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* B. HISTORY VIEW TAB */}
          {centerTab === "history" && (
            <div className="flex-1 overflow-hidden min-h-0 p-6 bg-background">
              <div className="max-w-3xl mx-auto h-full flex flex-col">
                <div className="flex items-center justify-between mb-6 select-none shrink-0">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Past Chats ({filteredConversations.length})
                  </h3>
                  {searchQuery && (
                    <Badge variant="secondary" className="bg-muted text-muted-foreground border border-border text-[10px]">
                      Filter: &ldquo;{searchQuery}&rdquo;
                    </Badge>
                  )}
                </div>

                <ScrollArea className="flex-1">
                  <div className="space-y-3 pr-2">
                    {filteredConversations.map((conversation) => (
                      <button
                        key={conversation.id}
                        onClick={() => {
                          void openConversation(conversation.id)
                          setCenterTab("chat")
                        }}
                        className={cn(
                          "w-full rounded-2xl border p-4 text-left transition duration-150 flex items-start justify-between gap-4 group",
                          activeConversationId === conversation.id
                            ? "border-primary/30 bg-primary/10 hover:bg-primary/20"
                            : "border-border bg-card hover:bg-muted"
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition">
                            {conversation.title ?? "Untitled conversation"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 font-medium">
                            Created {new Date(conversation.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="text-[11px] font-medium text-muted-foreground shrink-0 bg-background border border-border px-2.5 py-1 rounded-lg group-hover:border-muted-foreground/30 transition">
                          {formatRelativeDate(conversation.updated_at)}
                        </span>
                      </button>
                    ))}

                    {!filteredConversations.length && (
                      <div className="py-20 text-center select-none">
                        <HistoryIcon className="size-10 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <p className="text-sm font-semibold text-foreground">No chats found</p>
                        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                          {searchQuery ? "Try clearing your search query in the sidebar." : "Select the project in the sidebar and begin a new chat!"}
                        </p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}

          {/* C. PROMPTS VIEW TAB */}
          {centerTab === "prompts" && (
            <div className="flex-1 overflow-hidden min-h-0 p-6 bg-background">
              <div className="max-w-3xl mx-auto h-full flex flex-col">
                <div className="mb-6 select-none shrink-0">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    System Prompt Builder
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                    Set a customized instruction guidelines that drives the behavior of the AI assistant for this workspace.
                  </p>
                </div>

                <div className="flex-1 bg-card border border-border rounded-2xl p-5 flex flex-col overflow-hidden min-h-0 shadow-sm">
                  <form
                    onSubmit={(event) => {
                      event.preventDefault()
                      const form = event.currentTarget
                      const text = new FormData(form).get("systemPrompt") as string
                      void updateProjectSettings(text)
                    }}
                    className="flex-1 flex flex-col gap-4 min-h-0"
                  >
                    <Textarea
                      name="systemPrompt"
                      defaultValue={activeProject?.system_prompt ?? ""}
                      disabled={!activeProject || isSavingProject}
                      placeholder="Enter custom assistant rules (e.g. 'You are a financial analyst...')"
                      className="flex-1 resize-none bg-muted border border-border rounded-xl p-4 text-sm leading-relaxed text-foreground placeholder-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary min-h-0 shadow-inner"
                    />

                    <div className="flex justify-end gap-3 shrink-0 select-none pt-2">
                      <Button
                        type="submit"
                        disabled={!activeProject || isSavingProject}
                        size="sm"
                        className="bg-primary text-primary-foreground hover:bg-primary/90 px-5 flex items-center gap-2 h-9 text-xs font-bold rounded-xl shadow-sm"
                      >
                        {isSavingProject ? (
                          "Saving..."
                        ) : (
                          <>
                            <SaveIcon className="size-4" />
                            Save instructions
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* D. SOURCES & LIBRARY TAB */}
          {centerTab === "sources" && (
            <div className="flex-1 overflow-hidden min-h-0 p-6 bg-background">
              <div className="max-w-4xl mx-auto h-full flex flex-col gap-6">

                {/* Back Button Row */}
                <div className="shrink-0">
                  <Button
                    variant="ghost"
                    onClick={() => setCenterTab("chat")}
                    className="text-muted-foreground hover:text-foreground -ml-4"
                  >
                    <ArrowLeftIcon className="size-4 mr-2" />
                    Back to Chat
                  </Button>
                </div>

                <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0">
                  {/* Active Context Col */}
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
                              <div className={cn(
                                "size-10 rounded-lg flex items-center justify-center font-bold text-[11px] shrink-0 border",
                                meta.bgClass
                              )}>
                                {meta.label}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p
                                  className="text-[13px] font-semibold text-foreground truncate mb-1"
                                  title={doc.filename}
                                >
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

                  {/* Library Col */}
                  <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-card border border-border rounded-2xl p-5 shadow-sm">
                    <div className="mb-4 shrink-0 flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Project Library
                        </h4>
                        <p className="text-[11px] text-muted-foreground mt-1">Upload and manage all files</p>
                      </div>
                      <label
                        onClick={handleAddSourceClick}
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
                        {documents.map(
                          // fallow-ignore-next-line complexity
                          (doc) => {
                            const isSelected = selectedDocumentIds.includes(doc.id)
                            const isProcessing = doc.status === "pending" || doc.status === "processing"

                            return (
                              <div
                                key={doc.id}
                                className={cn(
                                  "rounded-xl border p-3.5 flex flex-col transition duration-150 shadow-sm",
                                  isSelected
                                    ? "border-primary/30 bg-primary/10"
                                    : "border-border bg-background hover:bg-muted"
                                )}
                              >
                                <div className="flex items-center justify-between gap-3 min-w-0">
                                  <div className="min-w-0 flex-1 leading-normal">
                                    <p
                                      className="text-[13px] font-semibold text-foreground truncate mb-0.5"
                                      title={doc.filename}
                                    >
                                      {doc.filename}
                                    </p>
                                    <div className="flex items-center gap-2">
                                      <p className="text-[11px] text-muted-foreground font-medium">
                                        {formatBytes(doc.file_size)}
                                      </p>
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
                                        onClick={() => toggleDocumentScope(doc.id)}
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
                                          deleteDocument(doc.id)
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
          )}
        </div>
      </div>
    </div>
  )
}
