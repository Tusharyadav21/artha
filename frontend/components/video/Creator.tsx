"use client"

import * as React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Music, Video, Type, Palette, ArrowRight, CheckCircle2 } from "lucide-react"
import { apiFetch, apiUrl } from "@/lib/api"
import { TOKEN_KEY } from "@/lib/app-storage"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { History, PlusCircle } from "lucide-react"

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
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold tracking-tight">YouTube Shorts Creator</h2>
          <TabsList>
            <TabsTrigger value="create" className="flex items-center gap-2">
              <PlusCircle className="w-4 h-4" /> Create
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" /> History
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="create">
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-between mb-8">
              {[0, 1, 2].map((s) => (
                <div key={s} className={`h-1 flex-1 mx-1 rounded-full ${s <= step ? 'bg-primary' : 'bg-muted'}`} />
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
              <Card className="max-w-4xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PlusCircle className="w-5 h-5 text-primary" />
                    Review Timeline: {timeline.title}
                  </CardTitle>
                  <CardDescription>AI has generated a {timeline.duration}s timeline. You can edit each scene below.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {timeline.scenes.map((scene: any, idx: number) => (
                    <div key={idx} className="p-4 border rounded-lg space-y-4 bg-muted/30">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold px-2 py-1 bg-primary/10 rounded uppercase">{scene.type} Scene</span>
                        <span className="text-xs text-muted-foreground">{scene.start}s - {scene.end}s</span>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-xs font-medium opacity-70">Narration</label>
                        <Textarea 
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
                          <label className="text-xs font-medium opacity-70">Code Snippet</label>
                          <Textarea 
                            className="font-mono text-xs"
                            value={scene.code}
                            onChange={(e) => {
                              const newScenes = [...timeline.scenes];
                              newScenes[idx].code = e.target.value;
                              setTimeline({...timeline, scenes: newScenes});
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                  
                  <Button className="w-full" onClick={finalizeVideo} disabled={loading}>
                    {loading ? <Loader2 className="animate-spin" /> : <><Video className="mr-2 h-4 w-4" /> Render Final Video</>}
                  </Button>
                </CardContent>
              </Card>
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
                  <div className="aspect-[9/16] bg-black rounded-lg overflow-hidden">
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
            <div className="text-center py-20 bg-muted/20 rounded-xl border-2 border-dashed">
              <Video className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-muted-foreground">No videos generated yet. Start creating!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {history.map((vid) => (
                <Card key={vid.id} className="overflow-hidden flex flex-col">
                  <div className="aspect-[9/16] bg-black">
                    <video 
                      src={apiUrl(vid.video_url)} 
                      controls 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <CardHeader className="p-4">
                    <CardTitle className="text-base line-clamp-1">{vid.title}</CardTitle>
                    <CardDescription>{new Date(vid.created_at).toLocaleDateString()}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 mt-auto">
                    <Button variant="outline" className="w-full text-xs" onClick={() => window.location.href = apiUrl(vid.video_url)}>
                      Download MP4
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
