"use client"

import { AnimatePresence } from "framer-motion"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { WelcomeSuggestions } from "@/components/chat/welcome-suggestions"
import { MessageBubble } from "@/components/chat/message-bubble"
interface Message {
  id?: string
  role: string
  content: string
}

interface Source {
  document_id: string
  filename: string
  content: string
  score: number
  image_path: string | null
  image_caption: string | null
}

interface Document {
  id: string
  filename: string
}

interface MessageListProps {
  messages: Message[]
  sources: Source[]
  documents: Document[]
  isLoadingMessages: boolean
  isStreaming: boolean
  executingNode: string | null
  feedbackByMessageId: Record<string, string>
  pendingFeedbackId: string | null
  expandedSourceId: string | null
  activeProjectId?: string | null
  activeProjectName?: string | null
  conversationsTotal: number
  onToggleSources: (messageId: string) => void
  onSendFeedback: (messageId: string, type: "up" | "down") => void
  onSourceClick: (messageId: string) => void
  onSuggestionClick: (text: string) => void
}

export function MessageList({
  messages,
  sources,
  documents,
  isLoadingMessages,
  isStreaming,
  executingNode,
  feedbackByMessageId,
  pendingFeedbackId,
  expandedSourceId,
  activeProjectId,
  activeProjectName,
  conversationsTotal,
  onToggleSources,
  onSendFeedback,
  onSourceClick,
  onSuggestionClick,
}: MessageListProps) {
  return (
    <ScrollArea className="flex-1 px-8 py-6">
      <div className="max-w-3xl mx-auto space-y-6 pb-48 pr-2">
        <AnimatePresence mode="popLayout">
          {!messages.length && !isLoadingMessages && (
            <WelcomeSuggestions
              projectName={activeProjectName}
              onSuggestionClick={onSuggestionClick}
            />
          )}

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
            messages.map((message, index) => (
              <MessageBubble
                key={message.id || `${message.role}-${index}`}
                message={message}
                index={index}
                messages={messages}
                sources={sources}
                documents={documents}
                isStreaming={isStreaming}
                executingNode={executingNode}
                feedbackByMessageId={feedbackByMessageId}
                pendingFeedbackId={pendingFeedbackId}
                expandedSourceId={expandedSourceId}
                activeProjectId={activeProjectId}
                onToggleSources={onToggleSources}
                onSendFeedback={onSendFeedback}
                onSourceClick={onSourceClick}
              />
            ))
          )}
        </AnimatePresence>

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
  )
}
