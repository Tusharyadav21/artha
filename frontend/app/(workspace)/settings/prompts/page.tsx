"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useWorkspace } from "@/hooks/use-workspace"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import type { PromptTemplate } from "@/lib/api"

export default function PromptsPage() {
  const { authedFetch } = useAuth()
  const { workspace } = useWorkspace()
  const [prompts, setPrompts] = useState<PromptTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!workspace?.id) return

    authedFetch<PromptTemplate[]>(`/api/workspaces/${workspace.id}/prompts`)
      .then(data => setPrompts(data || []))
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [workspace?.id, authedFetch])

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Prompts</h1>
          <p className="text-muted-foreground">Manage system prompts and template versions for your agents.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : prompts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground mb-4">No prompts found for this workspace.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {prompts.map(prompt => (
            <Card key={prompt.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{prompt.name}</CardTitle>
                  <Badge variant="outline" className="font-mono text-xs">
                    v{prompt.version}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm bg-muted/50 p-3 rounded-md line-clamp-3">
                  {prompt.template_text}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Temperature: {prompt.temperature}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
