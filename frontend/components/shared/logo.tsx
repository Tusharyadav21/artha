import Link from "next/link"
import { cn } from "@/lib/utils"

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 font-semibold", className)}>
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
        AR
      </div>
      <span className="hidden sm:inline">Agentic RAG</span>
    </Link>
  )
}
