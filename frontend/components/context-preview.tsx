"use client"

import * as React from "react"
import { SparklesIcon, BotIcon, KeyboardIcon } from "lucide-react"

interface ContextPreviewProps {
  hasScopedDocuments: boolean
  selectedDocsData: { count: number; totalKB: number; estTokens: number }
  totalDocumentsSizeData: { count: number; totalKB: number; estTokens: number }
}

export function ContextPreview({
  hasScopedDocuments,
  selectedDocsData,
  totalDocumentsSizeData,
}: ContextPreviewProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
      {hasScopedDocuments ? (
        <div className="flex items-center gap-1.5 rounded-md bg-primary/10 border border-primary/20 px-2 py-1 text-primary font-medium">
          <SparklesIcon className="h-3 w-3" />
          <span>
            Scoped: {selectedDocsData.count} document(s) • {selectedDocsData.totalKB} KB • ~
            {selectedDocsData.estTokens.toLocaleString()} tokens of context
          </span>
        </div>
      ) : totalDocumentsSizeData.count > 0 ? (
        <div className="flex items-center gap-1.5 rounded-md bg-muted px-2 py-1">
          <BotIcon className="h-3 w-3 text-muted-foreground" />
          <span>
            Searching: Global project context ({totalDocumentsSizeData.count} documents • {totalDocumentsSizeData.totalKB} KB • ~
            {totalDocumentsSizeData.estTokens.toLocaleString()} max tokens)
          </span>
        </div>
      ) : (
        <span className="text-muted-foreground/80">No documents in project yet</span>
      )}

      <span className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
        <KeyboardIcon className="h-3 w-3" /> Press <kbd className="rounded border bg-muted px-1">/</kbd> to focus
      </span>
    </div>
  )
}
