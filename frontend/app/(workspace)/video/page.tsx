"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/toast"

export default function VideoPage() {
  const router = useRouter()

  React.useEffect(() => {
    toast.info("Video generation is not available in this release. Redirecting to chat...")
    const timer = setTimeout(() => router.replace("/chat"), 2000)
    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
      Video generation is not available. Redirecting to chat...
    </div>
  )
}
