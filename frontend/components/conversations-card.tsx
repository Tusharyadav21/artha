"use client"

import * as React from "react"
import { ChevronDownIcon, ChevronUpIcon, SearchIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { type Conversation } from "@/lib/api"

interface ConversationsCardProps {
  conversations: Conversation[]
  conversationsTotal: number
  activeConversationId: string | null
  searchConversationQuery: string
  setSearchConversationQuery: (query: string) => void
  isConversationsCollapsed: boolean
  setIsConversationsCollapsed: (collapsed: boolean) => void
  filteredConversations: Conversation[]
  loadConversation: (id: string) => void
  isLoadingMoreConvos: boolean
  loadConversations: (projectId: string, skip: number) => Promise<void>
  activeProjectId: string | null
}

export function ConversationsCard({
  conversations,
  conversationsTotal,
  activeConversationId,
  searchConversationQuery,
  setSearchConversationQuery,
  isConversationsCollapsed,
  setIsConversationsCollapsed,
  filteredConversations,
  loadConversation,
  isLoadingMoreConvos,
  loadConversations,
  activeProjectId,
}: ConversationsCardProps) {
  return (
    <Card
      className={`flex min-h-0 flex-col transition-all duration-300 ${
        isConversationsCollapsed ? "max-h-[50px]" : "max-h-[35%]"
      }`}
    >
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm">Conversations</CardTitle>
          {conversations.length > 0 && (
            <Badge variant="secondary" className="h-4 px-1 text-[10px]">
              {conversations.length}
            </Badge>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setIsConversationsCollapsed(!isConversationsCollapsed)}
          aria-label={isConversationsCollapsed ? "Expand conversations" : "Collapse conversations"}
        >
          {isConversationsCollapsed ? (
            <ChevronDownIcon className="h-4 w-4" />
          ) : (
            <ChevronUpIcon className="h-4 w-4" />
          )}
        </Button>
      </CardHeader>
      {!isConversationsCollapsed && (
        <CardContent className="min-h-0 flex-1 flex flex-col gap-2.5">
          {conversations.length > 0 && (
            <div className="relative">
              <SearchIcon className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground/70" />
              <Input
                value={searchConversationQuery}
                onChange={(event) => setSearchConversationQuery(event.target.value)}
                placeholder="Search conversations..."
                className="h-8 pl-7 text-xs placeholder:text-muted-foreground/60"
              />
            </div>
          )}
          <ScrollArea className="flex-1">
            <div className="flex flex-col gap-2">
              {filteredConversations.map((conversation) => (
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
              {filteredConversations.length === 0 && conversations.length > 0 && (
                <p className="text-[11px] text-center text-muted-foreground py-2">
                  No matching conversations
                </p>
              )}
              {conversations.length < conversationsTotal && !searchConversationQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 h-8 w-full text-xs"
                  disabled={isLoadingMoreConvos}
                  onClick={async () => {
                    if (!activeProjectId) {
                      return
                    }
                    try {
                      await loadConversations(activeProjectId, conversations.length)
                    } catch {
                      // Handled in parent
                    }
                  }}
                >
                  {isLoadingMoreConvos ? "Loading..." : "Load more"}
                </Button>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      )}
    </Card>
  )
}
