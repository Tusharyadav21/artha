"use client"

import { useRef, useState } from "react"
import { UploadIcon, Loader2Icon, CopyIcon, CheckIcon, ImageIcon } from "lucide-react"
import { apiFetch } from "@/lib/api"
import { TOKEN_KEY } from "@/lib/app-storage"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

export function ImageToTextTab() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const getToken = () => {
    if (typeof window === "undefined") return null
    return window.localStorage.getItem(TOKEN_KEY)
  }

  const handleFile = (f: File) => {
    setFile(f)
    setResult(null)
    setPreview(URL.createObjectURL(f))
  }

  const handleExtract = async () => {
    if (!file) return
    setLoading(true)
    try {
      const form = new FormData()
      form.append("file", file)
      const data = await apiFetch<{ filename: string; text: string }>(
        "/api/extract/image",
        getToken(),
        { method: "POST", body: form }
      )
      setResult(data.text)
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (!result) return
    navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex gap-6 h-full min-h-0">
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <div
          className="border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary/50 transition-colors min-h-[200px]"
          onClick={() => inputRef.current?.click()}
        >
          {preview ? (
            <img src={preview} alt="Preview" className="max-h-48 rounded-xl object-contain" />
          ) : (
            <ImageIcon className="size-10 text-muted-foreground/40" />
          )}
          <p className="text-xs text-muted-foreground text-center">
            {file ? file.name : "Drop an image or click to browse"}
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/tiff,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
            }}
          />
        </div>

        <Button
          onClick={handleExtract}
          disabled={!file || loading}
          className="w-full"
        >
          {loading ? (
            <><Loader2Icon className="size-4 animate-spin mr-2" /> Extracting...</>
          ) : (
            <><UploadIcon className="size-4 mr-2" /> Extract Text</>
          )}
        </Button>
      </div>

      {result && (
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Extracted Text</p>
            <Button size="icon-xs" variant="ghost" onClick={handleCopy}>
              {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
            </Button>
          </div>
          <ScrollArea className="flex-1 rounded-xl border p-4">
            <pre className="text-xs whitespace-pre-wrap font-sans leading-relaxed">{result}</pre>
          </ScrollArea>
        </div>
      )}
    </div>
  )
}
