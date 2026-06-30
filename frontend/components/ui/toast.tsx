"use client"

import { useEffect, useState } from "react"
import { CircleAlertIcon, CircleCheckIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ToastTone = "success" | "error" | "info"

interface ToastMessage {
  id: number
  message: string
  tone: ToastTone
}

type ToastListener = (toast: ToastMessage) => void

const listeners = new Set<ToastListener>()
let nextToastId = 1

function emitToast(message: string, tone: ToastTone) {
  const toast = { id: nextToastId++, message, tone }
  for (const listener of listeners) {
    listener(toast)
  }
}

export const toast = {
  success(message: string) {
    emitToast(message, "success")
  },
  error(message: string) {
    emitToast(message, "error")
  },
  info(message: string) {
    emitToast(message, "info")
  },
}

function toneIcon(tone: ToastTone) {
  if (tone === "success") {
    return CircleCheckIcon
  }
  if (tone === "error") {
    return CircleAlertIcon
  }
  return CircleCheckIcon
}

function toneClasses(tone: ToastTone) {
  if (tone === "success") {
    return "border-primary/25 bg-primary/10 text-foreground"
  }
  if (tone === "error") {
    return "border-destructive/30 bg-destructive/10 text-foreground"
  }
  return "border-border bg-card text-foreground"
}

export function Toaster() {
  const [items, setItems] = useState<ToastMessage[]>([])

  useEffect(() => {
    function onToast(item: ToastMessage) {
      setItems((current) => [...current, item])
    }

    listeners.add(onToast)

    return () => {
      listeners.delete(onToast)
    }
  }, [])

  useEffect(() => {
    if (!items.length) {
      return
    }

    const timer = window.setTimeout(() => {
      setItems((current) => current.slice(1))
    }, 3500)

    return () => window.clearTimeout(timer)
  }, [items])

  if (!items.length) {
    return null
  }

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-full max-w-sm flex-col gap-2">
      {items.map((item) => {
        const Icon = toneIcon(item.tone)

        return (
          <div
            key={item.id}
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur",
              toneClasses(item.tone)
            )}
          >
            <Icon data-icon="inline-start" className="mt-0.5 text-current" />
            <p className="min-w-0 flex-1 text-sm leading-relaxed">
              {item.message}
            </p>
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              aria-label="Dismiss notification"
              onClick={() =>
                setItems((current) =>
                  current.filter((currentItem) => currentItem.id !== item.id)
                )
              }
            >
              <XIcon data-icon="inline-start" />
            </Button>
          </div>
        )
      })}
    </div>
  )
}
