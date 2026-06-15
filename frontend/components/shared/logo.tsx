import Link from "next/link"
import { cn } from "@/lib/utils"

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "group inline-flex items-center gap-1.5 font-sans no-underline",
        className
      )}
    >
      <span className="bg-linear-to-r from-foreground to-primary bg-clip-text text-xl font-bold leading-none tracking-tight text-transparent transition-all duration-300 group-hover:to-emerald-400">
        artha
      </span>
      <span className="inline-block h-0.5 w-0 rounded-full bg-primary transition-all duration-300 group-hover:w-4" />
    </Link>
  )
}
