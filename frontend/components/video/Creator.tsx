"use client"

import * as React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Music, Video, Type, Palette, ArrowRight, CheckCircle2, History, PlusCircle, LayoutIcon, CodeIcon, ClockIcon } from "lucide-react"
import { apiFetch, apiUrl } from "@/lib/api"
import { TOKEN_KEY } from "@/lib/app-storage"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { fadeUp, fadeIn, stagger } from "@/lib/motion"

interface HistoryItem {
  id: string
  title: string
  video_url: string
  created_at: string
}

export function VideoCreator() {
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  
  // State for content
  const [topic, setTopic] = useState("")
  const [timeline, setTimeline] = useState<any>(null)
  
  // Final video
  const [videoUrl, setVideoUrl] = useState("")
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [activeTab, setActiveTab] = useState("create")

  const getAuthToken = () => {
    if (typeof window === "undefined") return null
    return window.localStorage.getItem(TOKEN_KEY)
  }

  const fetchHistory = async () => {
    try {
      const data = await apiFetch<any>("/api/video/history", getAuthToken())
      setHistory(data.videos)
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
      setStep(2) // Move to final step
      fetchHistory() // Refresh history
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Shorts Creator</h2>
            <p className="text-sm text-muted-foreground mt-1">Generate viral YouTube Shorts from any topic.</p>
          </div>
          <TabsList variant="line" className="bg-muted/30">
            <TabsTrigger value="create" className="flex items-center gap-2">
              <PlusCircle className="w-4 h-4" /> Create
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" /> Library
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="create">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-center gap-4 mb-12 relative">
              {[
                { step: 0, label: "Topic" },
                { step: 1, label: "Timeline" },
                { step: 2, label: "Render" },
              ].map((s, idx) => (
                <React.Fragment key={s.step}>
                  <div className="flex flex-col items-center gap-2 relative z-10">
                    <div className={cn(
                      "size-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300",
                      step === s.step ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-110" : 
                      step > s.step ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/50 text-muted-foreground"
                    )}>
                      {step > s.step ? <CheckCircle2 className="size-5" /> : s.step + 1}
                    </div>
                    <span className={cn(
                      "text-[10px] uppercase tracking-widest font-bold",
                      step >= s.step ? "text-primary" : "text-muted-foreground"
                    )}>{s.label}</span>
                  </div>
                  {idx < 2 && (
                    <div className={cn(
                      "h-[2px] flex-1 min-w-[40px] -mt-5 transition-colors duration-500",
                      step > idx ? "bg-primary" : "bg-border"
                    )} />
                  )}
                </React.Fragment>
              ))}
            </div>

            {step === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>What's the topic?</CardTitle>
                  <CardDescription>Enter a topic and AI will plan your Short's timeline.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input 
                    placeholder="e.g. Python Decorators, Asyncio in 60s..." 
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                  <Button className="w-full" onClick={generateTimeline} disabled={loading || !topic}>
                    {loading ? <Loader2 className="animate-spin" /> : "Generate Video Plan"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {step === 1 && timeline && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold">{timeline.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">Estimated duration: <span className="text-primary font-medium">{timeline.duration}s</span></p>
                  </div>
                  <Badge variant="outline" className="px-3 py-1">
                    {timeline.scenes.length} Scenes
                  </Badge>
                </div>

                <div className="grid gap-4">
                  {timeline.scenes.map((scene: any, idx: number) => (
                    <Card key={idx} className="overflow-hidden border-border/50 bg-card/50 hover:border-primary/30 transition-colors">
                      <div className="px-4 py-3 border-b border-border/50 bg-muted/20 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className="capitalize h-5 px-1.5 text-[10px]">
                            {scene.type === "code" ? <CodeIcon className="size-3 mr-1" /> : <LayoutIcon className="size-3 mr-1" />}
                            {scene.type}
                          </Badge>
                          <span className="text-xs font-bold text-muted-foreground uppercase tracking-tighter">Scene {idx + 1}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground bg-background/50 px-2 py-0.5 rounded border">
                          <ClockIcon className="size-3" />
                          {scene.start}s - {scene.end}s
                        </div>
                      </div>
                      <CardContent className="p-4 space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Type className="size-3" /> Narration
                          </label>
                          <Textarea 
                            className="text-sm min-h-[80px] bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/30"
                            value={scene.content}
                            onChange={(e) => {
                              const newScenes = [...timeline.scenes];
                              newScenes[idx].content = e.target.value;
                              setTimeline({...timeline, scenes: newScenes});
                            }}
                          />
                        </div>

                        {scene.type === "code" && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                              <CodeIcon className="size-3" /> Code Snippet
                            </label>
                            <Textarea 
                              className="font-mono text-xs bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary/30"
                              value={scene.code}
                              onChange={(e) => {
                                const newScenes = [...timeline.scenes];
                                newScenes[idx].code = e.target.value;
                                setTimeline({...timeline, scenes: newScenes});
                              }}
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                <div className="pt-6 border-t border-border/50">
                  <Button size="lg" className="w-full shadow-lg shadow-primary/20" onClick={finalizeVideo} disabled={loading}>
                    {loading ? <Loader2 className="animate-spin" /> : <><Video className="mr-2 h-5 w-5" /> Render Final Video</>}
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    Short Generated!
                  </CardTitle>
                  <CardDescription>Your YouTube Short is ready to download.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-center">
                  <div className="aspect-9/16 bg-black rounded-lg overflow-hidden">
                    <video
                      src={apiUrl(videoUrl)}
                      controls
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <Button className="w-full" onClick={() => window.location.href = apiUrl(videoUrl)}>
                    Download MP4
                  </Button>
                  <Button variant="ghost" onClick={() => setStep(0)}>Create Another</Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="history">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 bg-muted/20 rounded-3xl border-2 border-dashed border-border/50">
              <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-6">
                <Video className="w-8 h-8 opacity-40 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">No videos yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs text-center">Start creating your first AI Short to see it in your library.</p>
              <Button variant="outline" className="mt-6" onClick={() => setActiveTab("create")}>Get Started</Button>
            </div>
          ) : (
            <motion.div 
              variants={stagger}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {history.map((vid) => (
                <motion.div variants={fadeUp} key={vid.id}>
                  <Card className="overflow-hidden group/video border-border/50 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1">
                    <div className="aspect-9/16 bg-black relative overflow-hidden">
                      <video 
                        src={apiUrl(vid.video_url)} 
                        className="w-full h-full object-contain transition-transform duration-500 group-hover/video:scale-105"
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/video:opacity-100 transition-opacity flex items-end p-4">
                        <Button className="w-full h-9 text-xs" onClick={() => window.location.href = apiUrl(vid.video_url)}>
                          Download Short
                        </Button>
                      </div>
                    </div>
                    <div className="p-4 bg-card/50">
                      <h4 className="text-sm font-bold truncate group-hover/video:text-primary transition-colors">{vid.title}</h4>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {new Date(vid.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <Badge variant="secondary" className="h-4 px-1.5 text-[9px] uppercase tracking-tighter">MP4</Badge>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
