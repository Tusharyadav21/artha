"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useWorkspace } from "@/hooks/use-workspace"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import type { Tool } from "@/lib/api"

export default function ToolsPage() {
  const { authedFetch } = useAuth()
  const { workspace } = useWorkspace()
  const [tools, setTools] = useState<Tool[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!workspace?.id) return

    authedFetch<Tool[]>(`/api/workspaces/${workspace.id}/tools`)
      .then(data => setTools(data || []))
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [workspace?.id, authedFetch])

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tools</h1>
          <p className="text-muted-foreground">Configure external capabilities, API connections, and MCP tools.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : tools.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground mb-4">No tools found for this workspace.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {tools.map(tool => (
            <Card key={tool.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{tool.name}</CardTitle>
                  <Badge variant="outline" className="uppercase font-mono text-[10px]">
                    {tool.auth_type}
                  </Badge>
                </div>
                <CardDescription>{tool.description || "No description provided"}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-mono bg-muted/50 p-2 rounded truncate">
                  {tool.endpoint_url || "No endpoint configured"}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
