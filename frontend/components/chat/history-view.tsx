"use client"

import * as React from "react"
import { HistoryIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { formatRelativeDate } from "@/components/chat/message-utils"

interface Conversation {
  id: string
  title: string | null
  created_at: string
  updated_at: string
}

interface HistoryViewProps {
  conversations: Conversation[]
  activeConversationId?: string | null
  searchQuery: string
  onOpenConversation: (id: string) => void
  onNavigateToChat: () => void
}

export function HistoryView({
  conversations,
  activeConversationId,
  searchQuery,
  onOpenConversation,
  onNavigateToChat,
}: HistoryViewProps) {
  const filtered = React.useMemo(() => {
    if (!searchQuery.trim()) return conversations
    return conversations.filter((c) =>
      (c.title || "Untitled conversation").toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [conversations, searchQuery])

  return (
    <div className="flex-1 overflow-hidden min-h-0 p-6 bg-background">
      <div className="max-w-3xl mx-auto h-full flex flex-col">
        <div className="flex items-center justify-between mb-6 select-none shrink-0">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Past Chats ({filtered.length})
          </h3>
          {searchQuery && (
            <Badge variant="secondary" className="bg-muted text-muted-foreground border border-border text-[10px]">
              Filter: &ldquo;{searchQuery}&rdquo;
            </Badge>
          )}
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-3 pr-2">
            {filtered.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => {
                  onOpenConversation(conversation.id)
                  onNavigateToChat()
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

            {!filtered.length && (
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
  )
}
