import { ReactNode } from "react"
export function formatBytes(bytes: number, decimals = 1) {
  if (!bytes) return "0 KB"
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
}

export function formatRelativeDate(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInHours = diffInMs / (1000 * 60 * 60)

  if (diffInHours < 24) {
    if (diffInHours < 1) {
      const mins = Math.floor(diffInMs / (1000 * 60))
      return `${mins}m ago`
    }
    return `${Math.floor(diffInHours)}h ago`
  }
  if (diffInHours < 48) return "Yesterday"
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date)
}

export function getDocumentTypeMeta(filename: string, fileSize: number) {
  const ext = filename.split(".").pop()?.toLowerCase() || ""
  if (ext === "pdf") {
    return {
      label: "PDF",
      bgClass: "bg-status-danger/10 text-status-danger border border-status-danger/40",
      iconColor: "text-status-danger",
      typeLabel: "PDF",
      pagesLabel: `${Math.max(1, Math.ceil(fileSize / 48000))} pages`,
      chunks: Math.max(12, Math.ceil(fileSize / 16000)),
    }
  }
  if (["xlsx", "xls", "csv"].includes(ext)) {
    return {
      label: "XLS",
      bgClass: "bg-status-success/10 text-status-success border border-status-success/40",
      iconColor: "text-status-success",
      typeLabel: "sheets",
      pagesLabel: `${Math.max(1, Math.ceil(fileSize / 64000))} sheets`,
      chunks: Math.max(6, Math.ceil(fileSize / 12000)),
    }
  }
  if (["pptx", "ppt"].includes(ext)) {
    return {
      label: "PPT",
      bgClass: "bg-status-info/10 text-status-info border border-status-info/40",
      iconColor: "text-status-info",
      typeLabel: "slides",
      pagesLabel: `${Math.max(4, Math.ceil(fileSize / 120000))} slides`,
      chunks: Math.max(15, Math.ceil(fileSize / 24000)),
    }
  }
  return {
    label: "TXT",
    bgClass: "bg-muted/80 text-muted-foreground border border-border/50",
    iconColor: "text-muted-foreground",
    typeLabel: "lines",
    pagesLabel: `${Math.max(1, Math.ceil(fileSize / 8000))} lines`,
    chunks: Math.max(2, Math.ceil(fileSize / 4000)),
  }
}

export function renderMessageContent(content: string, documents: Array<{ id: string; filename: string }>, onSourceClick: (messageId: string) => void, messageId?: string) {
  if (!content) return []

  return content.split("\n").map((line, lineIdx) => {
    let elements: ReactNode[] = [line]

    documents.forEach((doc) => {
      const name = doc.filename
      const parts: ReactNode[] = []

      elements.forEach((el) => {
        if (typeof el !== "string") {
          parts.push(el)
          return
        }

        const regex = new RegExp(`(${name.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")}(?:\\s+p\\.\\d+)?)`, "g")
        const subparts = el.split(regex)
        subparts.forEach((sub, subIdx) => {
          if (regex.test(sub)) {
            parts.push(
              <span
                key={`${doc.id}-${lineIdx}-${subIdx}`}
                className="bg-status-info/15 hover:bg-status-info/30 text-status-info border border-status-info/20 px-2 py-0.5 text-[11px] font-semibold inline-flex items-center gap-1 rounded mx-0.5 cursor-pointer"
                onClick={() => { if (messageId) onSourceClick(messageId) }}
              >
                {sub}
              </span>
            )
          } else {
            parts.push(sub)
          }
        })
      })
      elements = parts
    })

    const finalElements: ReactNode[] = []
    elements.forEach(el => {
      if (typeof el !== "string") {
        finalElements.push(el)
        return
      }
      const citRegex = /(\[\d+\])/g
      const citParts = el.split(citRegex)
      citParts.forEach((part, partIdx) => {
        if (citRegex.test(part)) {
          finalElements.push(
            <sup
              key={`cit-${lineIdx}-${partIdx}`}
              className="cursor-pointer text-emerald-400 hover:text-emerald-300 mx-0.5 font-bold"
              onClick={() => { if (messageId) onSourceClick(messageId) }}
            >
              {part}
            </sup>
          )
        } else {
          finalElements.push(part)
        }
      })
    })

    return (
      <p key={lineIdx} className={`mb-2.5 last:mb-0 leading-relaxed font-sans text-[13.5px] ${line === "" ? "h-2" : ""}`}>
        {finalElements}
      </p>
    )
  })
}
