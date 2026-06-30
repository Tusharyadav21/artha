"use client"

import * as React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Loader2,
  Music,
  Video,
  Type,
  Palette,
  ArrowRight,
  CheckCircle2,
  History,
  PlusCircle,
  LayoutIcon,
  CodeIcon,
  ClockIcon,
  SmartphoneIcon,
  DownloadIcon,
  PlayIcon,
  RefreshCwIcon,
  FileTextIcon,
  LayersIcon,
} from "lucide-react"
import { apiFetch, apiUrl } from "@/lib/api"
import { TOKEN_KEY } from "@/lib/app-storage"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { ScrollArea } from "@/components/ui/scroll-area"

interface HistoryItem {
  id: string
  title: string
  video_url: string
  created_at: string
}

// fallow-ignore-next-line complexity
export function VideoCreator() {
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)

  // State for content
  const [topic, setTopic] = useState("")
  const [timeline, setTimeline] = useState<any>(null)

  // Final video
  const [videoUrl, setVideoUrl] = useState("")
  const [history, setHistory] = useState<HistoryItem[]>([])

  // Tabs: "create" | "library"
  const [activeTab, setActiveTab] = useState("create")

  // Currently previewed video from history or active render
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null)
  const [previewTitle, setPreviewTitle] = useState<string>("")

  const getAuthToken = () => {
    if (typeof window === "undefined") return null
    return window.localStorage.getItem(TOKEN_KEY)
  }

  const fetchHistory = async () => {
    try {
      const data = await apiFetch<any>("/api/video/history", getAuthToken())
      setHistory(data.videos)
      if (data.videos.length > 0 && !previewVideoUrl) {
        setPreviewVideoUrl(data.videos[0].video_url)
        setPreviewTitle(data.videos[0].title)
      }
    } catch (err) {
      console.error("Failed to fetch history:", err)
    }
  }

  React.useEffect(() => {
    fetchHistory()
  }, [])

  const generateTimeline = async () => {
    setLoading(true)
    try {
      const data = await apiFetch<any>("/api/video/draft/script", getAuthToken(), {
        method: "POST",
        body: JSON.stringify({ topic })
      })
      setTimeline(data)
      setStep(1)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const finalizeVideo = async () => {
    setLoading(true)
    try {
      const data = await apiFetch<any>("/api/video/finalize", getAuthToken(), {
        method: "POST",
        body: JSON.stringify({
          title: timeline.title,
          timeline: timeline
        })
      })
      setVideoUrl(data.video_url)
      setPreviewVideoUrl(data.video_url)
      setPreviewTitle(timeline.title)
      setStep(2) // Move to final step
      fetchHistory() // Refresh history
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 flex overflow-hidden h-full  min-h-0 select-none">

      {/* ========================================================= */}
      {/* COLUMN 1: LEFT WORKSPACE PANEL (Editor / Stepper / Library) */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col min-w-0 border-r  h-full">
        {/* Header Bar with Segmented Tabs */}
        <header className="h-14 px-6 border-b  flex items-center justify-between shrink-0 /90 backdrop-blur">
          <div className="flex items-center gap-3">
            <h1 className="font-semibold text-[15px] text-white tracking-tight">
              Shorts Creator
            </h1>
          </div>

          {/* Segmented Tab Controls */}
          <div className="flex items-center  border  rounded-lg p-0.5">
            <button
              onClick={() => setActiveTab("create")}
              className={cn(
                "px-3 py-1.5 rounded-md text-[11px] font-bold tracking-wide transition duration-150 flex items-center gap-1.5",
                activeTab === "create"
                  ? "text-white shadow-sm"
                  : "text-muted-foreground/75 hover:text-white"
              )}
            >
              <PlusCircle className="size-3.5" />
              Create
            </button>
            <button
              onClick={() => setActiveTab("library")}
              className={cn(
                "px-3 py-1.5 rounded-md text-[11px] font-bold tracking-wide transition duration-150 flex items-center gap-1.5",
                activeTab === "library"
                  ? "text-white shadow-sm"
                  : "text-muted-foreground/75 hover:text-white"
              )}
            >
              <History className="size-3.5" />
              Library
            </button>
          </div>
        </header>

        {/* Tab View Container */}
        <div className="flex-1 overflow-hidden min-h-0 flex flex-col">

          {/* A. CREATE SHORTS ROUTE */}
          {activeTab === "create" && (
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">

              {/* Stepper Progress bar */}
              <div className="px-8 py-4 shrink-0">
                <div className="max-w-xl mx-auto flex items-center justify-between relative">
                  {[
                    { step: 0, label: "Topic" },
                    { step: 1, label: "Timeline" },
                    { step: 2, label: "Render" },
                  // fallow-ignore-next-line complexity
                  ].map((s, idx) => (
                    <React.Fragment key={s.step}>
                      <div className="flex flex-col items-center gap-1.5 relative z-10">
                        <div className={cn(
                          "size-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all duration-300",
                          step === s.step ? "border-emerald-500 bg-emerald-600/10 text-emerald-400 shadow-sm" :
                            step > s.step ? "border-emerald-600 bg-emerald-600 text-white" : "  text-muted-foreground"
                        )}>
                          {step > s.step ? <CheckCircle2 className="size-4" /> : s.step + 1}
                        </div>
                        <span className={cn(
                          "text-[9px] uppercase tracking-wider font-bold",
                          step >= s.step ? "text-emerald-400" : "text-muted-foreground/50"
                        )}>{s.label}</span>
                      </div>
                      {idx < 2 && (
                        <div className={cn(
                          "h-[1px] flex-1 min-w-[20px] -mt-5 transition-colors duration-500",
                        )} />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Step Contents View */}
              <ScrollArea className="flex-1 px-8 py-6">
                <div className="max-w-2xl mx-auto space-y-6 pb-6">

                  {/* STEP 0: TOPIC PROMPT INPUT */}
                  {step === 0 && (
                    <div className="space-y-5 py-6">
                      <div className="text-center max-w-md mx-auto mb-8">
                        <div className="size-12 rounded-2xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                          <PlusCircle className="size-6 text-emerald-500" />
                        </div>
                        <h2 className="text-sm font-semibold text-white tracking-tight mb-2">Create an AI Short</h2>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Describe a topic and active AI nodes will compile narrated segments, code mockups, and overlay transitions.
                        </p>
                      </div>

                      <div className="flex flex-col gap-4 p-4 rounded-2xl">
                        <Textarea
                          placeholder="e.g. Python Decorators explained simply, Asyncio in 60s, History of the pyramids..."
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                          disabled={loading}
                          className="min-h-24 resize-none bg-transparent border-none outline-none shadow-none focus-visible:ring-0 p-1 text-sm text-zinc-200 placeholder-muted-foreground/40"
                        />
                        <div className="flex justify-end pt-2 border-t ">
                          <Button
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 px-4 rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-950/20"
                            onClick={generateTimeline}
                            disabled={loading || !topic.trim()}
                          >
                            {loading ? (
                              <>
                                <Loader2 className="animate-spin size-4" />
                                Planning video...
                              </>
                            ) : (
                              <>
                                Generate Video Plan
                                <ArrowRight className="size-3.5" />
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 1: INTERACTIVE TIMELINE SCRIPT BUILDER */}
                  {step === 1 && timeline && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center justify-between border-b  pb-4">
                        <div>
                          <h3 className="text-sm font-bold text-white tracking-tight">{timeline.title}</h3>
                          <p className="text-[11px] text-muted-foreground/80 mt-1 font-medium flex items-center gap-2">
                            <span>Estimated Duration:</span>
                            <span className="text-emerald-400 font-semibold">{timeline.duration}s</span>
                            <span>·</span>
                            <span>{timeline.scenes.length} Scenes</span>
                          </p>
                        </div>
                      </div>

                      {/* Scene Cards List */}
                      <div className="space-y-4">
                        {timeline.scenes.map((scene: any, idx: number) => (
                          <div
                            key={idx}
                            className="rounded-2xl  overflow-hidden group hover:border-zinc-800 transition duration-150"
                          >
                            {/* Scene Header */}
                            <div className="px-4 py-2.5 flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <Badge className="text-zinc-300 h-5 px-2 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                                  {scene.type === "code" ? <CodeIcon className="size-3 text-emerald-400" /> : <LayoutIcon className="size-3 text-blue-400" />}
                                  {scene.type}
                                </Badge>
                                <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">Scene {idx + 1}</span>
                              </div>
                              <div className="flex items-center gap-1 text-[9px] font-semibold text-muted-foreground  border  px-2 py-0.5 rounded-lg">
                                <ClockIcon className="size-3" />
                                {scene.start}s - {scene.end}s
                              </div>
                            </div>

                            {/* Scene Body Editor */}
                            <div className="p-4 space-y-4">
                              {/* Narration script field */}
                              <div className="space-y-1.5">
                                <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-1.5 select-none">
                                  <Type className="size-3 text-zinc-500" /> Voice Narration Script
                                </label>
                                <Textarea
                                  className="text-xs  border  rounded-xl p-3 text-zinc-200 placeholder-zinc-700 min-h-[72px] resize-none focus-visible:ring-1 focus-visible:ring-emerald-600 focus-visible:border-emerald-600"
                                  value={scene.content}
                                  onChange={(e) => {
                                    const newScenes = [...timeline.scenes];
                                    newScenes[idx].content = e.target.value;
                                    setTimeline({ ...timeline, scenes: newScenes });
                                  }}
                                />
                              </div>

                              {/* Code layout mockup script field */}
                              {scene.type === "code" && (
                                <div className="space-y-1.5">
                                  <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-1.5 select-none">
                                    <CodeIcon className="size-3 text-zinc-500" /> Screen Code Snippet
                                  </label>
                                  <Textarea
                                    className="font-mono text-[10px]  border  rounded-xl p-3 text-emerald-400 placeholder-zinc-700 min-h-[72px] resize-none focus-visible:ring-1 focus-visible:ring-emerald-600 focus-visible:border-emerald-600"
                                    value={scene.code}
                                    onChange={(e) => {
                                      const newScenes = [...timeline.scenes];
                                      newScenes[idx].code = e.target.value;
                                      setTimeline({ ...timeline, scenes: newScenes });
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Render Trigger */}
                      <div className="pt-6 border-t ">
                        <Button
                          size="lg"
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-10 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/20"
                          onClick={finalizeVideo}
                          disabled={loading}
                        >
                          {loading ? (
                            <>
                              <Loader2 className="animate-spin size-4" />
                              Compiling overlay nodes and rendering...
                            </>
                          ) : (
                            <>
                              <Video className="size-4" />
                              Render Final Video Clip (MP4)
                            </>
                          )}
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 2: RENDER COMPLETE VIEWER */}
                  {step === 2 && (
                    <div className="space-y-5 py-6">
                      <div className="text-center max-w-md mx-auto mb-6 select-none">
                        <div className="size-12 rounded-2xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                          <CheckCircle2 className="size-6 text-emerald-500" />
                        </div>
                        <h3 className="text-sm font-semibold text-white tracking-tight mb-2">Short Rendered!</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Your visual short is fully generated. Review the vertical preview on the right and download your MP4.
                        </p>
                      </div>

                      <div className="flex flex-col gap-3 p-4  border  rounded-2xl">
                        <Button
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 rounded-xl flex items-center justify-center gap-1.5"
                          onClick={() => window.location.href = apiUrl(videoUrl)}
                        >
                          <DownloadIcon className="size-4" />
                          Download MP4
                        </Button>
                        <Button
                          variant="ghost"
                          className="w-full border  hover:bg-zinc-900 text-zinc-300 font-bold text-xs h-9 rounded-xl flex items-center justify-center gap-1.5"
                          onClick={() => {
                            setStep(0)
                            setTopic("")
                            setTimeline(null)
                          }}
                        >
                          <RefreshCwIcon className="size-3.5" />
                          Create Another Video
                        </Button>
                      </div>
                    </div>
                  )}

                </div>
              </ScrollArea>
            </div>
          )}

          {/* B. LIBRARY VIEW TAB */}
          {activeTab === "library" && (
            <div className="flex-1 overflow-hidden min-h-0 p-6 flex flex-col">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75 mb-4 shrink-0">
                Videos Library ({history.length})
              </h3>

              <ScrollArea className="flex-1">
                <div className="space-y-2 pr-2">
                  {history.map((vid) => {
                    const isActive = previewVideoUrl === vid.video_url
                    return (
                      <button
                        key={vid.id}
                        onClick={() => {
                          setPreviewVideoUrl(vid.video_url)
                          setPreviewTitle(vid.title)
                        }}
                        className={cn(
                          "w-full rounded-xl border p-4 text-left transition duration-150 flex items-start justify-between gap-4 group",
                        )}
                      >
                        <div className="min-w-0 flex-1 leading-normal">
                          <p className="font-semibold text-xs text-white truncate group-hover:text-emerald-400 transition flex items-center gap-1.5">
                            <Video className="size-3.5 text-zinc-400 shrink-0 group-hover:text-emerald-400" />
                            {vid.title}
                          </p>
                          <p className="text-[10px] text-muted-foreground/60 mt-1 font-medium">
                            Created {new Date(vid.created_at).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 select-none">
                          <span className="text-[9px] font-bold text-muted-foreground px-2 py-0.5 rounded-lg group-hover:border-zinc-700 transition">
                            MP4
                          </span>
                        </div>
                      </button>
                    )
                  })}

                  {history.length === 0 && (
                    <div className="py-24 text-center select-none">
                      <SmartphoneIcon className="size-8 text-zinc-600 mx-auto mb-4 opacity-50 animate-pulse" />
                      <p className="text-xs font-semibold text-white">No videos generated yet</p>
                      <p className="text-[10px] text-muted-foreground mt-1 max-w-[220px] mx-auto leading-relaxed">
                        Start drafting video ideas in the &ldquo;Create&rdquo; tab to seed your project video library!
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

        </div>
      </div>

      {/* ============================================================== */}
      {/* COLUMN 2: RIGHT WORKSPACE PANEL (Mobile Preview Phone / Storyboards) */}
      {/* ============================================================== */}
      <div className="w-[360px] flex flex-col  h-full shrink-0 select-none">
        {/* Top Header tab with underline */}
        <header className="h-14 border-b  flex shrink-0">
          <div className="w-full flex">
            <div className="flex-1 text-[11px] font-bold tracking-wide uppercase flex items-center justify-center gap-1.5 border-b-2 border-emerald-500 text-white bg-zinc-900/10 h-full">
              <SmartphoneIcon className="size-3.5" />
              Preview Player
            </div>
          </div>
        </header>

        {/* Dynamic Preview Viewport */}
        <div className="flex-1 p-5 overflow-hidden flex flex-col justify-center min-h-0">

          {/* STATE A: Video rendering preview (Step 2 or Library selection exists) */}
          {previewVideoUrl ? (
            <div className="space-y-4 w-full h-full flex flex-col justify-center">
              {/* CSS Simulated Phone Bezel Bezel frame */}
              <div className="aspect-[9/16] w-full max-w-[215px] mx-auto rounded-3xl border-[6px] bg-black relative overflow-hidden shadow-2xl shrink-0 flex items-center justify-center">
                {/* Simulated Notch */}
                <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-14 h-2.5 bg-zinc-800 rounded-full z-20" />

                {/* Active Player */}
                <video
                  src={apiUrl(previewVideoUrl)}
                  controls
                  loop
                  playsInline
                  className="w-full h-full object-cover relative z-10"
                />
              </div>

              {/* Download Details Bar */}
              <div className="text-center max-w-[240px] mx-auto shrink-0 select-none">
                <p className="text-[11px] font-semibold text-zinc-200 truncate">
                  {previewTitle || "Project Short"}
                </p>
                <p className="text-[9px] text-muted-foreground mt-0.5 font-medium">
                  Aspect Ratio 9:16 · vertical MP4 format
                </p>
                <div className="mt-3">
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold h-7 px-3.5 rounded-lg flex items-center justify-center gap-1 mx-auto"
                    onClick={() => window.location.href = apiUrl(previewVideoUrl)}
                  >
                    <DownloadIcon className="size-3" />
                    Download Short
                  </Button>
                </div>
              </div>
            </div>
          ) : (

            // STATE B: Planning / Outline Visual Storyboard Preview
            <div className="h-full flex flex-col justify-center select-none text-center p-6">

              {/* Stepper Outlines Storyboard */}
              {step === 1 && timeline ? (
                <div className="space-y-5 text-left h-full flex flex-col min-h-0">
                  <div className="shrink-0 flex items-center gap-1.5 mb-1">
                    <LayersIcon className="size-4 text-emerald-400" />
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Storyboard Outlines
                    </h4>
                  </div>

                  <ScrollArea className="flex-1 pr-2">
                    <div className="space-y-2.5">
                      {timeline.scenes.map((scene: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl border  /40 leading-normal flex items-start gap-2.5"
                        >
                          <div className={cn(
                            "size-6 rounded-md font-bold text-[9px] flex items-center justify-center border shrink-0",
                            scene.type === "code" ? "bg-emerald-950/20 text-emerald-400 border-emerald-800/40" : "bg-blue-950/20 text-blue-400 border-blue-800/40"
                          )}>
                            S{idx + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[9px] font-bold text-white uppercase tracking-wider">
                              {scene.type === "code" ? "Code Overlay Visual" : "Talk Narrative layout"}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                              {scene.content}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              ) : (

                // Fallback storyboard instructions
                <div className="space-y-4 max-w-[200px] mx-auto py-12">
                  <SmartphoneIcon className="size-10 text-zinc-700 mx-auto mb-1 animate-pulse" />
                  <h4 className="text-xs font-semibold text-zinc-300 tracking-tight">Active Viewport</h4>
                  <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">
                    Input a video topic idea and generate script timelines to seed preview overlays.
                  </p>
                </div>
              )}

            </div>
          )}

        </div>
      </div>

    </div>
  )
}
