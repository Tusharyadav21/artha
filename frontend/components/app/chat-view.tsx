"use client"

import * as React from "react"
import {
  ArrowUpIcon,
  BotIcon,
  FileTextIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  MessageSquarePlusIcon,
  UploadIcon,
  SaveIcon,
  LibraryIcon,
} from "lucide-react"

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
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/app/ui-tooltip"
import { EmptyState } from "@/components/layout/empty-state"
import { motion, AnimatePresence } from "framer-motion"
import { fadeUp, stagger, fadeIn } from "@/lib/motion"
import { cn } from "@/lib/utils"

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

function MessageSkeleton({ role }: { role: "user" | "assistant" }) {
  return (
    <div className={cn("flex w-full mb-6", role === "user" ? "justify-end" : "justify-start")}>
      <div className={cn(
        "max-w-[80%] rounded-2xl p-4",
        role === "user" ? "bg-primary/10 rounded-tr-none" : "bg-muted/40 rounded-tl-none"
      )}>
        <Skeleton className="h-4 w-48 mb-2" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  )
}

function statusVariant(status: "pending" | "processing" | "completed" | "failed") {
  if (status === "completed") return "default"
  if (status === "failed") return "destructive"
  return "secondary"
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
        <Button type="submit" disabled={disabled} size="sm">
          <SaveIcon className="size-4 mr-2" />
          Save prompt
        </Button>
      </div>
    </form>
  )
}

export function ChatView() {
  const {
    activeProject,
    conversations,
    conversationsTotal,
    activeConversationId,
    messages,
    sources,
    feedbackByMessageId,
    pendingFeedbackId,
    isLoadingMessages,
    isStreaming,
    isLoadingMoreConversations,
    hasScopedDocuments,
    scopedDocumentIds,
    loadMoreConversations,
    openConversation,
    submitMessage,
    sendFeedback,
    documents,
    documentsTotal,
    selectedDocumentIds,
    isUploading,
    isSavingProject,
    isLoadingMoreDocs,
    toggleDocumentScope,
    clearDocumentScope,
    uploadDocument,
    loadMoreDocuments,
    updateProjectSettings,
  } = useWorkspace()
  const [question, setQuestion] = React.useState("")

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const didSend = await submitMessage(question)
    if (didSend) {
      setQuestion("")
    }
  }

  function renderFeedbackActions(messageId: string) {
    return (
      <div className="flex items-center gap-1 mt-1">
        <Tooltip>
          <TooltipTrigger>
            <Button
              type="button"
              size="icon-xs"
              variant={feedbackByMessageId[messageId] === "up" ? "default" : "ghost"}
              disabled={pendingFeedbackId === messageId}
              onClick={() => void sendFeedback(messageId, "up")}
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
              variant={feedbackByMessageId[messageId] === "down" ? "destructive" : "ghost"}
              disabled={pendingFeedbackId === messageId}
              onClick={() => void sendFeedback(messageId, "down")}
            >
              <ThumbsDownIcon className="size-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Not helpful</TooltipContent>
        </Tooltip>
      </div>
    )
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
      <Card className="min-h-[70svh]">
        <CardHeader>
          <CardTitle>Conversations</CardTitle>
          <CardDescription>
            Jump between recent chats for {activeProject?.name || "this project"}.
          </CardDescription>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 flex flex-col">
          <ScrollArea className="flex-1">
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="visible"
              className="flex flex-col gap-2"
            >
              {conversations.map((conversation) => (
                <motion.button
                  variants={fadeUp}
                  key={conversation.id}
                  type="button"
                  className={cn(
                    "rounded-xl border px-3 py-3 text-left transition group/conv",
                    activeConversationId === conversation.id
                      ? "border-primary/30 bg-primary/10"
                      : "border-transparent hover:border-border hover:bg-muted"
                  )}
                  onClick={() => void openConversation(conversation.id)}
                >
                  <span className="line-clamp-1 text-sm font-medium">
                    {conversation.title ?? "Untitled conversation"}
                  </span>
                  <span className="text-[10px] text-muted-foreground opacity-60 group-hover/conv:opacity-100 transition-opacity">
                    {formatRelativeDate(conversation.updated_at)}
                  </span>
                </motion.button>
              ))}
              {!conversations.length && !isLoadingMoreConversations ? (
                <EmptyState
                  icon={MessageSquarePlusIcon}
                  title="No chats"
                  description="Your recent conversations will appear here."
                  className="min-h-[150px] border-none bg-transparent"
                />
              ) : null}
            </motion.div>
          </ScrollArea>
          {conversations.length < conversationsTotal ? (
            <Button
              type="button"
              variant="ghost"
              className="mt-4 w-full"
              disabled={isLoadingMoreConversations}
              onClick={() => void loadMoreConversations()}
            >
              {isLoadingMoreConversations ? "Loading..." : "Load more"}
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card className="min-h-[70svh]">
        <CardHeader>
          <CardTitle>Messages</CardTitle>
          <CardDescription>
            Ask about uploaded files and the assistant will stream cited answers.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-[58svh] flex-col gap-4">
          <ScrollArea className="flex-1">
            <div className="flex flex-col gap-8 pr-1">
              <AnimatePresence mode="popLayout">
                {!messages.length && !isLoadingMessages ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex-1 flex items-center justify-center min-h-[40svh]"
                  >
                    <EmptyState
                      icon={BotIcon}
                      title="Ready for your next question"
                      description="Start a draft chat from the header, then send a message when your project context looks right."
                      className="max-w-md border-none bg-transparent"
                    />
                  </motion.div>
                ) : null}

                {isLoadingMessages ? (
                  <div className="flex w-full flex-col">
                    <MessageSkeleton role="user" />
                    <MessageSkeleton role="assistant" />
                    <MessageSkeleton role="user" />
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={message.id || `${message.role}-${index}`}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div className="flex max-w-[86%] flex-col gap-1">
                        <div
                          className={cn(
                            "rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm transition-all",
                            message.role === "user"
                              ? "rounded-tr-none bg-primary text-primary-foreground"
                              : "rounded-tl-none bg-muted/60"
                          )}
                        >
                          {message.content}
                          {message.role === "assistant" && isStreaming && index === messages.length - 1 && !message.content && (
                            <Skeleton className="h-4 w-3/4 animate-pulse opacity-50" />
                          )}
                        </div>
                        {message.role === "assistant" && message.id
                          ? renderFeedbackActions(message.id)
                          : null}
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </ScrollArea>

          <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
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
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault()
                    void handleSubmit(event as unknown as React.FormEvent<HTMLFormElement>)
                  }
                }}
                placeholder={
                  activeProject
                    ? "Ask about this project..."
                    : "Create a project first"
                }
                disabled={!activeProject || isStreaming || isLoadingMessages}
                className="min-h-12 resize-none shadow-sm"
              />
              <Button
                size="icon-lg"
                type="submit"
                disabled={
                  !activeProject || isStreaming || !question.trim() || isLoadingMessages
                }
              >
                <ArrowUpIcon data-icon="inline-start" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="min-h-[70svh] flex flex-col">
        <Tabs defaultValue="sources" className="flex-1 flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Project Context</CardTitle>
              <TabsList className="h-8 p-1">
                <TabsTrigger value="sources" className="px-3 text-xs">
                  <FileTextIcon className="size-3 mr-1.5" />
                  Sources
                </TabsTrigger>
                <TabsTrigger value="library" className="px-3 text-xs">
                  <LibraryIcon className="size-3 mr-1.5" />
                  Library
                </TabsTrigger>
                <TabsTrigger value="prompt" className="px-3 text-xs">
                  <BotIcon className="size-3 mr-1.5" />
                  Prompt
                </TabsTrigger>
              </TabsList>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col min-h-0 pt-0">
            <TabsContent value="sources" className="flex-1 min-h-0 mt-0">
              <ScrollArea className="h-[calc(70svh-120px)]">
                <motion.div
                  variants={stagger}
                  initial="hidden"
                  animate="visible"
                  className="flex flex-col gap-3"
                >
                  {sources.map((source, index) => (
                    <motion.div
                      variants={fadeIn}
                      key={`${source.document_id}-${index}`}
                      className="rounded-xl border border-border/50 bg-card/50 px-3 py-3 shadow-sm hover:border-primary/30 transition-colors group/source"
                    >
                      <p className="flex items-center gap-2 text-xs font-medium">
                        <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                          {index + 1}
                        </Badge>
                        <span className="truncate flex-1" title={source.filename}>
                          {source.filename}
                        </span>
                      </p>
                      <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground opacity-80 group-hover/source:opacity-100 transition-opacity">
                        {source.content}
                      </p>
                    </motion.div>
                  ))}
                  {!sources.length ? (
                    <EmptyState
                      icon={FileTextIcon}
                      title="No sources"
                      description="Cited documents will appear here during the chat."
                      className="min-h-[200px] border-none bg-transparent"
                    />
                  ) : null}
                </motion.div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="library" className="flex-1 min-h-0 mt-0">
              <div className="flex flex-col gap-4">
                <label
                  className={cn(
                    "flex flex-col cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/50 px-4 py-6 text-sm transition-all duration-200",
                    isUploading ? "opacity-50" : "hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
                  )}
                >
                  <UploadIcon className="size-5 mb-1" />
                  <div className="text-center">
                    <p className="text-xs font-medium">{isUploading ? "Uploading..." : "Upload files"}</p>
                  </div>
                  <input
                    className="sr-only"
                    type="file"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (!file) return
                      void uploadDocument(file)
                      event.target.value = ""
                    }}
                    disabled={!activeProject || isUploading}
                  />
                </label>

                <ScrollArea className="h-[calc(70svh-280px)]">
                  <motion.div
                    variants={stagger}
                    initial="hidden"
                    animate="visible"
                    className="flex flex-col gap-2"
                  >
                    {documents.map((document) => {
                      const isSelected = selectedDocumentIds.includes(document.id)
                      return (
                        <motion.div
                          variants={fadeUp}
                          key={document.id}
                          className={cn(
                            "rounded-xl border bg-card/50 p-3 shadow-sm transition-all",
                            isSelected ? "border-primary/40 bg-primary/5" : "border-border/50"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[11px] font-medium" title={document.filename}>
                                {document.filename}
                              </p>
                              <p className="text-[9px] text-muted-foreground mt-0.5">
                                {formatRelativeDate(document.created_at || new Date().toISOString())}
                              </p>
                            </div>
                            <Badge variant={statusVariant(document.status)} className="h-4 px-1 text-[9px]">
                              {document.status}
                            </Badge>
                          </div>

                          {document.status === "completed" && (
                            <div className="mt-2 flex justify-end">
                              <Button
                                type="button"
                                size="xs"
                                variant={isSelected ? "default" : "outline"}
                                className="h-6 text-[9px] px-2"
                                onClick={() => toggleDocumentScope(document.id)}
                              >
                                {isSelected ? "Unscope" : "Scope"}
                              </Button>
                            </div>
                          )}
                        </motion.div>
                      )
                    })}
                    {!documents.length && (
                      <EmptyState
                        icon={UploadIcon}
                        title="No documents"
                        description="Upload files to start."
                        className="min-h-[150px] border-none bg-transparent"
                      />
                    )}
                  </motion.div>
                  {documents.length < documentsTotal ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-2 w-full text-xs"
                      disabled={isLoadingMoreDocs}
                      onClick={() => void loadMoreDocuments()}
                    >
                      {isLoadingMoreDocs ? "Loading..." : "Load more"}
                    </Button>
                  ) : null}
                </ScrollArea>
              </div>
            </TabsContent>

            <TabsContent value="prompt" className="flex-1 min-h-0 mt-0">
              <ProjectPromptForm
                key={activeProject?.id ?? "no-project"}
                disabled={!activeProject || isSavingProject}
                initialPrompt={activeProject?.system_prompt ?? ""}
                onSave={updateProjectSettings}
              />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  )
}
