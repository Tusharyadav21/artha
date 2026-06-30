"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"

export interface Workspace {
  id: string
  name: string
  owner_id: string
  created_at: string | null
  updated_at: string | null
}

export function useWorkspace(): {
  workspace: Workspace | null
  isLoadingWorkspace: boolean
} {
  const { authedFetch, token, isLoadingSession } = useAuth()
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [isLoadingWorkspace, setIsLoading] = useState(true)

  useEffect(() => {
    if (!token || isLoadingSession) return

    authedFetch<Workspace>("/api/workspaces/me")
      .then(setWorkspace)
      .catch(() => {
        // workspace fetch is non-critical for non-settings pages
        setWorkspace(null)
      })
      .finally(() => setIsLoading(false))
  }, [token, isLoadingSession, authedFetch])

  return { workspace, isLoadingWorkspace }
}
