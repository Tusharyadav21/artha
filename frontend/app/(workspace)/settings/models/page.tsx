"use client"

import { useAuth } from "@/hooks/use-auth"
import { useWorkspace } from "@/hooks/use-workspace"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import type { ModelRegistry } from "@/lib/api"
import { useEffect, useState } from "react"

export default function ModelsPage() {
  const { authedFetch } = useAuth()
  const { workspace } = useWorkspace()
  const [models, setModels] = useState<ModelRegistry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!workspace?.id) return

    authedFetch<ModelRegistry[]>(`/api/workspaces/${workspace.id}/models`)
      .then(data => setModels(data || []))
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [workspace?.id, authedFetch])

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Model Registry</h1>
          <p className="text-muted-foreground">Configure LLMs, embeddings, and context window limits.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : models.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground mb-4">No models configured for this workspace.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {models.map(model => (
            <Card key={model.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{model.name}</CardTitle>
                    <Badge className="capitalize">{model.provider}</Badge>
                  </div>
                  {model.supports_tools && (
                    <Badge variant="outline" className="text-[10px] uppercase">Supports Tools</Badge>
                  )}
                </div>
                <CardDescription className="font-mono text-xs">{model.model_name}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground flex justify-between items-center">
                  <span>Context window: {model.context_window || "Default"}</span>
                  <Badge variant={model.is_active ? "default" : "secondary"}>
                    {model.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
