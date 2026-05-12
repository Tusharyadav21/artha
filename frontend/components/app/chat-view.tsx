"use client"

import * as React from "react"
import {
  ArrowUpIcon,
  BotIcon,
  CheckIcon,
  FileTextIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
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
      <div className="flex items-center gap-1">
        <Button
          type="button"
          size="icon-sm"
          variant={feedbackByMessageId[messageId] === "up" ? "default" : "ghost"}
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

  return (
    <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
      <Card className="min-h-[70svh]">
        <CardHeader>
          <CardTitle>Conversations</CardTitle>
          <CardDescription>
            Jump between recent chats for {activeProject?.name || "this project"}.
          </CardDescription>
        </CardHeader>
        <CardContent className="min-h-0">
          <ScrollArea className="flex max-h-[58svh] flex-col gap-2">
            <div className="flex flex-col gap-2">
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  className={`rounded-xl border px-3 py-3 text-left text-sm transition ${
                    activeConversationId === conversation.id
                      ? "border-primary/30 bg-primary/10"
                      : "hover:bg-muted"
                  }`}
                  onClick={() => void openConversation(conversation.id)}
                >
                  <span className="line-clamp-2">
                    {conversation.title ?? "Untitled conversation"}
                  </span>
                </button>
              ))}
              {!conversations.length ? (
                <div className="rounded-xl border border-dashed px-3 py-4 text-sm text-muted-foreground">
                  Conversations will appear here after your first message.
                </div>
              ) : null}
            </div>
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
            <div className="flex flex-col gap-4 pr-1">
              {!messages.length && !isLoadingMessages ? (
                <Card className="border-dashed bg-muted/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <BotIcon data-icon="inline-start" className="text-primary" />
                      Ready for your next question
                    </CardTitle>
                    <CardDescription>
                      Start a draft chat from the header, then send a message when
                      your project context looks right.
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
                </div>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className="flex max-w-[86%] flex-col gap-1">
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
                              <span className="size-1.5 animate-bounce rounded-full bg-foreground/50 [animation-delay:-0.3s]"></span>
                              <span className="size-1.5 animate-bounce rounded-full bg-foreground/50 [animation-delay:-0.15s]"></span>
                              <span className="size-1.5 animate-bounce rounded-full bg-foreground/50"></span>
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

      <Card className="min-h-[70svh]">
        <CardHeader>
          <CardTitle>Retrieved sources</CardTitle>
          <CardDescription>
            Citation snippets surface here as the answer streams.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[58svh]">
            <div className="flex flex-col gap-3">
              {sources.map((source, index) => (
                <div
                  key={`${source.document_id}-${index}`}
                  className="rounded-xl border bg-card px-3 py-3 shadow-sm"
                >
                  <p className="flex items-center gap-2 text-xs font-medium">
                    <FileTextIcon
                      data-icon="inline-start"
                      className="text-muted-foreground"
                    />
                    [{index + 1}]{" "}
                    <span className="truncate">{source.filename}</span>
                  </p>
                  <p className="mt-2 line-clamp-5 text-xs leading-relaxed text-muted-foreground">
                    {source.content}
                  </p>
                </div>
              ))}
              {!sources.length ? (
                <div className="flex h-24 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                  Sources appear here once the assistant retrieves them.
                </div>
              ) : null}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
