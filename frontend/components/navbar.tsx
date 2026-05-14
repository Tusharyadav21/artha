"use client"

import * as React from "react"
import { DownloadIcon, FileTextIcon, LibraryIcon, MessageSquarePlusIcon, VideoIcon } from "lucide-react"

import { type Project } from "@/lib/api"
import { Button } from "@/components/ui/button"
import type { OllamaSettings } from "@/hooks/use-agentic-rag"

interface NavbarProps {
  activeProject: Project | undefined
  activeConversationId: string | null
  messages: any[]
  exportChatAsJson: () => void
  activeProjectId: string | null
  isLoadingMessages: boolean
  isStreaming: boolean
  setActiveConversationId: (id: string | null) => void
  setMessages: (messages: any[]) => void
  setSources: (sources: any[]) => void
  setFeedbackByMessageId: (fb: any) => void
  setIsMobileProjectsOpen: (open: boolean) => void
  setIsMobileDocsOpen: (open: boolean) => void
  ollamaSettings: OllamaSettings
  setOllamaSettings: React.Dispatch<React.SetStateAction<OllamaSettings>>
}

export function Navbar({
  activeProject,
  activeConversationId,
  messages,
  exportChatAsJson,
  activeProjectId,
  isLoadingMessages,
  isStreaming,
  setActiveConversationId,
  setMessages,
  setSources,
  setFeedbackByMessageId,
  setIsMobileProjectsOpen,
  setIsMobileDocsOpen,
  ollamaSettings,
  setOllamaSettings,
}: NavbarProps) {
  const handleNewChat = () => {
    setActiveConversationId(null)
    setMessages([])
    setSources([])
    setFeedbackByMessageId({})
  }

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border p-4 gap-3">
      <div className="flex items-center justify-between w-full sm:w-auto gap-2">
        <Button
          variant="outline"
          size="icon-sm"
          className="lg:hidden"
          onClick={() => setIsMobileProjectsOpen(true)}
          aria-label="Toggle Projects"
        >
          <LibraryIcon className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold truncate max-w-[180px] sm:max-w-none">
            {activeProject?.name ?? "No project selected"}
          </h1>
          <p className="text-xs text-muted-foreground hidden sm:block">
            Upload project files, then ask questions with cited retrieval context.
          </p>
        </div>
        <Button
          variant="outline"
          size="icon-sm"
          className="lg:hidden ml-auto"
          onClick={() => setIsMobileDocsOpen(true)}
          aria-label="Toggle Documents & History"
        >
          <FileTextIcon className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center justify-end gap-2">
        {activeConversationId && messages.length > 0 && (
          <Button
            variant="outline"
            onClick={exportChatAsJson}
            aria-label="Export conversation"
            className="hidden sm:inline-flex animate-fade-in"
          >
            <DownloadIcon className="h-4 w-4 mr-2" />
            Export Chat
          </Button>
        )}

        <Button
          variant="outline"
          onClick={() => window.location.href = "/video"}
        >
          <VideoIcon className="h-4 w-4 mr-2" />
          Video Creator
        </Button>

        <Button
          variant="outline"
          disabled={!activeProjectId || isLoadingMessages || isStreaming}
          onClick={handleNewChat}
        >
          <MessageSquarePlusIcon data-icon="inline-start" />
          New chat
        </Button>
      </div>
    </header>
  )
}
