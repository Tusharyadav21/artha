"use client"

import { PropsWithChildren, Suspense, useState } from "react"
import {
  MenuIcon,
  MessageSquarePlusIcon,
  MonitorIcon,
  MoonStarIcon,
  SunMediumIcon,
} from "lucide-react"
import { usePathname } from "next/navigation"

import { useAuth } from "@/hooks/use-auth"
import { useProjects } from "@/hooks/use-projects"
import { useChat } from "@/hooks/use-chat"
import { WorkspaceProviders } from "@/components/app/workspace-providers"
import { Sidebar } from "@/components/app/sidebar"
import { CommandPalette } from "@/components/app/command-palette"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ErrorBoundary } from "@/components/ui/error-boundary"
import { NewChatDialog } from "@/components/chat/new-chat-dialog"

function nextThemePreference(current: "system" | "light" | "dark") {
  if (current === "system") return "light"
  if (current === "light") return "dark"
  return "system"
}

function themeLabel(current: "system" | "light" | "dark") {
  if (current === "system") return "System"
  if (current === "light") return "Light"
  return "Dark"
}

function WorkspaceFrame({ children }: PropsWithChildren) {
  const pathname = usePathname()
  const { user, isLoadingSession, updateUserSettings } = useAuth()
  const { activeProject } = useProjects()
  const { conversations, activeConversationId } = useChat()
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isNewChatOpen, setIsNewChatOpen] = useState(false)

  if (isLoadingSession || !user) {
    return (
      <main className="flex min-h-svh bg-background">
        <div className="hidden w-80 space-y-4 border-r border-sidebar-border p-4 lg:block">
          <Skeleton className="h-10 w-full rounded-xl" />
          <div className="space-y-2 pt-8">
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
          <div className="space-y-2 pt-12">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>
        <div className="flex flex-1 flex-col">
          <div className="flex h-14 items-center border-b border-border px-6">
            <Skeleton className="h-6 w-48" />
          </div>
          <div className="flex-1 space-y-6 p-8">
            <div className="flex justify-between">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-10 w-32" />
            </div>
            <Skeleton className="h-[400px] w-full rounded-2xl" />
          </div>
        </div>
      </main>
    )
  }

  const activeConversation = conversations.find((c) => c.id === activeConversationId)

  return (
    <main className="flex h-[100dvh] overflow-hidden bg-background text-foreground">
      <div className="hidden h-full shrink-0 border-r border-sidebar-border lg:block">
        <Sidebar />
      </div>

      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-20 flex h-14 shrink-0 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
              aria-label="Open navigation"
              onClick={() => setIsMobileSidebarOpen(true)}
            >
              <MenuIcon className="size-5" />
            </Button>
            <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
              <span className="max-w-[120px] truncate">{activeProject?.name || "Artha"}</span>
              <span className="text-muted-foreground/40">/</span>
              <span className="max-w-[200px] truncate text-foreground">
                {pathname.startsWith("/settings") ? "Settings"
                : pathname.startsWith("/analytics") ? "Analytics & Insights"
                : pathname.startsWith("/video") ? "Video Studio"
                : pathname.startsWith("/financial") ? "Financial Dashboard"
                : pathname.startsWith("/extract") ? "Extract"
                : activeConversation?.title || "New Chat"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="New chat"
                  onClick={() => setIsNewChatOpen(true)}
                >
                  <MessageSquarePlusIcon className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New chat</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  onClick={() =>
                    void updateUserSettings({
                      theme_preference: nextThemePreference(user.theme_preference),
                    })
                  }
                >
                  {user.theme_preference === "system" ? (
                    <MonitorIcon className="size-4" />
                  ) : user.theme_preference === "light" ? (
                    <SunMediumIcon className="size-4" />
                  ) : (
                    <MoonStarIcon className="size-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Theme: {themeLabel(user.theme_preference)}</TooltipContent>
            </Tooltip>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
          <ErrorBoundary>
            <Suspense fallback={<Skeleton className="flex-1 m-6 rounded-2xl" />}>
              {children}
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>

      <Sheet open={isMobileSidebarOpen}>
        <SheetContent className="w-80 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Workspace navigation</SheetTitle>
          </SheetHeader>
          <Sidebar mobile onNavigate={() => setIsMobileSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      <NewChatDialog open={isNewChatOpen} onOpenChange={setIsNewChatOpen} />
      <CommandPalette />
    </main>
  )
}

export function WorkspaceShell({ children }: PropsWithChildren) {
  return (
    <WorkspaceProviders>
      <WorkspaceFrame>{children}</WorkspaceFrame>
    </WorkspaceProviders>
  )
}
