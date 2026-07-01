"use client"

import { FormEvent } from "react"
import { SaveIcon } from "lucide-react"

import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"

interface PromptsViewProps {
  activeProject?: { id: string; system_prompt?: string | null } | null
  isSavingProject: boolean
  onSaveSystemPrompt: (prompt: string) => void
}

export function PromptsView({ activeProject, isSavingProject, onSaveSystemPrompt }: PromptsViewProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = new FormData(event.currentTarget).get("systemPrompt") as string
    onSaveSystemPrompt(text)
  }

  return (
    <div className="flex-1 overflow-hidden min-h-0 p-6 bg-background">
      <div className="max-w-3xl mx-auto h-full flex flex-col">
        <div className="mb-6 select-none shrink-0">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            System Prompt Builder
          </h3>
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
            Set customized instruction guidelines that drive the behavior of the AI assistant for this workspace.
          </p>
        </div>

        <div className="flex-1 bg-card border border-border rounded-2xl p-5 flex flex-col overflow-hidden min-h-0 shadow-sm">
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-4 min-h-0">
            <Textarea
              name="systemPrompt"
              defaultValue={activeProject?.system_prompt ?? ""}
              disabled={!activeProject || isSavingProject}
              placeholder="Enter custom assistant rules (e.g. 'You are a financial analyst...')"
              className="flex-1 resize-none bg-muted border border-border rounded-xl p-4 text-sm leading-relaxed text-foreground placeholder-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary min-h-0 shadow-inner"
            />

            <div className="flex justify-end gap-3 shrink-0 select-none pt-2">
              <Button
                type="submit"
                disabled={!activeProject || isSavingProject}
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-5 flex items-center gap-2 h-9 text-xs font-bold rounded-xl shadow-sm"
              >
                {isSavingProject ? (
                  "Saving..."
                ) : (
                  <>
                    <SaveIcon className="size-4" />
                    Save instructions
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
