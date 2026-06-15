"use client"

import * as React from "react"
import {
  SearchIcon,
  FileTextIcon,
  HistoryIcon,
  FolderIcon,
  UploadIcon,
  SparklesIcon,
} from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { useProjects } from "@/hooks/use-projects"
import { useChat } from "@/hooks/use-chat"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

// fallow-ignore-next-line complexity
export function CommandPalette() {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const { projects, activeProjectId, selectProject } = useProjects()
  const { openConversation, conversations } = useChat()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  const filteredConversations = conversations.filter(c =>
    (c.title || "Untitled").toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl p-0 overflow-hidden bg-background border-border shadow-2xl rounded-2xl">
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        <div className="flex items-center px-4 py-3 border-b border-border">
          <SearchIcon className="size-5 text-muted-foreground mr-3" />
          <input
            autoFocus
            type="text"
            placeholder="Search projects, conversations, or run commands..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-sm text-zinc-100 placeholder-muted-foreground/60 h-8"
          />
          <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded bg-muted border border-border px-1.5 font-mono text-[10px] font-medium opacity-100 text-muted-foreground">
            ESC
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {!search && (
            <div className="px-2 py-2 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">
              Quick Actions
            </div>
          )}
          {!search && (
            <div className="space-y-1 mb-4">
              <button
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted text-left text-sm text-foreground transition"
                onClick={() => {
                  setOpen(false)
                  // Trigger attach
                }}
              >
                <div className="size-6 rounded-md bg-muted/80 flex items-center justify-center border border-border">
                  <UploadIcon className="size-3 text-muted-foreground" />
                </div>
                Upload Document
              </button>
              <button
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted text-left text-sm text-foreground transition"
                onClick={() => {
                  setOpen(false)
                }}
              >
                <div className="size-6 rounded-md bg-muted/80 flex items-center justify-center border border-border">
                  <SparklesIcon className="size-3 text-muted-foreground" />
                </div>
                Create Prompt
              </button>
            </div>
          )}

          {filteredProjects.length > 0 && (
            <div className="mb-4">
              <div className="px-2 py-2 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">
                Switch Project
              </div>
              <div className="space-y-1">
                {filteredProjects.slice(0, 3).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      void selectProject(p.id)
                      setOpen(false)
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm transition",
                      p.id === activeProjectId
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted text-foreground"
                    )}
                  >
                    <FolderIcon className="size-4 shrink-0 opacity-70" />
                    <span className="flex-1 truncate">{p.name}</span>
                    {p.id === activeProjectId && (
                      <span className="text-[10px] bg-primary/20 px-1.5 py-0.5 rounded text-primary">Active</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredConversations.length > 0 && (
            <div className="mb-4">
              <div className="px-2 py-2 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">
                Recent Conversations
              </div>
              <div className="space-y-1">
                {filteredConversations.slice(0, 5).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      void openConversation(c.id)
                      setOpen(false)
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted text-left text-sm text-foreground transition"
                  >
                    <HistoryIcon className="size-4 shrink-0 opacity-70" />
                    <span className="flex-1 truncate">{c.title || "Untitled conversation"}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {search && filteredProjects.length === 0 && filteredConversations.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No results found for &ldquo;{search}&rdquo;
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
