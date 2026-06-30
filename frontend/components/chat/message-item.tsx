"use client"

import * as React from "react"
import { CheckIcon, CopyIcon, ThumbsUpIcon, ThumbsDownIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { type Message } from "@/lib/api"

interface MessageItemProps {
  message: Message
  index: number
  isStreaming: boolean
  feedbackRating: "up" | "down" | null
  isPendingFeedback: boolean
  onFeedback: (rating: "up" | "down") => void
  onCitationClick: (index: number) => void
}

// fallow-ignore-next-line complexity
export function MessageItem({
  message,
  index,
  isStreaming,
  feedbackRating,
  isPendingFeedback,
  onFeedback,
  onCitationClick,
}: MessageItemProps) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = () => {
    void navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true)
      toast.success("Message copied to clipboard")
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const renderMessageContent = (content: string) => {
    if (!content) return ""
    const regex = /(\[\d+\])/g
    const parts = content.split(regex)
    return parts.map((part, idx) => {
      if (regex.test(part)) {
        const match = part.match(/\d+/)
        const refIndex = match ? parseInt(match[0], 10) - 1 : 0
        return (
          <button
            key={idx}
            onClick={() => onCitationClick(refIndex)}
            className="mx-0.5 inline-flex h-5 w-5 items-center justify-center rounded bg-primary/10 font-mono text-[11px] font-bold text-primary hover:bg-primary/20 hover:text-primary transition-colors cursor-pointer align-middle"
          >
            {refIndex + 1}
          </button>
        )
      }
      return part
    })
  }

  return (
    <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
      <div className="flex max-w-[84%] flex-col gap-1">
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            message.role === "user"
              ? "rounded-tr-none bg-primary text-primary-foreground"
              : "rounded-tl-none border bg-muted shadow-sm"
          }`}
        >
          {message.content ? (
            <div className="whitespace-pre-wrap">{renderMessageContent(message.content)}</div>
          ) : message.role === "assistant" && isStreaming ? (
            <span className="flex h-5 items-center gap-1">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/50 [animation-delay:-0.3s]"></span>
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/50 [animation-delay:-0.15s]"></span>
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/50"></span>
            </span>
          ) : (
            ""
          )}
        </div>

        {message.role === "assistant" && message.id && (
          <div className="flex items-center justify-between w-full px-1">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="icon-sm"
                variant={feedbackRating === "up" ? "default" : "ghost"}
                disabled={isPendingFeedback}
                aria-label="Mark answer helpful"
                onClick={() => onFeedback("up")}
              >
                {feedbackRating === "up" ? (
                  <CheckIcon data-icon="inline-start" className="h-3.5 w-3.5" />
                ) : (
                  <ThumbsUpIcon data-icon="inline-start" className="h-3.5 w-3.5" />
                )}
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant={feedbackRating === "down" ? "destructive" : "ghost"}
                disabled={isPendingFeedback}
                aria-label="Mark answer unhelpful"
                onClick={() => onFeedback("down")}
              >
                <ThumbsDownIcon data-icon="inline-start" className="h-3.5 w-3.5" />
              </Button>
            </div>

            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Copy message content"
              onClick={handleCopy}
              className="text-muted-foreground hover:text-foreground h-7 px-2 text-xs"
            >
              {copied ? (
                <span className="flex items-center gap-1">
                  <CheckIcon className="h-3 w-3 text-green-500" /> Copied
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <CopyIcon className="h-3 w-3" /> Copy
                </span>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
