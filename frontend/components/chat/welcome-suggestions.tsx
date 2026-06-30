"use client"

import * as React from "react"
import { motion } from "framer-motion"

interface WelcomeSuggestionsProps {
  projectName?: string | null
  onSuggestionClick: (text: string) => void
}

const suggestions = [
  { title: "Summarize Kubernetes", desc: "Give me a quick rundown of K8s networking." },
  { title: "Explain RBAC", desc: "Detail how RoleBindings control access." },
  { title: "Compare Deployments", desc: "Vs StatefulSets for DBs." },
  { title: "Create Interview Questions", desc: "Based on the uploaded cheat sheet." },
]

export function WelcomeSuggestions({ projectName, onSuggestionClick }: WelcomeSuggestionsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-16 text-left max-w-2xl mx-auto"
    >
      <h2 className="text-2xl font-semibold text-foreground tracking-tight mb-3">
        Hello, {projectName || "Project"}
      </h2>
      <p className="text-sm text-muted-foreground leading-relaxed mb-8 max-w-lg">
        Ask questions about your documents, analyze sources, or create summaries.
      </p>

      <div className="grid grid-cols-2 gap-3">
        {suggestions.map((s) => (
          <div
            key={s.title}
            className="p-4 rounded-xl border border-border bg-muted/50 hover:bg-muted transition cursor-pointer group"
            onClick={() => onSuggestionClick(s.desc)}
          >
            <p className="text-xs font-semibold text-foreground group-hover:text-primary transition mb-1">{s.title}</p>
            <p className="text-[10px] text-muted-foreground">{s.desc}</p>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
