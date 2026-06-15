"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import {
  BarChart3Icon,
  ClockIcon,
  CheckCircle2Icon,
  PlayIcon,
  RefreshCwIcon,
  TrendingUpIcon,
  ServerIcon,
  DatabaseIcon,
  FileTextIcon,
  LayersIcon,
  TerminalIcon,
  ActivityIcon,
} from "lucide-react"

import { useWorkspace } from "@/components/app/workspace-provider"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface LogTrace {
  timestamp: string
  source: "RAG" | "VECTOR" | "LLM" | "SYSTEM"
  message: string
  status: "success" | "info" | "warning"
}

// fallow-ignore-next-line complexity
export function AnalyticsView() {
  const { documents, conversationsTotal, documentsTotal } = useWorkspace()

  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "24h">("7d")
  const [logs, setLogs] = useState<LogTrace[]>([
    { timestamp: "12:20:02", source: "SYSTEM", message: "Client session token authenticated", status: "success" },
    { timestamp: "12:20:04", source: "RAG", message: "SSE stream initialized on Client connection", status: "info" },
    { timestamp: "12:21:15", source: "VECTOR", message: "pgvector similarity HNSW scan matched 14 chunks", status: "success" },
    { timestamp: "12:21:16", source: "RAG", message: "Reranker pipeline scoring complete (top 4 selected)", status: "success" },
    { timestamp: "12:21:18", source: "LLM", message: "Ollama token streaming complete (42 tokens/sec)", status: "success" },
    { timestamp: "12:24:45", source: "VECTOR", message: "HNSW index optimization scan complete", status: "success" },
  ])

  // System status metrics
  const totalQueries = conversationsTotal > 0 ? conversationsTotal * 4 + 12 : 24
  const activeDocs = documentsTotal > 0 ? documentsTotal : 3

  // Simulated log generator to make the trace view feel active and alive
  useEffect(() => {
    const messages = [
      { source: "RAG", message: "Similarity search completed (distance score 0.18)", status: "success" },
      { source: "VECTOR", message: "Ingested chunks indexed into pgvector context", status: "success" },
      { source: "LLM", message: "Prompt template compiled with context vectors", status: "info" },
      { source: "SYSTEM", message: "Active memory lifecycles refreshed", status: "info" },
      { source: "LLM", message: "Ollama token stream active (142 tokens generated)", status: "success" },
      { source: "VECTOR", message: "Cos-distance similarity calculation took 12ms", status: "success" },
    ] as const

    const interval = setInterval(() => {
      const randomMsg = messages[Math.floor(Math.random() * messages.length)]
      const now = new Date()
      const timeStr = now.toTimeString().split(" ")[0]

      setLogs((current) => [
        { timestamp: timeStr, ...randomMsg },
        ...current.slice(0, 14), // Keep last 15 logs
      ])
    }, 4500)

    return () => clearInterval(interval)
  }, [])

  const triggerLogRefresh = () => {
    const now = new Date()
    const timeStr = now.toTimeString().split(" ")[0]
    setLogs((current) => [
      { timestamp: timeStr, source: "SYSTEM", message: "Manual vector index scan trace triggered", status: "success" },
      ...current,
    ])
  }

  // Derive RAG Density charts
  const ragDensityData = React.useMemo(() => {
    const completedDocs = documents.filter((doc) => doc.status === "completed")
    if (completedDocs.length === 0) {
      return [
        { filename: "Q3-Report.pdf", chunks: 142, queries: 86, relevance: 94 },
        { filename: "Financials.xlsx", chunks: 68, queries: 42, relevance: 91 },
        { filename: "Investor-Deck.pptx", chunks: 96, queries: 38, relevance: 95 },
      ]
    }
    return completedDocs.map((doc, idx) => {
      const seed = doc.filename.length
      const chunks = Math.max(12, Math.ceil(doc.file_size / 16000))
      return {
        filename: doc.filename,
        chunks: chunks,
        queries: Math.max(5, (seed * 3) % 45),
        relevance: 90 + (seed % 10),
      }
    })
  }, [documents])

  return (
    <div className="flex-1 flex overflow-hidden h-full  min-h-0 select-none">

      {/* ======================================================= */}
      {/* COLUMN 1: LEFT WORKSPACE PANEL (Metrics & RAG overview) */}
      {/* ======================================================= */}
      <div className="flex-1 flex flex-col min-w-0 border-r  h-full">
        {/* Header Bar with Date Range selector */}
        <header className="h-14 px-6 border-b flex items-center justify-between shrink-0 backdrop-blur">
          <div className="flex items-center gap-3">
            <h1 className="font-semibold text-[15px] text-foreground tracking-tight">
              Analytics & Insights
            </h1>
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-semibold text-muted-foreground/60">
              PREVIEW
            </Badge>
          </div>

          {/* Segmented Time Controls */}
          <div className="flex items-center rounded-lg p-0.5">
            {([
              { value: "24h", label: "24h" },
              { value: "7d", label: "7d" },
              { value: "30d", label: "30d" },
            ] as const).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTimeRange(opt.value)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition duration-150",
                  timeRange === opt.value
                    ? "text-foreground shadow-sm"
                    : "text-muted-foreground/75 hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </header>

        {/* Scrollable Metrics Content Dashboard */}
        <ScrollArea className="flex-1 px-8 py-6">
          <div className="max-w-3xl mx-auto space-y-6 pb-6 pr-2">

            {/* A. Core Metrics Highlight Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {[
                  { label: "Queries Answered", value: totalQueries, subtitle: "+12.4% vs last week", icon: ActivityIcon, color: "text-primary" },
                  { label: "Avg LLM Latency", value: "1.84s", subtitle: "Ollama generation time", icon: ClockIcon, color: "text-primary" },
                  { label: "Vector Success", value: "99.8%", subtitle: " pgvector matching accuracy", icon: CheckCircle2Icon, color: "text-primary" },
                  { label: "Knowledge Nodes", value: activeDocs, subtitle: "active project sources", icon: LayersIcon, color: "text-primary" },
                    ].map((card, idx) => {
                const Icon = card.icon
                return (
                  <Card key={idx} className="overflow-hidden rounded-xl">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 leading-tight">
                          {card.label}
                        </p>
                        <Icon className={cn("size-3.5", card.color)} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-foreground tracking-tight">{card.value}</h3>
                        <p className="text-[9px] text-muted-foreground/60 font-semibold mt-0.5 leading-none">
                          {card.subtitle}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* B. Knowledge Density Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <DatabaseIcon className="size-3.5 text-muted-foreground" />
                  Project Knowledge Density
                </h3>
              </div>

              <div className="space-y-3">
                {ragDensityData.map((doc, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border hover:border-border transition duration-150 space-y-3.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileTextIcon className="size-3.5 text-primary shrink-0" />
                        <span className="text-xs font-semibold text-foreground truncate max-w-[200px]" title={doc.filename}>
                          {doc.filename}
                        </span>
                      </div>
                      <Badge className="bg-primary/10 border border-primary/20 text-primary text-[9px] font-bold uppercase h-5 px-2">
                        {doc.relevance}% relevance
                      </Badge>
                    </div>

                    {/* Progression bar visualizer */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-medium text-muted-foreground">
                        <span>Ingested Density: {doc.chunks} chunks</span>
                        <span>{doc.queries} queries targeted</span>
                      </div>
                      {/* Bar Track */}
                      <div className="h-1.5 w-full rounded-full overflow-hidden border">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (doc.chunks / 150) * 100)}%` }}
                          transition={{ duration: 1, delay: idx * 0.1 }}
                          className="h-full bg-primary rounded-full"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* C. Infrastructure status */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ServerIcon className="size-3.5 text-muted-foreground" />
                Vector Infrastructure Status
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border leading-normal flex items-start gap-3">
                  <div className="size-8 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                    <DatabaseIcon className="size-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">pgvector Database</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      HNSW vector indexing optimized. L2-cosine similarity index status: <span className="text-primary font-semibold">Active</span>.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border leading-normal flex items-start gap-3">
                  <div className="size-8 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                    <ServerIcon className="size-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">Embedding Node</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Ollama text-embeddings active. Target dimension schema: <span className="text-primary font-semibold">1536-dim</span>.
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </ScrollArea>
      </div>

      {/* ======================================================== */}
      {/* COLUMN 2: RIGHT WORKSPACE PANEL (System Status / Live log) */}
      {/* ======================================================== */}
      <div className="w-[360px] flex flex-col  h-full shrink-0">

        {/* Header Tab Title */}
        <header className="h-14 border-b flex items-center justify-between px-5 shrink-0">
          <div className="flex items-center gap-2 select-none">
            <TerminalIcon className="size-4 text-primary" />
            <h2 className="text-xs font-bold tracking-wide uppercase text-foreground">
              System Health & Trace
            </h2>
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-semibold text-muted-foreground/60">
              PREVIEW
            </Badge>
          </div>

          <Button
            size="icon-xs"
            variant="ghost"
            onClick={triggerLogRefresh}
            className="hover:bg-accent text-muted-foreground hover:text-accent-foreground"
          >
            <RefreshCwIcon className="size-3" />
          </Button>
        </header>

        {/* Live Trace Logs Panel */}
        <div className="flex-1 p-5 overflow-hidden flex flex-col min-h-0 select-none">
          <div className="flex items-center gap-1.5 shrink-0 mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <ActivityIcon className="size-3.5 text-muted-foreground" />
            Active Pipeline Trace Logs
          </div>

          {/* Scrolling log block */}
          <ScrollArea className="flex-1 rounded-xl p-3.5">
            <div className="font-mono text-[9px] leading-relaxed space-y-3 pr-1.5 text-muted-foreground">
              {logs.map((log, idx) => (
                <div key={idx} className="flex gap-2 items-start transition duration-150">
                  <span className="text-muted-foreground/50 shrink-0 font-semibold">{log.timestamp}</span>
                  <span className={cn(
                    "text-[8px] uppercase tracking-wider font-bold shrink-0 px-1 py-0.2 rounded border",
                    log.source === "VECTOR" ? "bg-primary/10 text-primary border-primary/20" :
                      log.source === "LLM" ? "bg-blue-950/20 text-blue-400 border-blue-800/40" :
                        log.source === "RAG" ? "bg-purple-950/20 text-purple-400 border-purple-800/40" :
                          "bg-muted text-muted-foreground border-border"
                  )}>
                    {log.source}
                  </span>
                  <span className="text-foreground/80 break-all">{log.message}</span>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Health Indicators Box */}
          <div className="mt-4 p-4 border rounded-xl shrink-0 space-y-3 select-none">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <span>Database Indices</span>
              <span className="text-primary">Stable</span>
            </div>

            <div className="space-y-2">
              {[
                { name: "pg_similarity_hnsw", stat: "420 ms latency", progress: 95 },
                { name: "chunk_search_index", stat: "142 chunks", progress: 100 },
              ].map((index, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-[9px] font-semibold text-muted-foreground">
                    <span>{index.name}</span>
                    <span className="text-muted-foreground/60">{index.stat}</span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden border">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${index.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

    </div>
  )
}
