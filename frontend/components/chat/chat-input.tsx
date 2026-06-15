"use client"

import * as React from "react"
import { ArrowUpIcon, GlobeIcon, LibraryIcon, Loader2Icon, SparklesIcon } from "lucide-react"

import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface ChatInputProps {
  question: string
  onQuestionChange: (value: string) => void
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  onLibraryClick: () => void
  isStreaming: boolean
  isLoadingMessages: boolean
  hasActiveProject: boolean
  webSearchEnabled: boolean
  onWebSearchToggle: () => void
}

export const ChatInput = React.forwardRef<HTMLFormElement, ChatInputProps>(
  function ChatInput({
    question,
    onQuestionChange,
    onSubmit,
    onLibraryClick,
    isStreaming,
    isLoadingMessages,
    hasActiveProject,
    webSearchEnabled,
    onWebSearchToggle,
  }: ChatInputProps, ref) {
    const disabled = !hasActiveProject || isStreaming || isLoadingMessages

    return (
      <div className="absolute bottom-6 left-0 right-0 px-8 pointer-events-none">
        <div className="max-w-3xl mx-auto flex flex-col gap-2 pointer-events-auto">
          <form
            ref={ref}
            onSubmit={onSubmit}
            className="flex flex-col gap-2 p-3 bg-muted rounded-3xl shadow-sm transition duration-200"
          >
            <Textarea
              value={question}
              onChange={(event) => onQuestionChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault()
                  const form = event.currentTarget.closest("form")
                  if (form) form.requestSubmit()
                }
              }}
              placeholder="Ask anything... @sources"
              disabled={disabled}
              className="min-h-12 max-h-48 w-full resize-none bg-transparent border-none outline-none shadow-none focus-visible:ring-0 p-1 px-2 text-[15px] text-foreground placeholder-muted-foreground/60"
            />

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-[11px] h-8 text-muted-foreground hover:text-foreground hover:bg-background/50 font-medium px-2 rounded-lg flex items-center gap-1.5 shrink-0"
                      onClick={onLibraryClick}
                    >
                      <LibraryIcon className="size-3.5" />
                      Library
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Manage sources</TooltipContent>
                </Tooltip>

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
                      onClick={onWebSearchToggle}
                    >
                      <GlobeIcon className="size-3.5" />
                      Web
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Toggle Google search</TooltipContent>
                </Tooltip>
              </div>

              <Button
                size="icon-sm"
                type="submit"
                disabled={disabled || !question.trim()}
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
    )
  }
)
