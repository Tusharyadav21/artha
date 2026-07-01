"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useWorkspace } from "@/hooks/use-workspace"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import type { Agent } from "@/lib/api"

export default function AgentsPage() {
  const { authedFetch } = useAuth()
  const { workspace } = useWorkspace()
  const [agents, setAgents] = useState<Agent[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!workspace?.id) return

    authedFetch<Agent[]>(`/api/workspaces/${workspace.id}/agents`)
      .then(data => setAgents(data || []))
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [workspace?.id, authedFetch])

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agents</h1>
          <p className="text-muted-foreground">Manage agent orchestration workflows and semantic routing configurations.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : agents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground mb-4">No agents found for this workspace.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {agents.map(agent => (
            <Card key={agent.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{agent.name}</CardTitle>
                  <Badge variant={agent.is_active ? "default" : "secondary"}>
                    {agent.is_active ? "Active" : "Inactive"} v{agent.version}
                  </Badge>
                </div>
                <CardDescription>{agent.description || "No description provided"}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  <strong>Routing intent:</strong> {agent.routing_description || "None"}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
