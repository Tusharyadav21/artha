"use client"

import * as React from "react"
import {
  BotIcon,
  ChevronDownIcon,
  Loader2Icon,
  SparklesIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { renderMessageContent } from "@/components/chat/message-utils"

const nodeLabels: Record<string, string> = {
  analyze_query: "Analyzing query",
  retrieve: "Retrieving documents",
  rerank: "Reranking sources",
  quality_gate: "Evaluating context quality",
  hyde_expand: "Expanding query",
  compress: "Compressing context",
  compose_prompt: "Thinking",
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

interface MessageBubbleProps {
  message: { id?: string; role: string; content: string }
  index: number
  messages: Array<{ id?: string; role: string; content: string }>
  sources: Source[]
  documents: Document[]
  isStreaming: boolean
  executingNode: string | null
  feedbackByMessageId: Record<string, string>
  pendingFeedbackId: string | null
  expandedSourceId: string | null
  activeProjectId?: string | null
  onToggleSources: (messageId: string) => void
  onSendFeedback: (messageId: string, type: "up" | "down") => void
  onSourceClick: (messageId: string) => void
}

export function MessageBubble({
  message,
  index,
  messages,
  sources,
  documents,
  isStreaming,
  executingNode,
  feedbackByMessageId,
  pendingFeedbackId,
  expandedSourceId,
  activeProjectId,
  onToggleSources,
  onSendFeedback,
  onSourceClick,
}: MessageBubbleProps) {
  const isUser = message.role === "user"
  const isLast = index === messages.length - 1
  const hasSources = !isUser && isLast && sources.length > 0

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      key={message.id || `${message.role}-${index}`}
      className={cn("flex w-full gap-4", isUser ? "justify-end" : "justify-start")}
    >
      {!isUser && (
        <div className="size-8 rounded-full bg-transparent text-foreground flex items-center justify-center shrink-0 select-none mt-1">
          <SparklesIcon className="size-5 text-orange-400" />
        </div>
      )}

      <div className="flex max-w-[85%] flex-col gap-1 w-full">
        {!isUser && hasSources && (
          <div className="mb-2">
            <button
              onClick={() => onToggleSources(message.id!)}
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
                          <span className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md shrink-0">
                            {Math.round(source.score * 100)}% Match
                          </span>
                        </div>
                        {source.image_caption !== null && (
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
          {renderMessageContent(message.content, documents, onSourceClick, message.id)}

          {!isUser && isStreaming && isLast && !message.content && (
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
                  onClick={() => void onSendFeedback(message.id!, "up")}
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
                  onClick={() => void onSendFeedback(message.id!, "down")}
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
}
