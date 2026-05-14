"use client"

import * as React from "react"
import { SparklesIcon } from "lucide-react"

export const SUGGESTIONS = [
  { label: "Summarize files", text: "Summarize the key takeaways and main points from the scoped documents." },
  { label: "Find key concepts", text: "What are the core concepts and terms explained in these documents?" },
  { label: "Extract action items", text: "Extract any action items, tasks, or next steps mentioned in these files." },
  { label: "Draft an overview", text: "Draft a high-level overview of the topics covered in this project." }
]

interface QuickPromptsProps {
  onSelect: (text: string) => void
}

export function QuickPrompts({ onSelect }: QuickPromptsProps) {
  return (
    <div className="flex flex-wrap gap-1.5 pb-1">
      {SUGGESTIONS.map((s, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => onSelect(s.text)}
          className="inline-flex items-center gap-1 rounded-full border bg-card hover:bg-muted text-[11px] px-2.5 py-1 text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-sm duration-150"
        >
          <SparklesIcon className="h-2.5 w-2.5 text-primary" />
          {s.label}
        </button>
      ))}
    </div>
  )
}
