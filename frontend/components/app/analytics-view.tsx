"use client"

import { useState, useEffect } from "react"
import {
  ActivityIcon,
  BarChart3Icon,
  DatabaseIcon,
  FileTextIcon,
  LayersIcon,
  MessageSquareIcon,
  RefreshCwIcon,
  TrendingUpIcon,
} from "lucide-react"

import { useProjects } from "@/hooks/use-projects"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { apiFetch } from "@/lib/api"
import { TOKEN_KEY } from "@/lib/app-storage"

interface DailyQuery {
  date: string
  count: number
}

interface UserAnalytics {
  total_documents: number
  completed_documents: number
  total_conversations: number
  total_messages: number
  daily_queries: DailyQuery[]
}

export function AnalyticsView() {
  const { activeProjectId } = useProjects()
  const [data, setData] = useState<UserAnalytics | null>(null)
  const [loading, setLoading] = useState(true)

  const getToken = () => {
    if (typeof window === "undefined") return null
    return window.localStorage.getItem(TOKEN_KEY)
  }

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const result = await apiFetch<UserAnalytics>("/api/analytics/user", getToken())
      setData(result)
    } catch (err) {
      console.error("Failed to fetch analytics:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const totalQueries = data?.total_messages ?? 0
  const activeDocs = data?.total_documents ?? 0
  const dailyData = data?.daily_queries ?? []
  const peakQueries = dailyData.length > 0 ? Math.max(...dailyData.map((d) => d.count)) : 0

  return (
    <div className="flex-1 flex overflow-hidden h-full min-h-0 select-none">
      <div className="flex-1 flex flex-col min-w-0 border-r h-full">
        <header className="h-14 px-6 border-b flex items-center justify-between shrink-0 backdrop-blur">
          <div className="flex items-center gap-3">
            <h1 className="font-semibold text-[15px] text-foreground tracking-tight">
              Analytics & Insights
            </h1>
          </div>
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={fetchAnalytics}
            disabled={loading}
            className="hover:bg-accent text-muted-foreground hover:text-accent-foreground"
          >
            <RefreshCwIcon className={cn("size-3.5", loading && "animate-spin")} />
          </Button>
        </header>

        <ScrollArea className="flex-1 px-8 py-6">
          <div className="max-w-3xl mx-auto space-y-6 pb-6 pr-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Messages", value: totalQueries, subtitle: "total across all projects", icon: MessageSquareIcon, color: "text-primary" },
                { label: "Documents", value: activeDocs, subtitle: `${data?.completed_documents ?? 0} processed`, icon: FileTextIcon, color: "text-primary" },
                { label: "Conversations", value: data?.total_conversations ?? 0, subtitle: "active threads", icon: LayersIcon, color: "text-primary" },
                { label: "Daily Peak", value: peakQueries, subtitle: "highest in period", icon: TrendingUpIcon, color: "text-primary" },
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
                        <h3 className="text-xl font-bold text-foreground tracking-tight">
                          {loading ? "..." : card.value}
                        </h3>
                        <p className="text-[9px] text-muted-foreground/60 font-semibold mt-0.5 leading-none">
                          {card.subtitle}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Daily query activity chart */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <BarChart3Icon className="size-3.5 text-muted-foreground" />
                Daily Activity
              </h3>
              <div className="rounded-xl border p-4">
                {dailyData.length > 0 ? (
                  <div className="flex items-end gap-1.5 h-32">
                    {dailyData.map((day, idx) => {
                      const height = peakQueries > 0 ? (day.count / peakQueries) * 100 : 0
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                          <span className="text-[8px] text-muted-foreground/50 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                            {day.count}
                          </span>
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${height}%` }}
                            transition={{ duration: 0.5, delay: idx * 0.03 }}
                            className="w-full bg-primary/60 rounded-t-sm hover:bg-primary/80 transition-colors"
                          />
                          <span className="text-[7px] text-muted-foreground/40 font-medium truncate w-full text-center">
                            {day.date.slice(5)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground/60 text-center py-8">
                    {loading ? "Loading..." : "No activity data yet"}
                  </p>
                )}
              </div>
            </div>

            {/* Document density */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <DatabaseIcon className="size-3.5 text-muted-foreground" />
                Knowledge Overview
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border leading-normal flex items-start gap-3">
                  <div className="size-8 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                    <DatabaseIcon className="size-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">Ingested Documents</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {data?.completed_documents ?? 0} of {data?.total_documents ?? 0} documents processed
                    </p>
                  </div>
                </div>
                <div className="p-4 rounded-xl border leading-normal flex items-start gap-3">
                  <div className="size-8 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                    <MessageSquareIcon className="size-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">Conversations</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {data?.total_conversations ?? 0} threads with {data?.total_messages ?? 0} messages
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      <div className="w-[360px] flex flex-col h-full shrink-0">
        <header className="h-14 border-b flex items-center justify-between px-5 shrink-0">
          <div className="flex items-center gap-2 select-none">
            <ActivityIcon className="size-4 text-primary" />
            <h2 className="text-xs font-bold tracking-wide uppercase text-foreground">
              System Status
            </h2>
          </div>
        </header>

        <div className="flex-1 p-5 overflow-hidden flex flex-col min-h-0">
          <div className="space-y-4">
            <div className="p-4 border rounded-xl space-y-3">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <span>Database</span>
                <span className="text-primary">Connected</span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <span>Vector Index</span>
                <span className="text-primary">Active</span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <span>Projects</span>
                <span className="text-primary">{data?.total_conversations ?? 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
